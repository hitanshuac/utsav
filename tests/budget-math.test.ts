import { describe, it, expect } from "vitest";
import {
  calculateBudgetSummary,
  applyDynamicDelta,
  applyTradeoffResolution
} from "../lib/engine/budget-math";
import { BudgetItem } from "../lib/types";

describe("Deterministic Budget Calculations", () => {
  const sampleItems: BudgetItem[] = [
    {
      id: "1",
      category: "venue",
      label: "Hall",
      allocatedAmount: 100000,
      actualAmount: 100000,
      isEstimate: false
    },
    {
      id: "2",
      category: "catering",
      label: "Food",
      allocatedAmount: 50000,
      actualAmount: 50000,
      isEstimate: false
    }
  ];

  it("calculates accurate budget total and flags overrun", () => {
    const summary = calculateBudgetSummary(sampleItems, 120000);
    expect(summary.totalAllocated).toBe(150000);
    expect(summary.variance).toBe(-30000);
    expect(summary.isOverBudget).toBe(true);
  });

  it("scales catering dynamically when guest count increases", () => {
    const updated = applyDynamicDelta(sampleItems, 50, 100); // 50% increase
    const catering = updated.find((i) => i.category === "catering");
    expect(catering?.allocatedAmount).toBe(75000);
    const venue = updated.find((i) => i.category === "venue");
    expect(venue?.allocatedAmount).toBe(100000); // Venue must not scale with guests
  });

  it("applies strategic trade-off adjustments deterministically", () => {
    const adjusted = applyTradeoffResolution(sampleItems, {
      strategyTitle: "Trim Catering",
      description: "Reduce catering allocation by 15000",
      adjustments: [
        {
          category: "catering",
          delta: -15000,
          rationale: "Streamline dessert station"
        }
      ]
    });
    expect(adjusted.find((i) => i.category === "catering")?.allocatedAmount).toBe(35000);
  });
});
