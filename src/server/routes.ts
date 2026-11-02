/**
 * UtsavAI Server Routes — Health, Strategic Trade-Off Advisor & Vendor Quote Auditor
 */
import { Express, Request, Response } from "express";
import { handlePlannerRequest } from "../lib/services/planner-route";
import { SecureLLMClient } from "../lib/services/secure-llm-client";
import {
  evaluateEventPlan,
  generateDeterministicTradeoffs,
  auditVendorQuoteOffline
} from "../lib/plannerEngine";
import { EventPlanInput } from "../types/planner";
import { rateLimiter, scrubPii } from "./middleware";

/**
 * Role-tailored narrative synthesis for Indian event planning personas.
 */
export function getRoleTailoredNarrative(persona: string, deficit: number): string {
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

/**
 * Registers all REST API endpoints for UtsavAI on the Express application.
 */
export function registerRoutes(app: Express, port: number): void {
  // Health and Diagnostics Endpoint for Judges & Environment Verification
  app.get(["/api/health", "/health", "/api/index/health"], (_req: Request, res: Response) => {
    const llmStatus = SecureLLMClient.getInstance().getStatus();
    res.json({
      status: "ok",
      nodeVersion: process.version,
      timestamp: new Date().toISOString(),
      llm: llmStatus,
      env: {
        geminiKeyConfigured: llmStatus.configured,
        appUrl: process.env.APP_URL || `http://localhost:${port}`
      }
    });
  });

  // Strategic AI Trade-Off Consultant Endpoint (/api/rebalance)
  app.post(["/api/rebalance", "/rebalance", "/api/index/rebalance"], rateLimiter, async (req: Request, res: Response) => {
    try {
      const planInput = req.body as EventPlanInput;

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
      } catch (llmErr: unknown) {
        console.warn("[/api/rebalance LLM failure]:", llmErr instanceof Error ? llmErr.message : String(llmErr));
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
    } catch (err: unknown) {
      res.status(500).json({
        error: "INTERNAL_ERROR",
        message: err instanceof Error ? err.message : "Failed to rebalance event"
      });
    }
  });

  // Text-Only Vendor Quote Auditor Endpoint (/api/audit-vendor)
  app.post(["/api/audit-vendor", "/audit-vendor", "/api/index/audit-vendor"], rateLimiter, async (req: Request, res: Response) => {
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

      const sanitizedNote = scrubPii(vendorNote);
      const llmClient = SecureLLMClient.getInstance();
      const status = llmClient.getStatus();

      if (!status.configured) {
        const audit = auditVendorQuoteOffline(sanitizedNote);
        res.json({ ...audit, provenance: "fallback" });
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
      } catch (llmErr: unknown) {
        console.warn("[/api/audit-vendor LLM failure]:", llmErr instanceof Error ? llmErr.message : String(llmErr));
        const fallbackAudit = auditVendorQuoteOffline(sanitizedNote);
        res.json({ ...fallbackAudit, provenance: "fallback" });
      }
    } catch (err: unknown) {
      res.status(500).json({
        error: "INTERNAL_ERROR",
        message: err instanceof Error ? err.message : "Failed to audit vendor quote"
      });
    }
  });

  // Existing Secure LLM Interceptor Endpoint (/api/planner) for backward compatibility
  app.post(["/api/planner", "/planner", "/api/index/planner"], async (req: Request, res: Response) => {
    try {
      const { status, data } = await handlePlannerRequest(req.body);
      res.status(status).json(data);
    } catch (error: unknown) {
      res.status(500).json({
        error: error instanceof Error ? error.message : "Failed to process planner request"
      });
    }
  });

  // Vercel Serverless URL Normalization:
  // When Vercel rewrites /api/(.*) to /api/index, req.originalUrl preserves the public route
  app.use((req: Request, _res: Response, next) => {
    if (req.originalUrl && req.url !== req.originalUrl) {
      req.url = req.originalUrl;
    }
    next();
  });
}
