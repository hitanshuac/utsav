/**
 * UtsavAI — Legacy Planner Route Handler
 * Consolidated from app/api/planner/route.ts into src/lib/services/.
 * Handles backward-compatible /api/planner endpoint actions.
 */
import { Type } from "@google/genai";
import { SecureLLMClient } from "./secure-llm-client";
import {
  PlannerApiRequestSchema,
  TradeoffStrategiesResponseSchema,
  VendorAuditResultSchema
} from "../../types/schemas";
import {
  deterministicVendorAuditFallback,
  deterministicTradeoffsFallback
} from "./planner-fallbacks";

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

    const schema = {
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
    };

    try {
      const raw = await client.executeStructuredPrompt(systemInstruction, prompt, schema);
      const parsed = JSON.parse(raw);

      return {
        status: 200,
        data: VendorAuditResultSchema.parse(parsed)
      };
    } catch {
      return {
        status: 200,
        data: deterministicVendorAuditFallback(req.vendorNote, req.guestCount)
      };
    }
  }

  if (req.action === "suggest_tradeoffs") {
    const systemInstruction =
      "Generate exactly 2 trade-off strategy options. Rebalance excess budget across decor, venue, catering, or photography. Return structured JSON.";
    const prompt = `Cap:${req.budgetCap}. Total:${req.totalAllocated}. Cats:${JSON.stringify(req.categories)}`;

    const schema = {
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
                      enum: ["venue", "catering", "decor", "photography", "logistics", "miscellaneous"]
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
    };

    try {
      const raw = await client.executeStructuredPrompt(systemInstruction, prompt, schema);
      const parsed = JSON.parse(raw);

      return {
        status: 200,
        data: TradeoffStrategiesResponseSchema.parse(parsed).strategies
      };
    } catch {
      return {
        status: 200,
        data: deterministicTradeoffsFallback(req.budgetCap, req.totalAllocated, req.categories)
      };
    }
  }

  return {
    status: 400,
    data: { error: "UNKNOWN_ACTION: Supported actions are 'audit_vendor' and 'suggest_tradeoffs'." }
  };
}
