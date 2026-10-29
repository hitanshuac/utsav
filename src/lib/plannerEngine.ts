/**
 * UtsavAI — Deterministic Planning Engine
 * Single Source of Truth for:
 * 1. Budget summation, variance calculation & variable guest scaling
 * 2. Kahn's topological sort for milestone DAG & bottleneck detection
 * 3. Offline deterministic trade-off strategy generation (<10ms)
 * 4. Deterministic vendor note quote parsing & hidden-cost identification
 * 5. RFC 5545 iCalendar (.ics) generation & wa.me sanitization
 */

import {
  BudgetItem,
  MilestoneTask,
  EventPlanInput,
  PlannerEvaluationResult,
  ScaledCategory,
  TradeoffStrategy,
  VendorAuditResult,
  EventCategory,
  PlanningTriageTier
} from "../types/planner";

/**
 * Category scaling configuration.
 * Catering and logistics scale with guest headcount; venue and photography remain fixed.
 */
export const VARIABLE_CATEGORIES: ReadonlySet<EventCategory> = new Set([
  "catering",
  "logistics"
]);

/**
 * Scales budget items dynamically based on guest count ratio.
 */
export function scaleBudgetCategories(
  budgetItems: BudgetItem[],
  guestCount: number,
  baseGuestCount: number
): ScaledCategory[] {
  const safeBase = Math.max(1, baseGuestCount);
  const safeCurrent = Math.max(1, guestCount);
  const ratio = safeCurrent / safeBase;

  const categoryMap = new Map<EventCategory, { total: number; isVariable: boolean }>();

  for (const item of budgetItems) {
    const isVar = VARIABLE_CATEGORIES.has(item.category);
    const scaledAmount = isVar ? Math.round(item.allocatedAmount * ratio) : item.allocatedAmount;

    const existing = categoryMap.get(item.category);
    if (existing) {
      existing.total += scaledAmount;
    } else {
      categoryMap.set(item.category, { total: scaledAmount, isVariable: isVar });
    }
  }

  const result: ScaledCategory[] = [];
  categoryMap.forEach((val, category) => {
    result.push({
      category,
      allocatedAmount: val.total,
      isVariable: val.isVariable
    });
  });

  return result;
}

/**
 * Computes exact budget variance and financial triage status.
 */
export function computeBudgetTotals(scaledCategories: ScaledCategory[], budgetCap: number) {
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

/**
 * Topological Sort & Dependency Resolution using Kahn's Algorithm.
 * Identifies critical-path bottlenecks and handles cyclic dependencies gracefully.
 */
export function resolveMilestoneDAG(
  milestones: MilestoneTask[],
  daysRemaining: number
): {
  topologicalOrder: string[];
  bottlenecks: string[];
  isCyclic: boolean;
} {
  const taskMap = new Map<string, MilestoneTask>();
  const inDegree = new Map<string, number>();
  const adjList = new Map<string, string[]>();

  for (const task of milestones) {
    taskMap.set(task.id, task);
    inDegree.set(task.id, 0);
    adjList.set(task.id, []);
  }

  // Build graph: task.dependsOn contains prerequisite task IDs.
  // Edge: prerequisite -> task
  for (const task of milestones) {
    for (const prereqId of task.dependsOn) {
      if (taskMap.has(prereqId)) {
        adjList.get(prereqId)!.push(task.id);
        inDegree.set(task.id, (inDegree.get(task.id) || 0) + 1);
      }
    }
  }

  // Queue tasks with 0 dependencies
  const queue: string[] = [];
  inDegree.forEach((deg, id) => {
    if (deg === 0) queue.push(id);
  });

  const sortedOrder: string[] = [];
  while (queue.length > 0) {
    const current = queue.shift()!;
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

  // In case of cycles, append unvisited nodes by deadline so execution doesn't halt
  if (isCyclic) {
    const visited = new Set(sortedOrder);
    const unvisited = milestones
      .filter((t) => !visited.has(t.id))
      .sort((a, b) => b.deadlineDaysBeforeEvent - a.deadlineDaysBeforeEvent);
    for (const u of unvisited) {
      sortedOrder.push(u.id);
    }
  }

  // Detect critical path bottlenecks
  const bottlenecks: string[] = [];
  for (const task of milestones) {
    const leadTime = task.leadTimeDays || task.deadlineDaysBeforeEvent;
    if (leadTime > daysRemaining && task.status !== "completed") {
      bottlenecks.push(task.id);
    }
  }

  return {
    topologicalOrder: sortedOrder,
    bottlenecks,
    isCyclic
  };
}

/**
 * Top-level deterministic event evaluation.
 */
export function evaluateEventPlan(input: EventPlanInput): PlannerEvaluationResult {
  const scaledCategories = scaleBudgetCategories(
    input.budgetItems,
    input.guestCount,
    input.baseGuestCount
  );

  const budget = computeBudgetTotals(scaledCategories, input.totalBudgetCap);
  const dag = resolveMilestoneDAG(input.milestones, input.daysRemaining);

  // Determine Triage Tier
  let triageTier: PlanningTriageTier = "ON_TRACK";
  if (budget.isOverrun) {
    triageTier = "CRITICAL_OVERRUN";
  } else if (dag.bottlenecks.length > 0) {
    triageTier = "TIMELINE_BOTTLENECK";
  } else {
    const hasUnverifiedQuote = input.budgetItems.some((item) => item.isEstimate);
    if (hasUnverifiedQuote) {
      triageTier = "VENDOR_CLARIFICATION";
    }
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
    evaluationTimestamp: new Date().toISOString()
  };
}

/**
 * Offline Deterministic Trade-Off Strategy Generator.
 * Provides instant (<5ms) balanced compromise proposals without needing Gemini API.
 */
export function generateDeterministicTradeoffs(
  deficit: number,
  scaledCategories: ScaledCategory[],
  _vibe?: string
): TradeoffStrategy[] {
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
  const misc = scaledCategories.find((c) => c.category === "miscellaneous")?.allocatedAmount || 0;
  const catering = scaledCategories.find((c) => c.category === "catering")?.allocatedAmount || 0;
  const photo = scaledCategories.find((c) => c.category === "photography")?.allocatedAmount || 0;

  const strategies: TradeoffStrategy[] = [];

  // Strategy 1: Balanced Prudent Trim (Spread across Decor & Misc)
  const trimDecor = Math.min(Math.round(deficit * 0.6), Math.round(decor * 0.3));
  const trimMisc = Math.min(Math.round(deficit * 0.4), Math.round(misc * 0.5));
  strategies.push({
    strategyTitle: "Prudent Aesthetic Trim (Decor & Contingency)",
    description: "Preserve catering and venue excellence while consolidating decorative floral setups and trimming discretionary miscellaneous buffers.",
    adjustments: [
      {
        category: "decor",
        delta: -trimDecor,
        rationale: "Opt for seasonal local marigolds and minimal entrance arches rather than imported exotic blooms."
      },
      {
        category: "miscellaneous",
        delta: -trimMisc,
        rationale: "Tighten discretionary emergency buffer to meet strict budget cap."
      }
    ]
  });

  // Strategy 2: Per-Plate & Menu Course Optimization
  const trimCatering = Math.min(Math.round(deficit * 0.7), Math.round(catering * 0.18));
  strategies.push({
    strategyTitle: "Menu Rationalization (Streamlined Counters)",
    description: "Streamline live chaat counters from 6 to 4 and replace imported dessert selections with signature Indian classics.",
    adjustments: [
      {
        category: "catering",
        delta: -trimCatering,
        rationale: "Reduce 2 live appetizer counters, saving ₹150-₹250 per plate without affecting main feast quality."
      },
      {
        category: "decor",
        delta: -(deficit - trimCatering),
        rationale: "Absorb remaining variance through stage backdrop simplification."
      }
    ]
  });

  // Strategy 3: Digital Media & Photography Package Tuning
  const trimPhoto = Math.min(Math.round(deficit * 0.5), Math.round(photo * 0.25));
  strategies.push({
    strategyTitle: "Digital Deliverables Consolidation",
    description: "Retain traditional cinema capture while replacing physical velvet heirloom albums with high-res digital cloud delivery.",
    adjustments: [
      {
        category: "photography",
        delta: -trimPhoto,
        rationale: "Remove 2 printed heavy coffee-table albums and deliver 4K digital gallery link."
      },
      {
        category: "miscellaneous",
        delta: -(deficit - trimPhoto),
        rationale: "Rebalance residual deficit from event miscellaneous buffer."
      }
    ]
  });

  return strategies;
}

/**
 * Lightweight Text-Only Vendor Quote Auditor (Offline Deterministic Fallback).
 * Detects missing GST, fuel generator surcharges, security deposits, and generates 3 targeted negotiation questions.
 */
export function auditVendorQuoteOffline(vendorNote: string): VendorAuditResult {
  const lower = vendorNote.toLowerCase();

  // Extract rough quoted amount via regex
  const amountMatch = vendorNote.match(/(?:rs\.?|inr|₹)\s*([\d,]+)/i) || vendorNote.match(/([\d,]+)\s*(?:rs|inr|\/-)/i);
  let quotedAmount = 0;
  if (amountMatch) {
    quotedAmount = parseInt(amountMatch[1].replace(/,/g, ""), 10) || 0;
  }

  const detectedInclusions: string[] = [];
  const flaggedHiddenCosts: string[] = [];
  const negotiationQuestions: string[] = [];

  // Inclusions detection
  if (
    lower.includes("food") ||
    lower.includes("plate") ||
    lower.includes("menu") ||
    lower.includes("cater") ||
    lower.includes("buffet") ||
    lower.includes("chaat")
  ) {
    detectedInclusions.push("Feast & Menu Service");
  }
  if (lower.includes("decor") || lower.includes("flower") || lower.includes("stage")) detectedInclusions.push("Stage & Entrance Decor");
  if (lower.includes("photo") || lower.includes("video") || lower.includes("album")) detectedInclusions.push("Photography & Videography");
  if (lower.includes("sound") || lower.includes("dj") || lower.includes("mic")) detectedInclusions.push("Sound & Acoustic Setup");
  if (detectedInclusions.length === 0) detectedInclusions.push("Standard Service Scope");

  // Hidden costs checks
  if (!lower.includes("gst") && !lower.includes("tax")) {
    flaggedHiddenCosts.push("GST (18%) not mentioned — potential +18% invoice surprise");
    negotiationQuestions.push("Does your quoted figure include 18% GST, or will taxes be billed additionally?");
  }
  if (!lower.includes("generator") && !lower.includes("genset") && !lower.includes("diesel")) {
    flaggedHiddenCosts.push("Generator/DG fuel charges unlisted (common ₹15,000–₹25,000 add-on)");
    negotiationQuestions.push("Are backup generator fuel running hours included in this quote or charged per hour?");
  }
  if (!lower.includes("cleaning") && !lower.includes("housekeeping") && !lower.includes("trash")) {
    flaggedHiddenCosts.push("Post-event venue trash disposal & deep cleaning deposit omitted");
    negotiationQuestions.push("Who is responsible for post-event hall cleaning and waste clearance fees?");
  }

  // Ensure 3 questions
  while (negotiationQuestions.length < 3) {
    negotiationQuestions.push("What is the refund and cancellation policy if event dates shift by 14 days?");
  }

  return {
    vendorName: "Audited Vendor Quotation",
    quotedAmount,
    detectedInclusions,
    flaggedHiddenCosts,
    negotiationQuestions: negotiationQuestions.slice(0, 3),
    provenance: "fallback"
  };
}

/**
 * RFC 5545 iCalendar (.ics) Generator for Milestone Deadlines.
 */
export function generateIcsCalendar(
  milestones: MilestoneTask[],
  eventDateStr: string,
  eventTitle: string
): string {
  const eventDate = new Date(eventDateStr);
  const nowStr = new Date().toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";

  let ics = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//UtsavAI//Event Planner Execution Engine//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH"
  ];

  for (const task of milestones) {
    const taskDate = new Date(eventDate.getTime() - task.deadlineDaysBeforeEvent * 86400000);
    const dateFormatted = taskDate.toISOString().split("T")[0].replace(/-/g, "");

    ics.push(
      "BEGIN:VEVENT",
      `UID:utsav-${task.id}-${dateFormatted}@utsavai.org`,
      `DTSTAMP:${nowStr}`,
      `DTSTART;VALUE=DATE:${dateFormatted}`,
      `SUMMARY:[${eventTitle}] ${task.title}`,
      `DESCRIPTION:UtsavAI Milestone Task\\nCategory: ${task.category}\\nUrgency: ${task.urgency}\\nStatus: ${task.status}`,
      `STATUS:${task.status === "completed" ? "CONFIRMED" : "TENTATIVE"}`,
      "END:VEVENT"
    );
  }

  ics.push("END:VCALENDAR");
  return ics.join("\r\n");
}

/**
 * Sanitizes and generates WhatsApp direct negotiation link.
 */
export function generateWhatsAppLink(phoneNumber: string, message: string): string {
  const cleanPhone = phoneNumber.replace(/[^\d]/g, "");
  const encodedText = encodeURIComponent(message.trim());
  return cleanPhone
    ? `https://wa.me/${cleanPhone}?text=${encodedText}`
    : `https://wa.me/?text=${encodedText}`;
}
