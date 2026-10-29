import { describe, it, expect } from "vitest";
import {
  scaleBudgetCategories,
  resolveMilestoneDAG,
  generateDeterministicTradeoffs,
  preAuditVendorQuote
} from "../src/lib/plannerEngine";
import {
  generateIcsCalendar,
  generateWhatsAppLink
} from "../src/lib/actionDispatchers";
import {
  MilestoneTask,
  BudgetCategoryItem,
  TradeoffOption
} from "../src/types/planner";

describe("Stage 3 Full-Stack Architecture Test Suite", () => {
  const mockBudget: BudgetCategoryItem[] = [
    { id: "v1", category: "venue", label: "Heritage Haveli", allocatedAmount: 300000, actualAmount: 300000, isEstimate: false },
    { id: "c1", category: "catering", label: "Grand Buffet (200 Pax)", allocatedAmount: 260000, actualAmount: 260000, isEstimate: false },
    { id: "d1", category: "decor", label: "Mandap & Floral Stage", allocatedAmount: 120000, actualAmount: 120000, isEstimate: false },
    { id: "p1", category: "photography", label: "Candid Cinema", allocatedAmount: 80000, actualAmount: 80000, isEstimate: false },
    { id: "l1", category: "logistics", label: "Guest Shuttles & Valet", allocatedAmount: 25000, actualAmount: 25000, isEstimate: false },
    { id: "m1", category: "miscellaneous", label: "Puja Buffer", allocatedAmount: 15000, actualAmount: 15000, isEstimate: false }
  ];

  const mockMilestones: MilestoneTask[] = [
    { id: "t1", title: "Book Venue", deadlineDaysBeforeEvent: 90, category: "venue", dependsOn: [], status: "completed", urgency: "critical" },
    { id: "t2", title: "Menu Tasting", deadlineDaysBeforeEvent: 60, category: "catering", dependsOn: ["t1"], status: "in_progress", urgency: "critical" },
    { id: "t3", title: "Stage Floral Blueprint", deadlineDaysBeforeEvent: 45, category: "decor", dependsOn: ["t1"], status: "pending", urgency: "medium" },
    { id: "t4", title: "Guest Shuttle Schedule", deadlineDaysBeforeEvent: 14, category: "logistics", dependsOn: ["t2"], status: "pending", urgency: "low" }
  ];

  // 1. Variable vs. Fixed Scaling
  it("scales catering and logistics linearly while keeping venue, decor, and photography invariant", () => {
    // 200 -> 300 (+50%)
    const scaled = scaleBudgetCategories(mockBudget, 300, 200);

    const catering = scaled.find((c) => c.category === "catering")?.allocatedAmount;
    const logistics = scaled.find((c) => c.category === "logistics")?.allocatedAmount;
    const venue = scaled.find((c) => c.category === "venue")?.allocatedAmount;
    const decor = scaled.find((c) => c.category === "decor")?.allocatedAmount;
    const photography = scaled.find((c) => c.category === "photography")?.allocatedAmount;

    // 260,000 * 1.5 = 390,000
    expect(catering).toBe(390000);
    // 25,000 * 1.5 = 37,500
    expect(logistics).toBe(37500);
    // Invariants
    expect(venue).toBe(300000);
    expect(decor).toBe(120000);
    expect(photography).toBe(80000);
  });

  // 2. Kahn's Topological Sort & Critical Bottlenecks
  it("sorts milestones via Kahn's algorithm and flags tasks where deadline > daysRemaining", () => {
    // Only 30 days remaining; task t3 has deadline 45 days before event and is uncompleted
    const dag = resolveMilestoneDAG(mockMilestones, 30);
    expect(dag.topologicalOrder.indexOf("t1")).toBeLessThan(dag.topologicalOrder.indexOf("t2"));
    expect(dag.bottlenecks).toContain("t3");
    expect(dag.isCyclic).toBe(false);
  });

  // 3. Deterministic Rule-Based Vendor Pre-Auditor (5 Mandatory Indian Clauses)
  it("pre-audits raw vendor notes and flags all 5 missing clauses with top 3 negotiation questions", () => {
    const rawNote = "Decor quotation: Stage backdrop and mandap floral arrangement for Rs. 1,20,000.";
    const audit = preAuditVendorQuote(rawNote);

    expect(audit.quotedAmount).toBe(120000);
    expect(audit.inclusions).toContain("Stage & Entrance Decor");

    // 5 Mandatory Indian event inclusions
    const hasGstFlag = audit.hiddenCostRisks.some((c) => c.toLowerCase().includes("gst"));
    const hasGeneratorFlag = audit.hiddenCostRisks.some((c) => c.toLowerCase().includes("generator"));
    const hasCleaningFlag = audit.hiddenCostRisks.some((c) => c.toLowerCase().includes("cleaning"));
    const hasOvertimeFlag = audit.hiddenCostRisks.some((c) => c.toLowerCase().includes("overtime"));
    const hasAdvanceFlag = audit.hiddenCostRisks.some((c) => c.toLowerCase().includes("advance"));

    expect(hasGstFlag).toBe(true);
    expect(hasGeneratorFlag).toBe(true);
    expect(hasCleaningFlag).toBe(true);
    expect(hasOvertimeFlag).toBe(true);
    expect(hasAdvanceFlag).toBe(true);

    // Exactly 3 negotiation questions
    expect(audit.negotiationQuestions.length).toBe(3);
    expect(audit.provenance).toBe("fallback");
  });

  // 4. Deterministic Trade-Off Generator (3 Options: Experience First, Strict Budget Cap, Guest Trim)
  it("computes 3 structured trade-off options in <5ms matching the required archetypes", () => {
    const start = performance.now();
    const scaled = scaleBudgetCategories(mockBudget, 200, 200);
    const options: TradeoffOption[] = generateDeterministicTradeoffs(60000, scaled);
    const duration = performance.now() - start;

    expect(duration).toBeLessThan(5);
    expect(options.length).toBe(3);

    // Verify Titles contain the 3 archetypes
    expect(options[0].strategyTitle).toContain("Experience First");
    expect(options[1].strategyTitle).toContain("Strict Budget Cap");
    expect(options[2].strategyTitle).toContain("Guest Trim");

    // Option 1 protects food and trims decor
    expect(options[0].adjustments.some((a) => a.category === "decor")).toBe(true);
    // Option 2 rationalizes catering
    expect(options[1].adjustments.some((a) => a.category === "catering")).toBe(true);
    // Option 3 tunes logistics & photography
    expect(options[2].adjustments.some((a) => a.category === "logistics")).toBe(true);
  });

  // 5. Action Dispatchers (RFC 5545 .ics Calendar & Numbered WhatsApp Links)
  it("generates RFC 5545 .ics calendar and pre-populated numbered WhatsApp negotiation links", () => {
    const ics = generateIcsCalendar(mockMilestones, "2026-12-15T00:00:00Z", "Sharma Sangeet");
    expect(ics).toContain("BEGIN:VCALENDAR");
    expect(ics).toContain("SUMMARY:[Sharma Sangeet] Book Venue");
    expect(ics).toContain("END:VCALENDAR");

    const questions = [
      "Does this quote include 18% GST?",
      "Are backup generator fuel charges included?",
      "What is the hall deep cleaning deposit?"
    ];
    const waLink = generateWhatsAppLink("9876543210", questions, "Sharmaji Caterers");
    expect(waLink).toContain("https://wa.me/9876543210?text=");
    expect(decodeURIComponent(waLink)).toContain("1. Does this quote include 18% GST?");
    expect(decodeURIComponent(waLink)).toContain("2. Are backup generator fuel charges included?");
    expect(decodeURIComponent(waLink)).toContain("3. What is the hall deep cleaning deposit?");
  });
});
