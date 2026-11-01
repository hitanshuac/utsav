import { describe, it, expect } from "vitest";
import {
  generateCustomEventPlan,
  CustomEventInput,
  sortMilestonesTopologically
} from "../src/lib/plannerEngine";
import { sanitizeTextInput } from "../src/components/CustomEventModal";

describe("Custom Event Guided Intake Engine & XSS Sanitizer", () => {
  it("generates a balanced 6-category budget plan matching totalBudgetCap exactly", () => {
    const input: CustomEventInput = {
      eventTitle: "Verma Sangeet Night",
      occasionType: "Wedding",
      totalBudgetCap: 800000,
      guestCount: 220,
      daysUntilEvent: 45,
      priorityVibe: "Experience First",
      mustHavePriority: "Food & Catering"
    };

    const startTime = performance.now();
    const result = generateCustomEventPlan(input);
    const durationMs = performance.now() - startTime;

    // Execution time must be <5ms
    expect(durationMs).toBeLessThan(5);

    // Must have exactly 6 budget categories
    expect(result.budget.length).toBe(6);

    // Sum of allocatedAmount must exactly match totalBudgetCap
    const sumAllocated = result.budget.reduce((acc, curr) => acc + curr.allocatedAmount, 0);
    expect(sumAllocated).toBe(800000);
  });

  it("boosts the selected Must-Have category by +10% while balancing other categories", () => {
    const baseInput: CustomEventInput = {
      eventTitle: "Golden Jubilee",
      occasionType: "Milestone Birthday / Anniversary",
      totalBudgetCap: 600000,
      guestCount: 100,
      daysUntilEvent: 30,
      priorityVibe: "Balanced",
      mustHavePriority: "Photography & Memories"
    };

    const result = generateCustomEventPlan(baseInput);
    const photoCategory = result.budget.find((b) => b.category === "photography");
    expect(photoCategory).toBeDefined();

    // Standard baseline for photography in Milestone is ~15%. With +10% boost, it should be ~25% (₹150,000)
    expect(photoCategory!.allocatedAmount).toBeGreaterThanOrEqual(140000);

    const totalSum = result.budget.reduce((acc, curr) => acc + curr.allocatedAmount, 0);
    expect(totalSum).toBe(600000);
  });

  it("generates a tailored 6-step milestone DAG with valid prerequisites and topological order", () => {
    const input: CustomEventInput = {
      eventTitle: "Diwali Community Mela",
      occasionType: "Cultural / Community Fest",
      totalBudgetCap: 1200000,
      guestCount: 500,
      daysUntilEvent: 60,
      priorityVibe: "Budget Strict",
      mustHavePriority: "Venue & Comfort"
    };

    const result = generateCustomEventPlan(input);

    expect(result.milestones.length).toBe(6);

    // Must have valid topological order without cycles
    const sorted = sortMilestonesTopologically(result.milestones);
    expect(sorted.length).toBe(6);

    // Prerequisites must precede dependent milestones
    const indexMap = new Map(sorted.map((m, idx) => [m.id, idx]));
    for (const milestone of sorted) {
      const milestoneIdx = indexMap.get(milestone.id)!;
      for (const prereqId of milestone.dependsOn) {
        const prereqIdx = indexMap.get(prereqId);
        expect(prereqIdx).toBeDefined();
        expect(prereqIdx!).toBeLessThan(milestoneIdx);
      }
    }
  });

  it("sanitizes text input against XSS injection and structural delimiters", () => {
    const dirty1 = "<script>alert('pwned')</script>Royal Banquet";
    expect(sanitizeTextInput(dirty1)).toBe("alert('pwned')Royal Banquet");

    const dirty2 = "<img src=x onerror=alert(1)>Sharma Wedding";
    expect(sanitizeTextInput(dirty2)).toBe("Sharma Wedding");

    const delimiters = "{payload: [evil]}Grand Celebration";
    expect(sanitizeTextInput(delimiters)).toBe("payload: evilGrand Celebration");

    const longString = "A".repeat(300);
    const sanitizedLong = sanitizeTextInput(longString);
    expect(sanitizedLong.length).toBe(200);
  });
});
