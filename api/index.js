// server.ts
import express from "express";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

// src/lib/services/planner-route.ts
import { Type } from "@google/genai";

// src/lib/services/secure-llm-client.ts
import { GoogleGenAI } from "@google/genai";
var KNOWN_PLACEHOLDERS = /* @__PURE__ */ new Set([
  "YOUR_GEMINI_API_KEY",
  "YOUR_GEMINI_API_KEY_HERE",
  "MY_GEMINI_API_KEY",
  "YOUR_API_KEY",
  "REPLACE_WITH_KEY",
  "YOUR_KEY_HERE"
]);
var SecureLLMClient = class _SecureLLMClient {
  constructor() {
    this.ai = null;
    this.fallbackModel = "gemini-3.5-flash-lite";
    this.primaryModel = process.env.GEMINI_MODEL?.trim() || "gemini-3.5-flash";
    this.initClient();
  }
  initClient() {
    let rawKey = (process.env.GEMINI_API_KEY || "").trim();
    if (!rawKey || KNOWN_PLACEHOLDERS.has(rawKey) || rawKey.length < 10) {
      rawKey = (process.env.GOOGLE_API_KEY || "").trim();
    }
    const isPlaceholder = !rawKey || KNOWN_PLACEHOLDERS.has(rawKey) || rawKey.length < 10;
    if (!isPlaceholder) {
      process.env.GEMINI_API_KEY = rawKey;
      process.env.GOOGLE_API_KEY = rawKey;
      this.ai = new GoogleGenAI({
        apiKey: rawKey,
        httpOptions: {
          headers: {
            "User-Agent": "aistudio-build"
          }
        }
      });
    } else {
      this.ai = null;
    }
  }
  static getInstance() {
    if (!_SecureLLMClient.instance) {
      _SecureLLMClient.instance = new _SecureLLMClient();
    }
    return _SecureLLMClient.instance;
  }
  getStatus() {
    this.initClient();
    if (this.ai) {
      return {
        configured: true,
        model: this.primaryModel,
        provider: "Google Gemini (@google/genai)",
        source: "gemini-live",
        message: `Live Gemini 3.5 inference active (Primary: ${this.primaryModel})`
      };
    }
    return {
      configured: false,
      model: "none",
      provider: "Deterministic Shield Fallback",
      source: "deterministic-shield",
      message: "GEMINI_API_KEY placeholder detected. Operating in high-fidelity Deterministic Shield mode."
    };
  }
  // Pre-flight sanitization (OWASP LLM01: Prompt Injection Prevention)
  sanitizeInput(input, maxLength = 3e3) {
    return input.slice(0, maxLength).replace(/<[^>]*>?/gm, "").replace(/[{}[\]]/g, "").trim();
  }
  // Post-flight inspection (OWASP LLM06: Sensitive Information Disclosure)
  inspectOutput(text) {
    const sensitivePatterns = [
      /AIza[0-9A-Za-z-_]{35}/g,
      // Google API Key pattern
      /sk-[a-zA-Z0-9]{32,}/g
      // Generic Secret key pattern
    ];
    for (const pattern of sensitivePatterns) {
      if (pattern.test(text)) {
        throw new Error("SECURITY_BREACH: Outbound response contained credentials.");
      }
    }
    return text;
  }
  async executeStructuredPrompt(systemInstruction, sanitizedUserPrompt, responseSchema) {
    const sanitized = this.sanitizeInput(sanitizedUserPrompt);
    if (!this.ai) {
      this.initClient();
    }
    if (!this.ai) {
      throw new Error("GEMINI_API_UNAVAILABLE: GEMINI_API_KEY is not configured for live inference.");
    }
    const runCall = async (modelName) => {
      const generatePromise = this.ai.models.generateContent({
        model: modelName,
        contents: sanitized,
        config: {
          systemInstruction,
          responseMimeType: "application/json",
          temperature: 0.2,
          ...responseSchema ? { responseSchema } : {}
        }
      });
      const abortController = new AbortController();
      let timeoutId;
      const timeoutPromise = new Promise((_, reject) => {
        timeoutId = setTimeout(() => {
          abortController.abort();
          reject(new Error(`GEMINI_TIMEOUT: Request to ${modelName} exceeded 8000ms`));
        }, 8e3);
      });
      try {
        const response = await Promise.race([generatePromise, timeoutPromise]);
        if (timeoutId) clearTimeout(timeoutId);
        const responseText = response.text ?? "{}";
        return this.inspectOutput(responseText);
      } finally {
        if (timeoutId) clearTimeout(timeoutId);
      }
    };
    try {
      return await runCall(this.primaryModel);
    } catch (primaryErr) {
      const errMsg = primaryErr instanceof Error ? primaryErr.message : String(primaryErr);
      console.warn(`[Gemini LLM] Primary model ${this.primaryModel} failed (${errMsg}). Retrying with fallback ${this.fallbackModel}...`);
      try {
        return await runCall(this.fallbackModel);
      } catch (fallbackErr) {
        console.warn(`[Gemini LLM] Fallback model ${this.fallbackModel} failed:`, fallbackErr instanceof Error ? fallbackErr.message : fallbackErr);
        throw fallbackErr;
      }
    }
  }
};

// src/types/schemas.ts
import { z } from "zod";
var EventCategorySchema = z.enum([
  "venue",
  "catering",
  "decor",
  "photography",
  "logistics",
  "miscellaneous"
]);
var BudgetItemSchema = z.object({
  id: z.string(),
  category: EventCategorySchema,
  label: z.string(),
  allocatedAmount: z.number().nonnegative(),
  actualAmount: z.number().nonnegative(),
  isEstimate: z.boolean(),
  notes: z.string().optional()
});
var DelayStatusSchema = z.enum(["on_time", "delayed", "blocked"]);
var TMinusStageSchema = z.enum(["t_30", "t_7", "t_24h", "day_of"]);
var MilestoneTaskSchema = z.object({
  id: z.string(),
  title: z.string(),
  deadlineDaysBeforeEvent: z.number().int().nonnegative(),
  category: EventCategorySchema,
  dependsOn: z.array(z.string()),
  status: z.enum(["pending", "in_progress", "completed"]),
  urgency: z.enum(["low", "medium", "critical"]),
  delayMinutes: z.number().int().nonnegative().optional(),
  delayStatus: DelayStatusSchema.optional(),
  timeSlot: z.string().optional(),
  tMinusStage: TMinusStageSchema.optional(),
  vendorContact: z.object({
    name: z.string(),
    phone: z.string(),
    role: z.string(),
    email: z.string().optional()
  }).optional()
});
var LifafaCategorySchema = z.enum([
  "panditji",
  "dhol_band",
  "valet_driver",
  "housekeeping",
  "vendor_staff",
  "contingency"
]);
var LifafaItemSchema = z.object({
  id: z.string(),
  recipient: z.string(),
  category: LifafaCategorySchema,
  amount: z.number().positive(),
  status: z.enum(["prepared", "handed_over"]),
  assignedFamilyMember: z.string().optional(),
  notes: z.string().optional()
});
var EmergencyChecklistItemSchema = z.object({
  id: z.string(),
  label: z.string(),
  category: z.enum(["rituals", "power_av", "bridal_vanity", "permits_security"]),
  isReady: z.boolean(),
  responsiblePerson: z.string(),
  contactPhone: z.string().optional()
});
var FloatingGuestConfigSchema = z.object({
  cardsInvited: z.number().int().positive(),
  avgPerCard: z.number().positive(),
  bufferPercent: z.number().int().min(0).max(50),
  mgPercent: z.number().int().min(50).max(100),
  basePlateRate: z.number().positive(),
  lastMinutePenaltyPercent: z.number().positive()
});
var VendorAuditResultSchema = z.object({
  vendorName: z.string(),
  quotedAmount: z.number().nonnegative(),
  detectedInclusions: z.array(z.string()),
  flaggedHiddenCosts: z.array(z.string()),
  negotiationQuestions: z.array(z.string()).max(3)
});
var TradeoffResolutionSchema = z.object({
  strategyTitle: z.string(),
  description: z.string(),
  adjustments: z.array(
    z.object({
      category: EventCategorySchema,
      delta: z.number(),
      rationale: z.string()
    })
  )
});
var TradeoffStrategiesResponseSchema = z.object({
  strategies: z.array(TradeoffResolutionSchema).min(1).max(3)
});
var PlannerApiRequestSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("audit_vendor"),
    vendorNote: z.string().min(1).max(1200),
    guestCount: z.number().int().positive()
  }),
  z.object({
    action: z.literal("suggest_tradeoffs"),
    budgetCap: z.number().nonnegative(),
    totalAllocated: z.number().nonnegative(),
    guestCount: z.number().int().positive(),
    categories: z.array(
      z.object({
        category: EventCategorySchema,
        allocatedAmount: z.number().nonnegative()
      })
    )
  }),
  z.object({
    action: z.literal("parse_task"),
    text: z.string().min(1).max(300)
  })
]);

// src/lib/services/planner-route.ts
function deterministicVendorAuditFallback(rawNote, guestCount) {
  const clean = SecureLLMClient.getInstance().sanitizeInput(rawNote, 800);
  const vendorNameMatch = clean.match(/^([^:,-]{3,40})[:,-]/);
  const vendorName = vendorNameMatch ? vendorNameMatch[1].trim() : "Quoted Event Vendor";
  let quotedAmount = 0;
  const perPlateMatch = clean.match(/(?:₹|Rs\.?|INR)?\s*(\d[\d,]*)\s*(?:per\s*plate|\/\s*plate|pp)/i);
  const minPaxMatch = clean.match(/(?:minimum|min)\s*(\d+)\s*(?:pax|guests|plates)/i);
  const effectivePax = minPaxMatch ? Math.max(guestCount, parseInt(minPaxMatch[1], 10)) : guestCount;
  if (perPlateMatch) {
    const rate = parseInt(perPlateMatch[1].replace(/,/g, ""), 10);
    quotedAmount = rate * effectivePax;
  } else {
    const lumpMatch = clean.match(/(?:₹|Rs\.?|INR)\s*(\d[\d,]{3,})/i);
    if (lumpMatch) {
      quotedAmount = parseInt(lumpMatch[1].replace(/,/g, ""), 10);
    } else {
      quotedAmount = 125e3;
    }
  }
  const detectedInclusions = [];
  if (/waitstaff|servers|service staff/i.test(clean)) {
    detectedInclusions.push("Uniformed waitstaff & table service included");
  }
  if (/buffet|plate|menu/i.test(clean)) {
    detectedInclusions.push(`Full catering service for ${effectivePax} guests`);
  }
  if (/lighting|sound|generator|stage/i.test(clean)) {
    detectedInclusions.push("Basic staging and ambient fixture setup");
  }
  if (detectedInclusions.length === 0) {
    detectedInclusions.push("Base vendor package per rough quotation notes");
  }
  const flaggedHiddenCosts = [];
  if (/gst|tax|18%/i.test(clean)) {
    const gstMatch = clean.match(/(\d{1,2}%)\s*gst|gst\s*(?:extra\s*at\s*)?(\d{1,2}%)/i);
    const rateStr = gstMatch ? gstMatch[1] || gstMatch[2] : "18%";
    const gstValue = Math.round(quotedAmount * (parseInt(rateStr, 10) / 100));
    flaggedHiddenCosts.push(
      `Unbundled GST (${rateStr}) adds approx. \u20B9${gstValue.toLocaleString("en-IN")} to base quote`
    );
  } else {
    flaggedHiddenCosts.push("Tax / GST clause unverified (confirm whether 18% GST is inclusive)");
  }
  const extraFeeMatch = clean.match(/cleaning\s*fee\s*(?:₹|Rs\.?)?\s*(\d[\d,]*)/i);
  if (extraFeeMatch) {
    flaggedHiddenCosts.push(`Mandatory cleaning surcharge of \u20B9${extraFeeMatch[1]} excluded from plate rate`);
  }
  if (/minimum\s*\d+\s*pax/i.test(clean)) {
    flaggedHiddenCosts.push(`Minimum guest guarantee clause enforced (${effectivePax} pax floor)`);
  }
  if (!/transport|delivery|overtime/i.test(clean)) {
    flaggedHiddenCosts.push("Late-night overtime & venue transport/offloading charges not specified");
  }
  const negotiationQuestions = [
    `Can we lock an all-inclusive cap (including GST and cleaning fees) for ${guestCount} guests?`,
    "What is the exact overtime billing rate if the ceremony extends past 11:00 PM?",
    "Are generator backup, chafing fuel, and breakage waivers included in the base quote?"
  ];
  return VendorAuditResultSchema.parse({
    vendorName,
    quotedAmount,
    detectedInclusions,
    flaggedHiddenCosts,
    negotiationQuestions
  });
}
function deterministicTradeoffsFallback(budgetCap, totalAllocated, categories) {
  const overrun = Math.max(0, totalAllocated - budgetCap);
  const targetReduction = overrun > 0 ? overrun : Math.max(25e3, Math.round(totalAllocated * 0.08));
  const getAlloc = (cat) => categories.find((c) => c.category === cat)?.allocatedAmount ?? 0;
  const decorAlloc = getAlloc("decor");
  const cateringAlloc = getAlloc("catering");
  const photoAlloc = getAlloc("photography");
  const venueAlloc = getAlloc("venue");
  const decorCut = -Math.min(decorAlloc, Math.round(targetReduction * 0.55));
  const cateringCut = -Math.min(cateringAlloc, Math.round(targetReduction * 0.45));
  const strategies = [
    {
      strategyTitle: "Preserve Guest Hospitality, Trim Stage Florals",
      description: "Absorbs the budget variance by shifting from imported floral installations to seasonal marigold/drape styling and streamlining live food counters.",
      adjustments: [
        {
          category: "decor",
          delta: decorCut || -25e3,
          rationale: "Switch main stage arch to locally sourced seasonal florals and warm LED uplighting."
        },
        {
          category: "catering",
          delta: cateringCut || -2e4,
          rationale: "Consolidate 4 live chaat/pasta stations into 2 high-throughput signature counters."
        }
      ]
    },
    {
      strategyTitle: "Off-Peak Slot & Deliverables Optimization",
      description: "Rebalances fixed venue and photography packages while adding a dedicated logistics contingency buffer.",
      adjustments: [
        {
          category: "venue",
          delta: -Math.min(venueAlloc, Math.round(targetReduction * 0.6)) || -3e4,
          rationale: "Negotiate bundled lawn + banquet hall package excluding external AC generator markup."
        },
        {
          category: "photography",
          delta: -Math.min(photoAlloc, Math.round(targetReduction * 0.35)) || -18e3,
          rationale: "Opt for digital cinema delivery + 1 heirloom album instead of 3 printed coffee-table sets."
        },
        {
          category: "logistics",
          delta: 1e4,
          rationale: "Retain dedicated guest shuttle and valet buffer for peak arrival window."
        }
      ]
    }
  ];
  return strategies.map((s) => TradeoffResolutionSchema.parse(s));
}
async function handlePlannerRequest(rawBody) {
  const parsedReq = PlannerApiRequestSchema.safeParse(rawBody);
  if (!parsedReq.success) {
    return {
      status: 400,
      data: {
        error: "INVALID_PAYLOAD: Request failed schema validation.",
        details: parsedReq.error.flatten()
      }
    };
  }
  const req = parsedReq.data;
  const client = SecureLLMClient.getInstance();
  if (req.action === "audit_vendor") {
    const systemInstruction = "Normalize rough event vendor notes into JSON. Flag unverified taxes, cleaning, overtime, or minimum guest clauses as hidden costs. Never invent prices; compute quotedAmount using rate * guestCount if per-plate.";
    const prompt = `Guests:${req.guestCount}. Note:${req.vendorNote}`;
    try {
      const rawJson = await client.executeStructuredPrompt(systemInstruction, prompt, {
        type: Type.OBJECT,
        properties: {
          vendorName: { type: Type.STRING },
          quotedAmount: { type: Type.NUMBER },
          detectedInclusions: { type: Type.ARRAY, items: { type: Type.STRING } },
          flaggedHiddenCosts: { type: Type.ARRAY, items: { type: Type.STRING } },
          negotiationQuestions: { type: Type.ARRAY, items: { type: Type.STRING } }
        },
        required: [
          "vendorName",
          "quotedAmount",
          "detectedInclusions",
          "flaggedHiddenCosts",
          "negotiationQuestions"
        ]
      });
      const parsedJson = JSON.parse(rawJson);
      if (Array.isArray(parsedJson.negotiationQuestions)) {
        parsedJson.negotiationQuestions = parsedJson.negotiationQuestions.slice(0, 3);
      }
      const validated = VendorAuditResultSchema.parse(parsedJson);
      return { status: 200, data: { result: validated, source: "gemini-live" } };
    } catch {
      const fallback = deterministicVendorAuditFallback(req.vendorNote, req.guestCount);
      return { status: 200, data: { result: fallback, source: "deterministic-shield" } };
    }
  }
  if (req.action === "suggest_tradeoffs") {
    const variance = req.budgetCap - req.totalAllocated;
    const catSummary = req.categories.map((c) => `${c.category}:${c.allocatedAmount}`).join(",");
    const systemInstruction = "Event budget trade-off consultant. Suggest 2 JSON trade-off strategies with category delta adjustments (negative to cut, positive to add) to resolve budget overrun or optimize allocation.";
    const prompt = `Cap:${req.budgetCap} Alloc:${req.totalAllocated} Var:${variance} Guests:${req.guestCount} Split:${catSummary}`;
    try {
      const rawJson = await client.executeStructuredPrompt(systemInstruction, prompt, {
        type: Type.OBJECT,
        properties: {
          strategies: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                strategyTitle: { type: Type.STRING },
                description: { type: Type.STRING },
                adjustments: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      category: {
                        type: Type.STRING,
                        enum: [
                          "venue",
                          "catering",
                          "decor",
                          "photography",
                          "logistics",
                          "miscellaneous"
                        ]
                      },
                      delta: { type: Type.NUMBER },
                      rationale: { type: Type.STRING }
                    },
                    required: ["category", "delta", "rationale"]
                  }
                }
              },
              required: ["strategyTitle", "description", "adjustments"]
            }
          }
        },
        required: ["strategies"]
      });
      const parsedJson = JSON.parse(rawJson);
      const validated = TradeoffStrategiesResponseSchema.parse(parsedJson);
      return { status: 200, data: { strategies: validated.strategies, source: "gemini-live" } };
    } catch {
      const fallback = deterministicTradeoffsFallback(
        req.budgetCap,
        req.totalAllocated,
        req.categories
      );
      return { status: 200, data: { strategies: fallback, source: "deterministic-shield" } };
    }
  }
  if (req.action === "parse_task") {
    const rawText = req.text.trim();
    const daysMatch = rawText.match(/(\d+)\s*(?:d|days?|days?\s*before)/i);
    const deadlineDaysBeforeEvent = daysMatch ? parseInt(daysMatch[1], 10) : 21;
    let category = "miscellaneous";
    if (/venue|hall|banquet|ground|lawn|room/i.test(rawText)) category = "venue";
    else if (/catering|food|buffet|thali|tasting|menu|chef|halwai|cake|dessert/i.test(rawText)) category = "catering";
    else if (/decor|flower|florist|mandap|lighting|stage|floral|drape/i.test(rawText)) category = "decor";
    else if (/photo|video|camera|shoot|album|drone|lens/i.test(rawText)) category = "photography";
    else if (/shuttle|bus|cab|valet|parking|transport|seating|invitation|card/i.test(rawText)) category = "logistics";
    let urgency = "medium";
    if (/urgent|critical|immediate|asap|crucial/i.test(rawText)) urgency = "critical";
    else if (/low|optional|later/i.test(rawText)) urgency = "low";
    const cleanTitle = rawText.replace(/\b(\d+)\s*(?:d|days?|days?\s*before)\b/gi, "").replace(/\b(urgent|critical|asap|low priority|before)\b/gi, "").replace(/\s+/g, " ").trim() || rawText;
    const fallbackResult = {
      title: cleanTitle.charAt(0).toUpperCase() + cleanTitle.slice(1),
      category,
      deadlineDaysBeforeEvent: Math.min(365, Math.max(1, deadlineDaysBeforeEvent)),
      urgency
    };
    try {
      const systemInstruction = "Parse rough event task into JSON with title, category (venue|catering|decor|photography|logistics|miscellaneous), deadlineDaysBeforeEvent (int 1-365, default 21), urgency (low|medium|critical).";
      const rawJson = await client.executeStructuredPrompt(systemInstruction, rawText, {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          category: {
            type: Type.STRING,
            enum: ["venue", "catering", "decor", "photography", "logistics", "miscellaneous"]
          },
          deadlineDaysBeforeEvent: { type: Type.INTEGER },
          urgency: { type: Type.STRING, enum: ["low", "medium", "critical"] }
        },
        required: ["title", "category", "deadlineDaysBeforeEvent", "urgency"]
      });
      const parsed = JSON.parse(rawJson);
      return { status: 200, data: { task: parsed, source: "gemini-live" } };
    } catch {
      return { status: 200, data: { task: fallbackResult, source: "deterministic-shield" } };
    }
  }
  return { status: 400, data: { error: "UNKNOWN_ACTION: Action not recognized." } };
}

// src/lib/plannerEngine.ts
var VARIABLE_CATEGORIES = /* @__PURE__ */ new Set([
  "catering",
  "logistics"
]);
function scaleBudgetCategories(budgetItems, guestCount, baseGuestCount) {
  const safeBase = Math.max(1, baseGuestCount);
  const safeCurrent = Math.max(1, guestCount);
  const ratio = safeCurrent / safeBase;
  const categoryMap = /* @__PURE__ */ new Map();
  for (const item of budgetItems) {
    const isVar = VARIABLE_CATEGORIES.has(item.category);
    const rawAllocated = typeof item.allocatedAmount === "number" && !isNaN(item.allocatedAmount) ? item.allocatedAmount : Number(item.actualAmount) || Number(item.estimatedCost) || 0;
    const scaledAmount = isVar ? Math.round(rawAllocated * ratio) : rawAllocated;
    const existing = categoryMap.get(item.category);
    if (existing) {
      existing.total += scaledAmount;
    } else {
      categoryMap.set(item.category, { total: scaledAmount, isVariable: isVar });
    }
  }
  const result = [];
  categoryMap.forEach((val, category) => {
    result.push({
      category,
      allocatedAmount: val.total,
      isVariable: val.isVariable
    });
  });
  return result;
}
function computeBudgetTotals(scaledCategories, budgetCap) {
  const totalAllocated = scaledCategories.reduce((sum, c) => sum + c.allocatedAmount, 0);
  const variance = budgetCap - totalAllocated;
  const overrunAmount = Math.max(0, totalAllocated - budgetCap);
  return {
    totalAllocated,
    budgetCap,
    variance,
    overrunAmount,
    isOverrun: overrunAmount > 0
  };
}
function resolveMilestoneDAG(milestones, daysRemaining) {
  const taskMap = /* @__PURE__ */ new Map();
  const inDegree = /* @__PURE__ */ new Map();
  const adjList = /* @__PURE__ */ new Map();
  for (const task of milestones) {
    taskMap.set(task.id, task);
    inDegree.set(task.id, 0);
    adjList.set(task.id, []);
  }
  for (const task of milestones) {
    for (const prereqId of task.dependsOn) {
      if (taskMap.has(prereqId)) {
        adjList.get(prereqId).push(task.id);
        inDegree.set(task.id, (inDegree.get(task.id) || 0) + 1);
      }
    }
  }
  const queue = [];
  inDegree.forEach((deg, id) => {
    if (deg === 0) queue.push(id);
  });
  const sortedOrder = [];
  while (queue.length > 0) {
    const current = queue.shift();
    sortedOrder.push(current);
    const neighbors = adjList.get(current) || [];
    for (const neighbor of neighbors) {
      const newDeg = (inDegree.get(neighbor) || 1) - 1;
      inDegree.set(neighbor, newDeg);
      if (newDeg === 0) {
        queue.push(neighbor);
      }
    }
  }
  const isCyclic = sortedOrder.length !== milestones.length;
  if (isCyclic) {
    const visited = new Set(sortedOrder);
    const unvisited = milestones.filter((t) => !visited.has(t.id)).sort((a, b) => b.deadlineDaysBeforeEvent - a.deadlineDaysBeforeEvent);
    for (const u of unvisited) {
      sortedOrder.push(u.id);
    }
  }
  const bottlenecks = [];
  for (const task of milestones) {
    const leadTime = task.leadTimeDays || task.deadlineDaysBeforeEvent;
    if ((leadTime > daysRemaining || task.deadlineDaysBeforeEvent > daysRemaining) && task.status !== "completed") {
      bottlenecks.push(task.id);
    }
  }
  return {
    topologicalOrder: sortedOrder,
    bottlenecks,
    isCyclic
  };
}
function computeUrgencyScore(totalAllocated, budgetCap, bottlenecks, unverifiedCount, maxLeadTimeDeficitDays = 0) {
  const overrun = totalAllocated - budgetCap;
  if (overrun > 0) {
    const overrunPercent = budgetCap > 0 ? overrun / budgetCap * 100 : 100;
    return Math.min(100, Math.round(85 + Math.min(overrunPercent, 25) / 25 * 15));
  }
  if (bottlenecks.length > 0) {
    const deficitScale = Math.min(Math.max(1, maxLeadTimeDeficitDays), 30) / 30;
    return Math.min(84, Math.round(65 + deficitScale * 19));
  }
  if (unverifiedCount > 0) {
    return Math.min(64, 40 + unverifiedCount * 5);
  }
  const utilization = budgetCap > 0 ? Math.min(1, totalAllocated / budgetCap) : 0;
  return Math.round(utilization * 35);
}
function evaluateEventPlan(input) {
  const scaledCategories = scaleBudgetCategories(
    input.budgetItems,
    input.guestCount,
    input.baseGuestCount
  );
  const budget = computeBudgetTotals(scaledCategories, input.totalBudgetCap);
  const dag = resolveMilestoneDAG(input.milestones, input.daysRemaining);
  const unverifiedCount = input.budgetItems.filter((item) => item.isEstimate).length;
  let maxLeadTimeDeficitDays = 0;
  for (const task of input.milestones) {
    if (dag.bottlenecks.includes(task.id)) {
      const leadTime = task.leadTimeDays || task.deadlineDaysBeforeEvent;
      const deficit = Math.max(0, leadTime - input.daysRemaining);
      if (deficit > maxLeadTimeDeficitDays) {
        maxLeadTimeDeficitDays = deficit;
      }
    }
  }
  const urgencyScore = computeUrgencyScore(
    budget.totalAllocated,
    budget.budgetCap,
    dag.bottlenecks,
    unverifiedCount,
    maxLeadTimeDeficitDays
  );
  let triageTier = "ON_TRACK";
  if (budget.isOverrun || urgencyScore >= 85) {
    triageTier = "CRITICAL_OVERRUN";
  } else if (dag.bottlenecks.length > 0 || urgencyScore >= 65) {
    triageTier = "TIMELINE_BOTTLENECK";
  } else if (unverifiedCount > 0 || urgencyScore >= 40) {
    triageTier = "VENDOR_CLARIFICATION";
  }
  return {
    triageTier,
    totalAllocated: budget.totalAllocated,
    budgetCap: budget.budgetCap,
    variance: budget.variance,
    overrunAmount: budget.overrunAmount,
    scaledCategories,
    criticalPathBottlenecks: dag.bottlenecks,
    topologicalOrder: dag.topologicalOrder,
    isCyclic: dag.isCyclic,
    evaluationTimestamp: (/* @__PURE__ */ new Date()).toISOString(),
    urgencyScore
  };
}
function generateDeterministicTradeoffs(deficit, scaledCategories, _vibe) {
  if (deficit <= 0) {
    return [
      {
        strategyTitle: "Budget Perfectly Balanced",
        description: "All categories are within the approved budget cap. No trade-offs needed.",
        adjustments: []
      }
    ];
  }
  const decor = scaledCategories.find((c) => c.category === "decor")?.allocatedAmount || 0;
  const catering = scaledCategories.find((c) => c.category === "catering")?.allocatedAmount || 0;
  const photo = scaledCategories.find((c) => c.category === "photography")?.allocatedAmount || 0;
  const logistics = scaledCategories.find((c) => c.category === "logistics")?.allocatedAmount || 0;
  const strategies = [];
  const trimDecor1 = Math.min(Math.round(deficit * 0.6), Math.round(decor * 0.35));
  const trimMisc1 = Math.max(0, deficit - trimDecor1);
  strategies.push({
    strategyTitle: "Experience First (Prudent Aesthetic Trim)",
    description: "Preserve catering and venue excellence while consolidating decorative floral setups and trimming discretionary miscellaneous buffers.",
    adjustments: [
      {
        category: "decor",
        delta: -trimDecor1,
        rationale: "Opt for seasonal local marigolds and minimal entrance arches rather than imported exotic blooms."
      },
      {
        category: "miscellaneous",
        delta: -trimMisc1,
        rationale: "Tighten discretionary emergency buffer to meet strict budget cap."
      }
    ]
  });
  const trimCatering2 = Math.min(Math.round(deficit * 0.7), Math.round(catering * 0.2));
  const trimDecor2 = Math.max(0, deficit - trimCatering2);
  strategies.push({
    strategyTitle: "Strict Budget Cap (Menu Rationalization)",
    description: "Streamline live chaat counters from 6 to 4 and replace imported dessert selections with signature Indian classics.",
    adjustments: [
      {
        category: "catering",
        delta: -trimCatering2,
        rationale: "Reduce 2 live appetizer counters, saving \u20B9150-\u20B9250 per plate without affecting main feast quality."
      },
      {
        category: "decor",
        delta: -trimDecor2,
        rationale: "Absorb remaining variance through stage backdrop simplification."
      }
    ]
  });
  const trimLogistics3 = Math.min(Math.round(deficit * 0.4), Math.max(0, Math.round(logistics * 0.4)));
  const trimPhoto3 = Math.min(Math.round(deficit * 0.4), Math.max(0, Math.round(photo * 0.25)));
  const trimMisc3 = Math.max(0, deficit - (trimLogistics3 + trimPhoto3));
  strategies.push({
    strategyTitle: "Guest Trim (Headcount & Logistics Scaling)",
    description: "Calibrate outstation guest shuttles, valet deployment, and physical media prints to balance without touching feast quality.",
    adjustments: [
      {
        category: "logistics",
        delta: -trimLogistics3,
        rationale: "Optimize guest shuttle pickup routes and valet parking roster."
      },
      {
        category: "photography",
        delta: -trimPhoto3,
        rationale: "Switch printed luxury coffee-table albums to high-res digital cloud gallery links."
      },
      {
        category: "miscellaneous",
        delta: -trimMisc3,
        rationale: "Rebalance residual deficit from event miscellaneous buffer."
      }
    ]
  });
  return strategies;
}
function auditVendorQuoteOffline(vendorNote) {
  const lower = vendorNote.toLowerCase();
  let vendorName = "Audited Vendor Quotation";
  const nameMatch = vendorNote.match(/^([A-Za-z0-9\s&'.-]{3,35})\s*[:\-\n]/);
  if (nameMatch && !nameMatch[1].toLowerCase().includes("quote") && !nameMatch[1].toLowerCase().includes("invoice")) {
    vendorName = nameMatch[1].trim();
  }
  const perPlateMatch = vendorNote.match(/(?:rs\.?|inr|₹)\s*([\d,]+)\s*(?:per\s*plate|\/plate|per\s*pax|per\s*head|\/head)/i);
  const paxMatch = vendorNote.match(/(\d+)\s*(?:pax|guests|people|plates|attendees)/i) || vendorNote.match(/(?:min|minimum)\s*(\d+)/i);
  let quotedAmount = 0;
  if (perPlateMatch && paxMatch) {
    const rate = parseInt(perPlateMatch[1].replace(/,/g, ""), 10) || 0;
    const pax = parseInt(paxMatch[1], 10) || 0;
    if (rate > 0 && pax > 0) {
      quotedAmount = rate * pax;
    }
  }
  if (quotedAmount === 0) {
    const amountMatch = vendorNote.match(/(?:rs\.?|inr|₹)\s*([\d,]+)/i) || vendorNote.match(/([\d,]+)\s*(?:rs|inr|\/-)/i);
    if (amountMatch) {
      quotedAmount = parseInt(amountMatch[1].replace(/,/g, ""), 10) || 0;
    }
  }
  const detectedInclusions = [];
  const flaggedHiddenCosts = [];
  const negotiationQuestions = [];
  if (lower.includes("food") || lower.includes("plate") || lower.includes("menu") || lower.includes("cater") || lower.includes("buffet") || lower.includes("chaat")) {
    detectedInclusions.push("Feast & Menu Service");
  }
  if (lower.includes("decor") || lower.includes("flower") || lower.includes("stage") || lower.includes("mandap")) {
    detectedInclusions.push("Stage & Entrance Decor");
  }
  if (lower.includes("photo") || lower.includes("video") || lower.includes("album") || lower.includes("drone")) {
    detectedInclusions.push("Photography & Videography");
  }
  if (lower.includes("sound") || lower.includes("dj") || lower.includes("mic") || lower.includes("speaker")) {
    detectedInclusions.push("Sound & Acoustic Setup");
  }
  if (lower.includes("generator") || lower.includes("genset") || lower.includes("power backup")) {
    detectedInclusions.push("Power Backup Included");
  }
  if (lower.includes("cleaning") || lower.includes("housekeeping")) {
    detectedInclusions.push("Cleaning Services Included");
  }
  if (detectedInclusions.length === 0) {
    detectedInclusions.push("Standard Service Scope");
  }
  if (!lower.includes("gst") && !lower.includes("tax")) {
    flaggedHiddenCosts.push("GST (18%) not mentioned \u2014 potential +18% invoice surprise");
    negotiationQuestions.push("Does your quoted figure include 18% GST, or will taxes be billed additionally?");
  }
  if (!lower.includes("generator") && !lower.includes("genset") && !lower.includes("diesel") && !lower.includes("power backup") && !lower.includes("dg")) {
    flaggedHiddenCosts.push("Generator/DG fuel charges unlisted (common \u20B915,000\u2013\u20B925,000 add-on)");
    negotiationQuestions.push("Are backup generator fuel running hours included in this quote or charged per hour?");
  }
  if (!lower.includes("cleaning") && !lower.includes("housekeeping") && !lower.includes("trash") && !lower.includes("porterage") && !lower.includes("waste")) {
    flaggedHiddenCosts.push("Post-event venue trash disposal & deep cleaning deposit omitted");
    negotiationQuestions.push("Who is responsible for post-event hall cleaning and waste clearance fees?");
  }
  if (!lower.includes("overtime") && !lower.includes("extra hour") && !lower.includes("curfew") && !lower.includes("late night")) {
    flaggedHiddenCosts.push("Overtime/midnight curfew charges unstated (applicable after 11 PM)");
    if (negotiationQuestions.length < 3) {
      negotiationQuestions.push("What is your hourly overtime rate if celebrations extend past midnight?");
    }
  }
  if (!lower.includes("advance") && !lower.includes("deposit") && !lower.includes("token") && !lower.includes("payment schedule")) {
    flaggedHiddenCosts.push("Advance deposit % and milestone payment schedule not formalized");
    if (negotiationQuestions.length < 3) {
      negotiationQuestions.push("What is the advance token deposit percentage and payment milestone schedule?");
    }
  }
  while (negotiationQuestions.length < 3) {
    negotiationQuestions.push("What is the refund and cancellation policy if event dates shift by 14 days?");
  }
  const finalQuestions = negotiationQuestions.slice(0, 3);
  return {
    vendorName,
    quotedAmount,
    detectedInclusions,
    inclusions: detectedInclusions,
    flaggedHiddenCosts,
    hiddenCostRisks: flaggedHiddenCosts,
    negotiationQuestions: finalQuestions,
    provenance: "fallback"
  };
}

// server.ts
if (!process.env.VERCEL) {
  try {
    const { config } = await import("dotenv");
    config();
  } catch {
  }
}
var __filename = fileURLToPath(import.meta.url);
var __dirname = path.dirname(__filename);
var requestRateMap = /* @__PURE__ */ new Map();
function rateLimiter(req, res, next) {
  const forwarded = req.headers["x-forwarded-for"];
  const ip = (typeof forwarded === "string" ? forwarded.split(",")[0]?.trim() : Array.isArray(forwarded) ? forwarded[0] : null) || req.ip || req.socket?.remoteAddress || "127.0.0.1";
  const now = Date.now();
  const windowMs = 60 * 1e3;
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
function scrubPii(text) {
  return text.replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g, "[REDACTED_EMAIL]").replace(/\b(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/g, "[REDACTED_PHONE]").replace(/\b[\w.-]+@(?:oksbi|okaxis|okhdfcbank|okicici|paytm|ybl|upi)\b/gi, "[REDACTED_UPI]").replace(/\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{0,4}\b/g, "[REDACTED_ACCOUNT]");
}
function getRoleTailoredNarrative(persona, deficit) {
  const formattedDeficit = `\u20B9${deficit.toLocaleString("en-IN")}`;
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
function sanitizeObjectKeys(obj) {
  if (obj === null || typeof obj !== "object") {
    return obj;
  }
  if (Array.isArray(obj)) {
    return obj.map(sanitizeObjectKeys);
  }
  const clean = {};
  for (const key of Object.keys(obj)) {
    if (key === "__proto__" || key === "constructor" || key === "prototype") {
      continue;
    }
    clean[key] = sanitizeObjectKeys(obj[key]);
  }
  for (const key of Object.getOwnPropertyNames(obj)) {
    if (key === "__proto__" || key === "constructor" || key === "prototype") {
      delete clean[key];
    }
  }
  return clean;
}
function createApp() {
  const app2 = express();
  const PORT2 = Number(process.env.APP_PORT || process.env.PORT) || 3e3;
  app2.use(express.json({ limit: "16kb" }));
  app2.use((req, _res, next) => {
    if (req.body && typeof req.body === "object") {
      req.body = sanitizeObjectKeys(req.body);
    }
    next();
  });
  app2.use((req, res, next) => {
    const isDev = process.env.NODE_ENV !== "production";
    const csp = isDev ? "default-src 'self' 'unsafe-inline' 'unsafe-eval' data: blob:; font-src 'self' https://fonts.gstatic.com data:; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; img-src 'self' data: https: blob:; script-src 'self' 'unsafe-inline' 'unsafe-eval'; connect-src 'self' https://generativelanguage.googleapis.com ws: wss: http: https:;" : "default-src 'self'; font-src 'self' https://fonts.gstatic.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; img-src 'self' data: https:; script-src 'self'; connect-src 'self' https://generativelanguage.googleapis.com;";
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
  app2.use("/api", (req, res, next) => {
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
  app2.get(["/api/health", "/health", "/api/index/health"], (_req, res) => {
    const llmStatus = SecureLLMClient.getInstance().getStatus();
    res.json({
      status: "ok",
      nodeVersion: process.version,
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      llm: llmStatus,
      env: {
        geminiKeyConfigured: llmStatus.configured,
        appUrl: process.env.APP_URL || `http://localhost:${PORT2}`
      }
    });
  });
  app2.post(["/api/rebalance", "/rebalance", "/api/index/rebalance"], rateLimiter, async (req, res) => {
    try {
      const planInput = req.body;
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
Deficit to resolve: \u20B9${deficit}
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
      } catch (llmErr) {
        console.warn("[/api/rebalance LLM failure]:", llmErr instanceof Error ? llmErr.message : llmErr);
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
  app2.post(["/api/audit-vendor", "/audit-vendor", "/api/index/audit-vendor"], rateLimiter, async (req, res) => {
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
        const negotiationQuestions = Array.isArray(parsed.negotiationQuestions) ? parsed.negotiationQuestions.slice(0, 3) : [];
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
      } catch (llmErr) {
        console.warn("[/api/audit-vendor LLM failure]:", llmErr instanceof Error ? llmErr.message : llmErr);
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
  app2.post(["/api/planner", "/planner", "/api/index/planner"], async (req, res) => {
    try {
      const { status, data } = await handlePlannerRequest(req.body);
      res.status(status).json(data);
    } catch (error) {
      res.status(500).json({
        error: error instanceof Error ? error.message : "Failed to process planner request"
      });
    }
  });
  app2.use((req, _res, next) => {
    if (req.originalUrl && req.url !== req.originalUrl) {
      req.url = req.originalUrl;
    }
    next();
  });
  return app2;
}
var app = createApp();
var PORT = Number(process.env.APP_PORT || process.env.PORT) || 3e3;
async function startServer() {
  if (process.env.VERCEL === "1") {
    return app;
  }
  const distPath = path.join(__dirname, "dist");
  const distAssetsPath = path.join(distPath, "assets");
  if (process.env.NODE_ENV === "production" && fs.existsSync(distAssetsPath)) {
    app.use("/assets", express.static(distAssetsPath, { maxAge: "1d" }));
  }
  if (process.env.NODE_ENV !== "production") {
    const vitePkg = "vite";
    const { createServer: createViteServer } = await import(
      /* @vite-ignore */
      vitePkg
    );
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
        if (e && typeof e.stack === "string") {
          vite.ssrFixStacktrace(e);
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
var isDirectRun = Boolean(
  process.argv[1] && (fileURLToPath(import.meta.url) === path.resolve(process.argv[1]) || process.argv[1].endsWith("server.ts"))
);
if (process.env.VERCEL !== "1" && process.env.NODE_ENV !== "test" && isDirectRun) {
  startServer();
}
var server_default = app;
export {
  app,
  createApp,
  server_default as default,
  sanitizeObjectKeys,
  startServer
};
