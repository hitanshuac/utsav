import { Type } from "@google/genai";
import { SecureLLMClient } from "../../../lib/security/secure-llm-client";
import {
  PlannerApiRequestSchema,
  TradeoffResolution,
  TradeoffResolutionSchema,
  TradeoffStrategiesResponseSchema,
  VendorAuditResult,
  VendorAuditResultSchema
} from "../../../lib/types";

function deterministicVendorAuditFallback(
  rawNote: string,
  guestCount: number
): VendorAuditResult {
  const clean = SecureLLMClient.getInstance().sanitizeInput(rawNote, 800);
  const vendorNameMatch = clean.match(/^([^:,-]{3,40})[:,-]/);
  const vendorName = vendorNameMatch ? vendorNameMatch[1].trim() : "Quoted Event Vendor";

  // Detect per-plate rate or lump sum
  let quotedAmount = 0;
  const perPlateMatch = clean.match(/(?:₹|Rs\.?|INR)?\s*(\d[\d,]*)\s*(?:per\s*plate|\/\s*plate|pp)/i);
  const minPaxMatch = clean.match(/(?:minimum|min)\s*(\d+)\s*(?:pax|guests|plates)/i);
  const effectivePax = minPaxMatch
    ? Math.max(guestCount, parseInt(minPaxMatch[1], 10))
    : guestCount;

  if (perPlateMatch) {
    const rate = parseInt(perPlateMatch[1].replace(/,/g, ""), 10);
    quotedAmount = rate * effectivePax;
  } else {
    const lumpMatch = clean.match(/(?:₹|Rs\.?|INR)\s*(\d[\d,]{3,})/i);
    if (lumpMatch) {
      quotedAmount = parseInt(lumpMatch[1].replace(/,/g, ""), 10);
    } else {
      quotedAmount = 125000;
    }
  }

  const detectedInclusions: string[] = [];
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

  const flaggedHiddenCosts: string[] = [];
  if (/gst|tax|18%/i.test(clean)) {
    const gstMatch = clean.match(/(\d{1,2}%)\s*gst|gst\s*(?:extra\s*at\s*)?(\d{1,2}%)/i);
    const rateStr = gstMatch ? gstMatch[1] || gstMatch[2] : "18%";
    const gstValue = Math.round(quotedAmount * (parseInt(rateStr, 10) / 100));
    flaggedHiddenCosts.push(
      `Unbundled GST (${rateStr}) adds approx. ₹${gstValue.toLocaleString("en-IN")} to base quote`
    );
  } else {
    flaggedHiddenCosts.push("Tax / GST clause unverified (confirm whether 18% GST is inclusive)");
  }

  const extraFeeMatch = clean.match(/cleaning\s*fee\s*(?:₹|Rs\.?)?\s*(\d[\d,]*)/i);
  if (extraFeeMatch) {
    flaggedHiddenCosts.push(`Mandatory cleaning surcharge of ₹${extraFeeMatch[1]} excluded from plate rate`);
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

function deterministicTradeoffsFallback(
  budgetCap: number,
  totalAllocated: number,
  categories: { category: "venue" | "catering" | "decor" | "photography" | "logistics" | "miscellaneous"; allocatedAmount: number }[]
): TradeoffResolution[] {
  const overrun = Math.max(0, totalAllocated - budgetCap);
  const targetReduction = overrun > 0 ? overrun : Math.max(25000, Math.round(totalAllocated * 0.08));

  const getAlloc = (cat: string) => categories.find((c) => c.category === cat)?.allocatedAmount ?? 0;
  const decorAlloc = getAlloc("decor");
  const cateringAlloc = getAlloc("catering");
  const photoAlloc = getAlloc("photography");
  const venueAlloc = getAlloc("venue");

  const decorCut = -Math.min(decorAlloc, Math.round(targetReduction * 0.55));
  const cateringCut = -Math.min(cateringAlloc, Math.round(targetReduction * 0.45));

  const strategies: TradeoffResolution[] = [
    {
      strategyTitle: "Preserve Guest Hospitality, Trim Stage Florals",
      description:
        "Absorbs the budget variance by shifting from imported floral installations to seasonal marigold/drape styling and streamlining live food counters.",
      adjustments: [
        {
          category: "decor",
          delta: decorCut || -25000,
          rationale: "Switch main stage arch to locally sourced seasonal florals and warm LED uplighting."
        },
        {
          category: "catering",
          delta: cateringCut || -20000,
          rationale: "Consolidate 4 live chaat/pasta stations into 2 high-throughput signature counters."
        }
      ]
    },
    {
      strategyTitle: "Off-Peak Slot & Deliverables Optimization",
      description:
        "Rebalances fixed venue and photography packages while adding a dedicated logistics contingency buffer.",
      adjustments: [
        {
          category: "venue",
          delta: -Math.min(venueAlloc, Math.round(targetReduction * 0.6)) || -30000,
          rationale: "Negotiate bundled lawn + banquet hall package excluding external AC generator markup."
        },
        {
          category: "photography",
          delta: -Math.min(photoAlloc, Math.round(targetReduction * 0.35)) || -18000,
          rationale: "Opt for digital cinema delivery + 1 heirloom album instead of 3 printed coffee-table sets."
        },
        {
          category: "logistics",
          delta: 10000,
          rationale: "Retain dedicated guest shuttle and valet buffer for peak arrival window."
        }
      ]
    }
  ];

  return strategies.map((s) => TradeoffResolutionSchema.parse(s));
}

export async function handlePlannerRequest(rawBody: unknown): Promise<{
  status: number;
  data: unknown;
}> {
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
    const systemInstruction =
      "Normalize rough event vendor notes into JSON. Flag unverified taxes, cleaning, overtime, or minimum guest clauses as hidden costs. Never invent prices; compute quotedAmount using rate * guestCount if per-plate.";
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
    const catSummary = req.categories
      .map((c) => `${c.category}:${c.allocatedAmount}`)
      .join(",");
    const systemInstruction =
      "Event budget trade-off consultant. Suggest 2 JSON trade-off strategies with category delta adjustments (negative to cut, positive to add) to resolve budget overrun or optimize allocation.";
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

    let category: "venue" | "catering" | "decor" | "photography" | "logistics" | "miscellaneous" = "miscellaneous";
    if (/venue|hall|banquet|ground|lawn|room/i.test(rawText)) category = "venue";
    else if (/catering|food|buffet|thali|tasting|menu|chef|halwai|cake|dessert/i.test(rawText)) category = "catering";
    else if (/decor|flower|florist|mandap|lighting|stage|floral|drape/i.test(rawText)) category = "decor";
    else if (/photo|video|camera|shoot|album|drone|lens/i.test(rawText)) category = "photography";
    else if (/shuttle|bus|cab|valet|parking|transport|seating|invitation|card/i.test(rawText)) category = "logistics";

    let urgency: "low" | "medium" | "critical" = "medium";
    if (/urgent|critical|immediate|asap|crucial/i.test(rawText)) urgency = "critical";
    else if (/low|optional|later/i.test(rawText)) urgency = "low";

    const cleanTitle = rawText
      .replace(/\b(\d+)\s*(?:d|days?|days?\s*before)\b/gi, "")
      .replace(/\b(urgent|critical|asap|low priority|before)\b/gi, "")
      .replace(/\s+/g, " ")
      .trim() || rawText;

    const fallbackResult = {
      title: cleanTitle.charAt(0).toUpperCase() + cleanTitle.slice(1),
      category,
      deadlineDaysBeforeEvent: Math.min(365, Math.max(1, deadlineDaysBeforeEvent)),
      urgency
    };

    try {
      const systemInstruction =
        "Parse rough event task into JSON with title, category (venue|catering|decor|photography|logistics|miscellaneous), deadlineDaysBeforeEvent (int 1-365, default 21), urgency (low|medium|critical).";
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

export async function POST(request: Request): Promise<Response> {
  try {
    const body = await request.json();
    const { status, data } = await handlePlannerRequest(body);
    return new Response(JSON.stringify(data), {
      status,
      headers: { "Content-Type": "application/json" }
    });
  } catch (err) {
    return new Response(
      JSON.stringify({
        error: err instanceof Error ? err.message : "INTERNAL_SERVER_ERROR"
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" }
      }
    );
  }
}
