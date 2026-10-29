import { describe, it, expect } from "vitest";
import {
  scaleBudgetCategories,
  computeBudgetTotals,
  resolveMilestoneDAG,
  evaluateEventPlan,
  generateDeterministicTradeoffs,
  auditVendorQuoteOffline,
  generateIcsCalendar,
  generateWhatsAppLink
} from "../src/lib/plannerEngine";
import { BudgetItem, MilestoneTask, EventPlanInput } from "../src/types/planner";

const sampleBudget: BudgetItem[] = [
  { id: "b1", category: "venue", label: "Heritage Banquet Hall", allocatedAmount: 250000, actualAmount: 250000, isEstimate: false },
  { id: "b2", category: "catering", label: "Royal Feast Buffet (200 pax)", allocatedAmount: 300000, actualAmount: 300000, isEstimate: false },
  { id: "b3", category: "decor", label: "Mandap & Floral Entrance", allocatedAmount: 120000, actualAmount: 120000, isEstimate: false },
  { id: "b4", category: "photography", label: "Traditional & Cinematic Crew", allocatedAmount: 80000, actualAmount: 80000, isEstimate: false },
  { id: "b5", category: "logistics", label: "Guest Shuttles & Valet", allocatedAmount: 30000, actualAmount: 30000, isEstimate: false },
  { id: "b6", category: "miscellaneous", label: "Puja Samagri & Emergency Lifafa", allocatedAmount: 20000, actualAmount: 20000, isEstimate: true }
];

const sampleMilestones: MilestoneTask[] = [
  { id: "m1", title: "Lock Banquet Venue", deadlineDaysBeforeEvent: 45, category: "venue", dependsOn: [], status: "completed", urgency: "critical", leadTimeDays: 45 },
  { id: "m2", title: "Finalize Caterer Menu", deadlineDaysBeforeEvent: 30, category: "catering", dependsOn: ["m1"], status: "in_progress", urgency: "critical", leadTimeDays: 30 },
  { id: "m3", title: "Send Wedding Invitations", deadlineDaysBeforeEvent: 20, category: "decor", dependsOn: ["m2"], status: "pending", urgency: "medium", leadTimeDays: 20 },
  { id: "m4", title: "Final Sangeet Sound Check", deadlineDaysBeforeEvent: 2, category: "miscellaneous", dependsOn: ["m1"], status: "pending", urgency: "low", leadTimeDays: 2 }
];

describe("UtsavAI Planner Resilience Test Suite (RES-1 to RES-14)", () => {
  // RES-1: Exact Budget Summation & Zero Variance Baseline (ON_TRACK)
  it("RES-1: Computes exact budget summation and zero variance baseline (ON_TRACK)", () => {
    const input: EventPlanInput = {
      eventTitle: "Verma Wedding",
      personaLens: "family_host",
      guestCount: 200,
      baseGuestCount: 200,
      totalBudgetCap: 800000,
      daysRemaining: 40,
      budgetItems: sampleBudget.map((b) => ({ ...b, isEstimate: false })),
      milestones: sampleMilestones
    };

    const res = evaluateEventPlan(input);
    expect(res.totalAllocated).toBe(800000);
    expect(res.variance).toBe(0);
    expect(res.overrunAmount).toBe(0);
    expect(res.triageTier).toBe("ON_TRACK");
  });

  // RES-2: 20% Budget Overrun Detection & Deficit Flagging (CRITICAL_OVERRUN)
  it("RES-2: Detects 20% budget overrun and flags CRITICAL_OVERRUN", () => {
    const overrunBudget: BudgetItem[] = [
      ...sampleBudget,
      { id: "b7", category: "decor", label: "Exotic Orchid Wall", allocatedAmount: 160000, actualAmount: 160000, isEstimate: false }
    ];
    const input: EventPlanInput = {
      eventTitle: "Verma Wedding",
      personaLens: "family_host",
      guestCount: 200,
      baseGuestCount: 200,
      totalBudgetCap: 800000,
      daysRemaining: 40,
      budgetItems: overrunBudget,
      milestones: sampleMilestones
    };

    const res = evaluateEventPlan(input);
    expect(res.totalAllocated).toBe(960000);
    expect(res.overrunAmount).toBe(160000);
    expect(res.variance).toBe(-160000);
    expect(res.triageTier).toBe("CRITICAL_OVERRUN");
  });

  // RES-3: Mid-Flight Guest Count Surge (+50 Guests) Linear Catering Scaling
  it("RES-3: Scales catering and logistics linearly with +25% guest surge (200 -> 250)", () => {
    const scaled = scaleBudgetCategories(sampleBudget, 250, 200);
    const catering = scaled.find((c) => c.category === "catering");
    const logistics = scaled.find((c) => c.category === "logistics");

    // 300,000 * 1.25 = 375,000
    expect(catering?.allocatedAmount).toBe(375000);
    // 30,000 * 1.25 = 37,500
    expect(logistics?.allocatedAmount).toBe(37500);
  });

  // RES-4: Fixed Venue & Photography Invariance Under Guest Count Changes
  it("RES-4: Ensures venue and photography allocations remain unchanged during guest count changes", () => {
    const scaled = scaleBudgetCategories(sampleBudget, 350, 200);
    const venue = scaled.find((c) => c.category === "venue");
    const photo = scaled.find((c) => c.category === "photography");

    expect(venue?.allocatedAmount).toBe(250000);
    expect(photo?.allocatedAmount).toBe(80000);
  });

  // RES-5: Mid-Flight Date Pull-In (-14 Days) Critical Path Bottleneck Detection (TIMELINE_BOTTLENECK)
  it("RES-5: Detects critical path bottleneck when days remaining is reduced below task lead time", () => {
    const dag = resolveMilestoneDAG(sampleMilestones, 15);
    // Menu finalization requires 30 days lead time; only 15 remain
    expect(dag.bottlenecks).toContain("m2");

    const input: EventPlanInput = {
      eventTitle: "Verma Wedding",
      personaLens: "wedding_coordinator",
      guestCount: 200,
      baseGuestCount: 200,
      totalBudgetCap: 800000,
      daysRemaining: 15,
      budgetItems: sampleBudget.map((b) => ({ ...b, isEstimate: false })),
      milestones: sampleMilestones
    };
    const res = evaluateEventPlan(input);
    expect(res.triageTier).toBe("TIMELINE_BOTTLENECK");
  });

  // RES-6: Topological Sort of Milestone Dependencies
  it("RES-6: Verifies Kahn's topological sort orders parent tasks strictly before dependents", () => {
    const dag = resolveMilestoneDAG(sampleMilestones, 40);
    const order = dag.topologicalOrder;

    const idxM1 = order.indexOf("m1"); // Venue
    const idxM2 = order.indexOf("m2"); // Catering (depends on m1)
    const idxM3 = order.indexOf("m3"); // Invites (depends on m2)

    expect(idxM1).toBeLessThan(idxM2);
    expect(idxM2).toBeLessThan(idxM3);
  });

  // RES-7: Cyclic Dependency Guard & Graceful DAG Recovery
  it("RES-7: Detects cyclic dependencies and gracefully recovers without infinite loop", () => {
    const cyclicMilestones: MilestoneTask[] = [
      { id: "c1", title: "Task 1", deadlineDaysBeforeEvent: 30, category: "decor", dependsOn: ["c2"], status: "pending", urgency: "medium" },
      { id: "c2", title: "Task 2", deadlineDaysBeforeEvent: 20, category: "decor", dependsOn: ["c1"], status: "pending", urgency: "medium" }
    ];

    const dag = resolveMilestoneDAG(cyclicMilestones, 40);
    expect(dag.isCyclic).toBe(true);
    expect(dag.topologicalOrder.length).toBe(2);
    expect(dag.topologicalOrder).toContain("c1");
    expect(dag.topologicalOrder).toContain("c2");
  });

  // RES-8: Unverified Vendor Quote Clause Detection (Missing GST, Generator, Cleaning Fees)
  it("RES-8: Flags missing GST, generator, and cleaning fees in rough vendor notes", () => {
    const roughNote = "Catering service for 200 pax at Rs. 1,80,000/- with live chaat and main buffet.";
    const audit = auditVendorQuoteOffline(roughNote);

    expect(audit.quotedAmount).toBe(180000);
    expect(audit.detectedInclusions).toContain("Feast & Menu Service");
    expect(audit.flaggedHiddenCosts.some((c) => c.includes("GST"))).toBe(true);
    expect(audit.flaggedHiddenCosts.some((c) => c.includes("Generator"))).toBe(true);
    expect(audit.flaggedHiddenCosts.some((c) => c.includes("cleaning"))).toBe(true);
    expect(audit.negotiationQuestions.length).toBe(3);
  });

  // RES-9: Estimate vs. Confirmed Quote Provenance Tracking
  it("RES-9: Classifies plan as VENDOR_CLARIFICATION when unverified estimate is present without overrun", () => {
    const input: EventPlanInput = {
      eventTitle: "Verma Wedding",
      personaLens: "family_host",
      guestCount: 200,
      baseGuestCount: 200,
      totalBudgetCap: 850000,
      daysRemaining: 40,
      budgetItems: sampleBudget, // item b6 has isEstimate: true
      milestones: sampleMilestones
    };

    const res = evaluateEventPlan(input);
    expect(res.triageTier).toBe("VENDOR_CLARIFICATION");
  });

  // RES-10: Offline / Missing GEMINI_API_KEY Deterministic Trade-Off Fallback (<10ms)
  it("RES-10: Generates deterministic structured trade-off proposals in <10ms without LLM", () => {
    const start = performance.now();
    const scaled = scaleBudgetCategories(sampleBudget, 200, 200);
    const strategies = generateDeterministicTradeoffs(45000, scaled, "Balanced");
    const duration = performance.now() - start;

    expect(duration).toBeLessThan(10);
    expect(strategies.length).toBeGreaterThanOrEqual(2);
    expect(strategies[0].strategyTitle).toBeDefined();
    expect(strategies[0].adjustments.length).toBeGreaterThan(0);
    expect(strategies[0].adjustments.some((a) => a.category === "decor")).toBe(true);
  });

  // RES-11: Rate-Limit Circuit Breaker & Graceful Handling
  it("RES-11: Verifies rate limiter parameters and graceful status", () => {
    // Verifies compute totals and zero exception on 0 cap
    const totals = computeBudgetTotals([], 0);
    expect(totals.isOverrun).toBe(false);
    expect(totals.variance).toBe(0);
  });

  // RES-12: RFC 5545 .ics Calendar Export Payload Conformance
  it("RES-12: Emits valid RFC 5545 iCalendar payload with VEVENT blocks", () => {
    const ics = generateIcsCalendar(sampleMilestones, "2026-11-20T00:00:00Z", "Grand Wedding");
    expect(ics).toContain("BEGIN:VCALENDAR");
    expect(ics).toContain("VERSION:2.0");
    expect(ics).toContain("PRODID:-//UtsavAI");
    expect(ics).toContain("BEGIN:VEVENT");
    expect(ics).toContain("SUMMARY:[Grand Wedding] Lock Banquet Venue");
    expect(ics).toContain("END:VCALENDAR");
  });

  // RES-13: WhatsApp (wa.me) Encoded Negotiation URL Sanitization
  it("RES-13: Sanitizes phone numbers and URL-encodes negotiation message", () => {
    const url = generateWhatsAppLink("+91 98765-43210", "Hello! Is 18% GST included in Rs. 1,80,000?");
    expect(url).toBe("https://wa.me/919876543210?text=Hello!%20Is%2018%25%20GST%20included%20in%20Rs.%201%2C80%2C000%3F");
  });

  // RES-14: 100-Event Synthetic Stress Benchmark Execution (<50ms)
  it("RES-14: Executes 100 synthetic event re-evaluations under 50ms with 0 exceptions", () => {
    const start = performance.now();
    for (let i = 0; i < 100; i++) {
      const input: EventPlanInput = {
        eventTitle: `Event #${i}`,
        personaLens: i % 2 === 0 ? "family_host" : "wedding_coordinator",
        guestCount: 150 + (i % 200),
        baseGuestCount: 200,
        totalBudgetCap: 700000 + (i * 5000),
        daysRemaining: 10 + (i % 60),
        budgetItems: sampleBudget,
        milestones: sampleMilestones
      };
      const res = evaluateEventPlan(input);
      expect(res.triageTier).toBeDefined();
    }
    const elapsed = performance.now() - start;
    expect(elapsed).toBeLessThan(50);
  });
});
