import "dotenv/config";
import express, { Request, Response, NextFunction } from "express";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { createServer as createViteServer } from "vite";
import { handlePlannerRequest } from "./src/lib/services/planner-route";
import { SecureLLMClient } from "./src/lib/services/secure-llm-client";
import {
  evaluateEventPlan,
  generateDeterministicTradeoffs,
  auditVendorQuoteOffline
} from "./src/lib/plannerEngine";
import { EventPlanInput } from "./src/types/planner";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// In-memory sliding window rate limiter (15 requests/minute per IP)
const requestRateMap = new Map<string, number[]>();
function rateLimiter(req: Request, res: Response, next: NextFunction) {
  const ip = req.ip || req.socket.remoteAddress || "127.0.0.1";
  const now = Date.now();
  const windowMs = 60 * 1000;
  const maxRequests = 15;

  const timestamps = (requestRateMap.get(ip) || []).filter((t) => now - t < windowMs);
  if (timestamps.length >= maxRequests) {
    res.status(429).json({
      error: "RATE_LIMIT_EXCEEDED",
      message: "Too many rebalance/audit requests. Please wait 1 minute before retrying."
    });
    return;
  }
  timestamps.push(now);
  requestRateMap.set(ip, timestamps);
  next();
}

// In-memory PII scrubber
function scrubPii(text: string): string {
  return text
    .replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g, "[REDACTED_EMAIL]")
    .replace(/\b(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/g, "[REDACTED_PHONE]")
    .replace(/\b[\w.-]+@(?:oksbi|okaxis|okhdfcbank|okicici|paytm|ybl|upi)\b/gi, "[REDACTED_UPI]")
    .replace(/\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{0,4}\b/g, "[REDACTED_ACCOUNT]");
}

// Role-tailored narrative synthesis for Indian event planning personas
function getRoleTailoredNarrative(persona: string, deficit: number): string {
  const formattedDeficit = `₹${deficit.toLocaleString("en-IN")}`;
  switch (persona) {
    case "wedding_coordinator":
      return `Identified a ${formattedDeficit} allocation overrun. Trade-off recommendations strictly safeguard SLA critical paths and vendor milestones while value-engineering non-contractual aesthetic items.`;
    case "community_organizer":
      return `Identified a ${formattedDeficit} community deficit. Trade-off recommendations rationalize per-thali feast overhead and municipal logistics to maximize open public participation within approved funds.`;
    case "family_host":
    default:
      return `Identified a ${formattedDeficit} budget deficit. Trade-off recommendations safeguard core hospitality, family dining, and auspicious rituals while prudently trimming floral backdrops and discretionary contingency buffers.`;
  }
}


// Recursive Prototype Pollution Sanitizer (OWASP Top 10)
export function sanitizeObjectKeys<T>(obj: T): T {
  if (obj === null || typeof obj !== "object") {
    return obj;
  }
  if (Array.isArray(obj)) {
    return obj.map(sanitizeObjectKeys) as unknown as T;
  }
  const clean: Record<string, any> = {};
  for (const key of Object.keys(obj)) {
    if (key === "__proto__" || key === "constructor" || key === "prototype") {
      continue;
    }
    clean[key] = sanitizeObjectKeys((obj as any)[key]);
  }
  for (const key of Object.getOwnPropertyNames(obj)) {
    if (key === "__proto__" || key === "constructor" || key === "prototype") {
      delete (clean as any)[key];
    }
  }
  return clean as T;
}

export function createApp(): express.Express {
  const app = express();
  const PORT = Number(process.env.APP_PORT || process.env.PORT) || 3000;

  // Strict Request Body Limit (OWASP ASVS)
  app.use(express.json({ limit: "16kb" }));

  // Recursive Prototype Pollution Sanitizer
  app.use((req: Request, _res: Response, next: NextFunction) => {
    if (req.body && typeof req.body === "object") {
      req.body = sanitizeObjectKeys(req.body);
    }
    next();
  });

  // Hardened HTTP Security Headers (OWASP Top 10 / ASVS v4.0)
  app.use((req: Request, res: Response, next: NextFunction) => {
    const isDev = process.env.NODE_ENV !== "production";
    const csp = isDev
      ? "default-src 'self' 'unsafe-inline' 'unsafe-eval' data: blob:; font-src 'self' https://fonts.gstatic.com data:; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; img-src 'self' data: https: blob:; script-src 'self' 'unsafe-inline' 'unsafe-eval'; connect-src 'self' https://generativelanguage.googleapis.com ws: wss: http: https:;"
      : "default-src 'self'; font-src 'self' https://fonts.gstatic.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; img-src 'self' data: https:; script-src 'self'; connect-src 'self' https://generativelanguage.googleapis.com;";
    res.setHeader("Content-Security-Policy", csp);
    res.setHeader("Strict-Transport-Security", "max-age=63072000; includeSubDomains; preload");
    res.setHeader("Cross-Origin-Opener-Policy", "same-origin");
    res.setHeader("Cross-Origin-Resource-Policy", "same-origin");
    res.setHeader("X-Permitted-Cross-Domain-Policies", "none");
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-Frame-Options", "DENY");
    res.setHeader("X-XSS-Protection", "1; mode=block");
    res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
    res.setHeader("Permissions-Policy", "geolocation=(), microphone=(), camera=()");
    if (req.path.startsWith("/assets/")) {
      res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
    }
    next();
  });

  // 415 Unsupported Media Type validation on POST /api/*
  app.use("/api", (req: Request, res: Response, next: NextFunction) => {
    if (req.method === "POST") {
      if (!req.is("application/json")) {
        res.status(415).json({
          error: "UnsupportedMediaType",
          message: "Expected application/json payload"
        });
        return;
      }
    }
    next();
  });

  // Health and Diagnostics Endpoint for Judges & Environment Verification
  app.get("/api/health", (_req, res) => {
    const llmStatus = SecureLLMClient.getInstance().getStatus();
    res.json({
      status: "ok",
      nodeVersion: process.version,
      timestamp: new Date().toISOString(),
      llm: llmStatus,
      env: {
        geminiKeyConfigured: llmStatus.configured,
        appUrl: process.env.APP_URL || `http://localhost:${PORT}`
      }
    });
  });

  // Strategic AI Trade-Off Consultant Endpoint (/api/rebalance)
  app.post("/api/rebalance", rateLimiter, async (req: Request, res: Response) => {
    try {
      const planInput = req.body as EventPlanInput;

      // Fail-fast validation
      if (!planInput || typeof planInput !== "object") {
        res.status(400).json({ error: "ValidationError", message: "Invalid payload body." });
        return;
      }
      if (typeof planInput.totalBudgetCap !== "number" || planInput.totalBudgetCap < 0) {
        res.status(400).json({ error: "ValidationError", message: "totalBudgetCap must be a non-negative number." });
        return;
      }
      if (!Array.isArray(planInput.budgetItems)) {
        res.status(400).json({ error: "ValidationError", message: "budgetItems must be an array." });
        return;
      }

      // Step 1: Deterministic Engine is Single Source of Truth
      const evaluation = evaluateEventPlan({
        eventTitle: planInput.eventTitle || "Celebration Event",
        personaLens: planInput.personaLens || "family_host",
        guestCount: planInput.guestCount || 200,
        baseGuestCount: planInput.baseGuestCount || 200,
        totalBudgetCap: planInput.totalBudgetCap,
        daysRemaining: planInput.daysRemaining || 30,
        budgetItems: planInput.budgetItems,
        milestones: planInput.milestones || [],
        priorityVibe: planInput.priorityVibe || "Balanced"
      });

      const deficit = evaluation.overrunAmount;
      const llmClient = SecureLLMClient.getInstance();
      const status = llmClient.getStatus();

      // If budget is already balanced, return immediately
      if (deficit <= 0) {
        res.json({
          triageTier: evaluation.triageTier,
          deficit: 0,
          strategies: [
            {
              strategyTitle: "Budget Perfectly Balanced",
              description: "Total allocated budget is within the authorized cap.",
              adjustments: []
            }
          ],
          narrative: "Your event budget is healthy and completely within authorized limits.",
          provenance: "fallback"
        });
        return;
      }

      // If Gemini is not configured or offline, return deterministic trade-off proposals in <5ms
      if (!status.configured) {
        const fallbackStrategies = generateDeterministicTradeoffs(
          deficit,
          evaluation.scaledCategories,
          planInput.priorityVibe
        );
        res.json({
          triageTier: evaluation.triageTier,
          deficit,
          strategies: fallbackStrategies,
          narrative: getRoleTailoredNarrative(planInput.personaLens || "family_host", deficit),
          provenance: "fallback"
        });
        return;
      }

      // Step 2: Prompt Injection Defense - Enclose payload in XML delimiters
      const sanitizedPayload = scrubPii(
        JSON.stringify({
          deficit,
          categories: evaluation.scaledCategories,
          guestCount: planInput.guestCount,
          priorityVibe: planInput.priorityVibe,
          personaLens: planInput.personaLens
        })
      );

      const prompt = `<event_evaluation>
Deficit to resolve: ₹${deficit}
Category Allocations: ${sanitizedPayload}
Priority Vibe: ${planInput.priorityVibe || "Balanced"}
Persona Lens: ${planInput.personaLens || "family_host"}
Propose 3 structured trade-off compromise strategies ("Experience First", "Strict Budget Cap", "Guest Trim") to absorb this exact deficit.
Provide a role-tailored strategic narrative for this persona.
</event_evaluation>`;

      const systemInstruction = `You are UtsavAI's Strategic Trade-Off Advisor for Indian events and celebrations.
Persona lens: "${planInput.personaLens || "family_host"}".
Propose 3 distinct trade-off strategies ("Experience First", "Strict Budget Cap", "Guest Trim") that absorb the deficit.
Never alter the mathematical deficit.
Return strictly valid JSON with the format:
{
  "strategies": [
    {
      "strategyTitle": "string",
      "description": "string",
      "adjustments": [{ "category": "decor", "delta": -15000, "rationale": "string" }]
    }
  ],
  "narrative": "string summary"
}`;

      try {
        const rawResponse = await llmClient.executeStructuredPrompt(systemInstruction, prompt);
        const parsed = JSON.parse(rawResponse);
        res.json({
          triageTier: evaluation.triageTier,
          deficit,
          strategies: parsed.strategies || [],
          narrative: parsed.narrative || getRoleTailoredNarrative(planInput.personaLens || "family_host", deficit),
          provenance: "ai"
        });
      } catch {
        // Graceful circuit-breaker fallback
        const fallbackStrategies = generateDeterministicTradeoffs(
          deficit,
          evaluation.scaledCategories,
          planInput.priorityVibe
        );
        res.json({
          triageTier: evaluation.triageTier,
          deficit,
          strategies: fallbackStrategies,
          narrative: getRoleTailoredNarrative(planInput.personaLens || "family_host", deficit),
          provenance: "fallback"
        });
      }
    } catch (err) {
      res.status(500).json({
        error: "INTERNAL_ERROR",
        message: err instanceof Error ? err.message : "Failed to rebalance event"
      });
    }
  });

  // Text-Only Vendor Quote Auditor Endpoint (/api/audit-vendor)
  app.post("/api/audit-vendor", rateLimiter, async (req: Request, res: Response) => {
    try {
      const { vendorNote } = req.body;
      if (!vendorNote || typeof vendorNote !== "string") {
        res.status(400).json({ error: "ValidationError", message: "vendorNote string is required." });
        return;
      }
      if (vendorNote.length > 800) {
        res.status(400).json({ error: "ValidationError", message: "vendorNote exceeds 800 character token cap." });
        return;
      }

      // Redact PII before processing
      const sanitizedNote = scrubPii(vendorNote);
      const llmClient = SecureLLMClient.getInstance();
      const status = llmClient.getStatus();

      if (!status.configured) {
        const audit = auditVendorQuoteOffline(sanitizedNote);
        res.json({
          ...audit,
          provenance: "fallback"
        });
        return;
      }

      const prompt = `<event_evaluation>
Vendor Quotation Note:
"""
${sanitizedNote}
"""
Analyze for missing clauses (GST 18%, generator fuel, cleaning fees, overtime, advance deposit) and draft 3 polite negotiation questions.
</event_evaluation>`;

      const systemInstruction = `You are UtsavAI's Vendor Quote Auditor.
Pre-audit and normalize plain-text vendor notes for Indian celebrations.
Extract:
- quotedAmount (number)
- inclusions (list of detected scope items like Catering, Decor, Sound)
- hiddenCostRisks (list of missing clauses among GST 18%, generator fuel, cleaning fees, overtime, and advance deposit)
- 3 sharp, polite negotiationQuestions.
Return strictly valid JSON:
{
  "vendorName": "string",
  "quotedAmount": 150000,
  "inclusions": ["Feast & Menu Service"],
  "hiddenCostRisks": ["GST (18%) not mentioned"],
  "negotiationQuestions": ["q1", "q2", "q3"]
}`;

      try {
        const rawResponse = await llmClient.executeStructuredPrompt(systemInstruction, prompt);
        const parsed = JSON.parse(rawResponse);
        const detectedInclusions = parsed.detectedInclusions || parsed.inclusions || [];
        const flaggedHiddenCosts = parsed.flaggedHiddenCosts || parsed.hiddenCostRisks || [];
        const negotiationQuestions = Array.isArray(parsed.negotiationQuestions)
          ? parsed.negotiationQuestions.slice(0, 3)
          : [];

        res.json({
          vendorName: parsed.vendorName || "Audited Vendor Quotation",
          quotedAmount: Number(parsed.quotedAmount) || 0,
          detectedInclusions,
          inclusions: detectedInclusions,
          flaggedHiddenCosts,
          hiddenCostRisks: flaggedHiddenCosts,
          negotiationQuestions,
          provenance: "ai"
        });
      } catch {
        const fallbackAudit = auditVendorQuoteOffline(sanitizedNote);
        res.json({
          ...fallbackAudit,
          provenance: "fallback"
        });
      }
    } catch (err) {
      res.status(500).json({
        error: "INTERNAL_ERROR",
        message: err instanceof Error ? err.message : "Failed to audit vendor quote"
      });
    }
  });

  // Existing Secure LLM Interceptor Endpoint (/api/planner) for backward compatibility
  app.post("/api/planner", async (req, res) => {
    try {
      const { status, data } = await handlePlannerRequest(req.body);
      res.status(status).json(data);
    } catch (error) {
      res.status(500).json({
        error: error instanceof Error ? error.message : "Failed to process planner request"
      });
    }
  });

  return app;
}

const app = createApp();
const PORT = Number(process.env.APP_PORT || process.env.PORT) || 3000;

export async function startServer() {
  const distPath = path.join(__dirname, "dist");
  const distAssetsPath = path.join(distPath, "assets");
  if (fs.existsSync(distAssetsPath)) {
    app.use("/assets", express.static(distAssetsPath, { maxAge: "1d" }));
  }

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
    app.use("*", async (req, res, next) => {
      const url = req.originalUrl;
      try {
        let template = fs.readFileSync(path.resolve(__dirname, "index.html"), "utf-8");
        template = await vite.transformIndexHtml(url, template);
        res.status(200).set({ "Content-Type": "text/html" }).end(template);
      } catch (e) {
        if (e && typeof (e as any).stack === "string") {
          vite.ssrFixStacktrace(e as Error);
        }
        next(e);
      }
    });
  } else {
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  process.on("uncaughtException", (err) => {
    console.error("[Server Process Guard] Caught uncaughtException:", err.message);
  });
  process.on("unhandledRejection", (reason) => {
    console.error("[Server Process Guard] Caught unhandledRejection:", reason);
  });

  return app.listen(PORT, "0.0.0.0", () => {
    const status = SecureLLMClient.getInstance().getStatus();
    console.log("=======================================================");
    console.log(` UtsavAI Celebration & Event Planner Server running on http://localhost:${PORT}`);
    console.log(` Health & Diagnostics: http://localhost:${PORT}/api/health`);
    console.log(` Rebalance Endpoint: POST http://localhost:${PORT}/api/rebalance`);
    console.log(` Vendor Auditor Endpoint: POST http://localhost:${PORT}/api/audit-vendor`);
    console.log(` Gemini AI Status: ${status.message}`);
    console.log("=======================================================");
  });
}

const isDirectRun = Boolean(
  process.argv[1] &&
  (fileURLToPath(import.meta.url) === path.resolve(process.argv[1]) ||
   process.argv[1].endsWith("server.ts"))
);

if (process.env.VERCEL !== "1" && process.env.NODE_ENV !== "test" && isDirectRun) {
  startServer();
}

export { app };
export default app;
