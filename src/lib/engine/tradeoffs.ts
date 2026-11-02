/**
 * UtsavAI Deterministic Trade-Off Strategy Generator
 * Computes 3 mathematical trade-off compromise strategies in <5ms without external API calls.
 */
import { ScaledCategory, TradeoffOption } from "../../types/planner";

/**
 * Offline Deterministic Trade-Off Strategy Generator.
 * Computes 3 mathematical trade-off options in <5ms ("Experience First", "Strict Budget Cap", "Guest Trim")
 * so the application functions 100% offline without an external API key.
 *
 * @param deficit - Budget overrun deficit amount to absorb in INR
 * @param scaledCategories - Current category allocations after headcount scaling
 * @param _vibe - Optional priority vibe preference
 * @returns Array of structured trade-off options with exact category adjustments
 */
export function generateDeterministicTradeoffs(
  deficit: number,
  scaledCategories: ScaledCategory[],
  _vibe?: string
): TradeoffOption[] {
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

  const strategies: TradeoffOption[] = [];

  // Option 1: "Experience First" (Prudent Aesthetic Trim)
  // Protects catering and hospitality, absorbs deficit through floral/stage decor and contingency
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

  // Option 2: "Strict Budget Cap" (Menu & Course Rationalization)
  // Rigidly caps budget by optimizing per-plate menu, trimming live counters and decor
  const trimCatering2 = Math.min(Math.round(deficit * 0.7), Math.round(catering * 0.2));
  const trimDecor2 = Math.max(0, deficit - trimCatering2);
  strategies.push({
    strategyTitle: "Strict Budget Cap (Menu Rationalization)",
    description: "Streamline live chaat counters from 6 to 4 and replace imported dessert selections with signature Indian classics.",
    adjustments: [
      {
        category: "catering",
        delta: -trimCatering2,
        rationale: "Reduce 2 live appetizer counters, saving ₹150-₹250 per plate without affecting main feast quality."
      },
      {
        category: "decor",
        delta: -trimDecor2,
        rationale: "Absorb remaining variance through stage backdrop simplification."
      }
    ]
  });

  // Option 3: "Guest Trim" (Variable Headcount & Logistics Scaling)
  // Calibrates variable logistics shuttles, valet, and media packages without touching core feast
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
