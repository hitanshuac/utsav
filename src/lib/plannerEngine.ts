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
  TradeoffOption,
  VendorAuditResult,
  EventCategory,
  PlanningTriageTier
} from "../types/planner";
import { generateIcsCalendar, generateWhatsAppLink } from "./actionDispatchers";
import { sortMilestonesTopologically } from "./engine/dependency-graph";

export { generateIcsCalendar, generateWhatsAppLink, sortMilestonesTopologically };

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
 * Variable categories (catering, logistics) scale with guest count delta;
 * fixed categories (venue, photography, decor) remain invariant.
 *
 * @param budgetItems - Initial list of allocated category budget items
 * @param guestCount - Current/revised total guest headcount
 * @param baseGuestCount - Baseline headcount from initial plan
 * @returns Array of scaled category allocations
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
 *
 * @param scaledCategories - Array of category items with allocated amounts
 * @param budgetCap - Authorized total budget ceiling in INR
 * @returns Financial breakdown containing totalAllocated, variance, and overrunAmount
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
 *
 * @param milestones - Milestone task list with dependencies
 * @param daysRemaining - Days remaining until the event execution date
 * @returns Resolved topological execution order, bottleneck task IDs, and cycle status
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

/**
 * Computes deterministic 0-100 continuous Urgency Score per PRODUCT_SPEC.md.
 *
 * @param totalAllocated - Current sum of category allocations in INR
 * @param budgetCap - Authorized budget ceiling in INR
 * @param bottlenecks - Array of milestone task IDs flagged as bottlenecks
 * @param unverifiedCount - Number of budget items retaining isEstimate: true
 * @param maxLeadTimeDeficitDays - Maximum deadline gap in days (default: 0)
 * @returns Numeric urgency score bounded between 0 and 100
 */
export function computeUrgencyScore(
  totalAllocated: number,
  budgetCap: number,
  bottlenecks: string[],
  unverifiedCount: number,
  maxLeadTimeDeficitDays: number = 0
): number {
  const overrun = totalAllocated - budgetCap;

  // Tier 1: CRITICAL_OVERRUN (Score 85 - 100)
  if (overrun > 0) {
    const overrunPercent = budgetCap > 0 ? (overrun / budgetCap) * 100 : 100;
    return Math.min(100, Math.round(85 + (Math.min(overrunPercent, 25) / 25) * 15));
  }

  // Tier 2: TIMELINE_BOTTLENECK (Score 65 - 84)
  if (bottlenecks.length > 0) {
    const deficitScale = Math.min(Math.max(1, maxLeadTimeDeficitDays), 30) / 30;
    return Math.min(84, Math.round(65 + deficitScale * 19));
  }

  // Tier 3: VENDOR_CLARIFICATION (Score 40 - 64)
  if (unverifiedCount > 0) {
    return Math.min(64, 40 + unverifiedCount * 5);
  }

  // Tier 4: ON_TRACK (Score 0 - 39)
  const utilization = budgetCap > 0 ? Math.min(1, totalAllocated / budgetCap) : 0;
  return Math.round(utilization * 35);
}

/**
 * Top-level deterministic event evaluation engine.
 * Single source of truth for budget scaling, DAG ordering, and triage tier calculation.
 *
 * @param input - Complete event planning input containing items and milestones
 * @returns Comprehensive evaluation result with triage tier, metrics, and sorted DAG
 */
export function evaluateEventPlan(input: EventPlanInput): PlannerEvaluationResult {
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

  // Determine Triage Tier strictly from Urgency Score bands
  let triageTier: PlanningTriageTier = "ON_TRACK";
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
    evaluationTimestamp: new Date().toISOString(),
    urgencyScore
  };
}

/**
 * Offline Deterministic Trade-Off Strategy Generator.
 * Computes 3 mathematical trade-off options in <5ms ("Experience First", "Strict Budget Cap", "Guest Trim")
 * so the app functions 100% offline without an API key.
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

/**
 * Deterministic Rule-Based Vendor Pre-Auditor.
 * Before any LLM call, scans raw vendor text notes for 5 mandatory Indian event inclusions:
 * 1. GST / taxes
 * 2. Generator / power backup
 * 3. Cleaning / porterage
 * 4. Overtime rates
 * 5. Advance deposit %
 *
 * @param vendorNote - Raw plain-text quotation, invoice breakdown, or message
 * @returns Normalized vendor audit result with inclusions, hidden costs, and negotiation questions
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

  // 1. Mandatory Check: GST / Taxes
  if (!lower.includes("gst") && !lower.includes("tax")) {
    flaggedHiddenCosts.push("GST (18%) not mentioned — potential +18% invoice surprise");
    negotiationQuestions.push("Does your quoted figure include 18% GST, or will taxes be billed additionally?");
  }

  // 2. Mandatory Check: Generator / Power Backup
  if (!lower.includes("generator") && !lower.includes("genset") && !lower.includes("diesel") && !lower.includes("power backup") && !lower.includes("dg")) {
    flaggedHiddenCosts.push("Generator/DG fuel charges unlisted (common ₹15,000–₹25,000 add-on)");
    negotiationQuestions.push("Are backup generator fuel running hours included in this quote or charged per hour?");
  }

  // 3. Mandatory Check: Cleaning / Porterage
  if (!lower.includes("cleaning") && !lower.includes("housekeeping") && !lower.includes("trash") && !lower.includes("porterage") && !lower.includes("waste")) {
    flaggedHiddenCosts.push("Post-event venue trash disposal & deep cleaning deposit omitted");
    negotiationQuestions.push("Who is responsible for post-event hall cleaning and waste clearance fees?");
  }

  // 4. Mandatory Check: Overtime Rates
  if (!lower.includes("overtime") && !lower.includes("extra hour") && !lower.includes("curfew") && !lower.includes("late night")) {
    flaggedHiddenCosts.push("Overtime/midnight curfew charges unstated (applicable after 11 PM)");
    if (negotiationQuestions.length < 3) {
      negotiationQuestions.push("What is your hourly overtime rate if celebrations extend past midnight?");
    }
  }

  // 5. Mandatory Check: Advance Deposit %
  if (!lower.includes("advance") && !lower.includes("deposit") && !lower.includes("token") && !lower.includes("payment schedule")) {
    flaggedHiddenCosts.push("Advance deposit % and milestone payment schedule not formalized");
    if (negotiationQuestions.length < 3) {
      negotiationQuestions.push("What is the advance token deposit percentage and payment milestone schedule?");
    }
  }

  // Ensure exactly 3 negotiation questions
  while (negotiationQuestions.length < 3) {
    negotiationQuestions.push("What is the refund and cancellation policy if event dates shift by 14 days?");
  }

  const finalQuestions = negotiationQuestions.slice(0, 3);

  return {
    vendorName: "Audited Vendor Quotation",
    quotedAmount,
    detectedInclusions,
    inclusions: detectedInclusions,
    flaggedHiddenCosts,
    hiddenCostRisks: flaggedHiddenCosts,
    negotiationQuestions: finalQuestions,
    provenance: "fallback"
  };
}

export const preAuditVendorQuote = auditVendorQuoteOffline;

/**
 * Custom Event Guided Intake — Deterministic Budget & DAG Generator.
 * Generates a customized 6-category budget allocation and 6-step milestone DAG
 * based on user inputs, boosting the selected Must-Have category by +10%.
 * Execution time: <5ms deterministic.
 */
export type OccasionType =
  | "Wedding"
  | "Milestone Birthday / Anniversary"
  | "Cultural / Community Fest"
  | "Corporate / Retreat";

export type MustHavePriority =
  | "Food & Catering"
  | "Venue & Comfort"
  | "Decor & Ambience"
  | "Photography & Memories";

export type DietaryProfile =
  | "Standard Multi-Cuisine"
  | "Jain (No Onion/Garlic)"
  | "Vegan / Plant-Based"
  | "Traditional Regional";

export type GuestAccessibility =
  | "Standard Seating"
  | "Children + Senior Citizen Friendly (Ramps & Rest Zones)"
  | "Full Wheelchair & Assisted Mobility";

export interface CustomEventInput {
  eventTitle: string;
  occasionType: OccasionType;
  totalBudgetCap: number;
  guestCount: number;
  daysUntilEvent: number;
  priorityVibe: "Experience First" | "Budget Strict" | "Balanced";
  mustHavePriority: MustHavePriority;
  dietaryProfile?: DietaryProfile;
  guestAccessibility?: GuestAccessibility;
}

export type CustomEventIntakeInput = CustomEventInput;

/** Maps Must-Have Priority selection to the budget category that receives the +10% boost. */
const MUST_HAVE_TO_CATEGORY: Record<MustHavePriority, EventCategory> = {
  "Food & Catering": "catering",
  "Venue & Comfort": "venue",
  "Decor & Ambience": "decor",
  "Photography & Memories": "photography"
};

/** Baseline allocation ratios for each occasion type (must sum to 1.0). */
const OCCASION_RATIOS: Record<OccasionType, Record<EventCategory, number>> = {
  Wedding: { venue: 0.30, catering: 0.30, decor: 0.15, photography: 0.12, logistics: 0.08, miscellaneous: 0.05 },
  "Milestone Birthday / Anniversary": { venue: 0.25, catering: 0.30, decor: 0.15, photography: 0.15, logistics: 0.08, miscellaneous: 0.07 },
  "Cultural / Community Fest": { venue: 0.20, catering: 0.35, decor: 0.12, photography: 0.08, logistics: 0.18, miscellaneous: 0.07 },
  "Corporate / Retreat": { venue: 0.30, catering: 0.25, decor: 0.10, photography: 0.10, logistics: 0.18, miscellaneous: 0.07 }
};

/** Maps occasion type to relevant milestone templates. */
const OCCASION_MILESTONES: Record<OccasionType, Array<{ suffix: string; category: EventCategory; deadlineRatio: number; urgency: "low" | "medium" | "critical" }>> = {
  Wedding: [
    { suffix: "Lock Venue & Sign Agreement", category: "venue", deadlineRatio: 0.75, urgency: "critical" },
    { suffix: "Finalize Caterer & Menu Tasting", category: "catering", deadlineRatio: 0.50, urgency: "critical" },
    { suffix: "Approve Decor & Floral Design", category: "decor", deadlineRatio: 0.38, urgency: "medium" },
    { suffix: "Confirm Photography & Cinema Crew", category: "photography", deadlineRatio: 0.25, urgency: "medium" },
    { suffix: "Dispatch Guest Transport Roster", category: "logistics", deadlineRatio: 0.12, urgency: "medium" },
    { suffix: "Final Headcount & Handover Briefing", category: "catering", deadlineRatio: 0.05, urgency: "critical" }
  ],
  "Milestone Birthday / Anniversary": [
    { suffix: "Book Venue & Reserve Date", category: "venue", deadlineRatio: 0.70, urgency: "critical" },
    { suffix: "Confirm Multi-Course Menu", category: "catering", deadlineRatio: 0.45, urgency: "critical" },
    { suffix: "Design Nostalgia Photo Wall", category: "decor", deadlineRatio: 0.35, urgency: "medium" },
    { suffix: "Schedule Portrait & Film Session", category: "photography", deadlineRatio: 0.25, urgency: "medium" },
    { suffix: "Arrange Guest Welcome & Sound", category: "logistics", deadlineRatio: 0.12, urgency: "low" },
    { suffix: "Final Guest RSVP & Favors Prep", category: "miscellaneous", deadlineRatio: 0.05, urgency: "medium" }
  ],
  "Cultural / Community Fest": [
    { suffix: "Obtain Municipal Permit & NOC", category: "venue", deadlineRatio: 0.80, urgency: "critical" },
    { suffix: "Lock Bulk Caterer Contract", category: "catering", deadlineRatio: 0.50, urgency: "critical" },
    { suffix: "Erect Stage & PA Sound Rig", category: "decor", deadlineRatio: 0.35, urgency: "critical" },
    { suffix: "Inspect Generator & Power Grid", category: "logistics", deadlineRatio: 0.20, urgency: "critical" },
    { suffix: "Assign Volunteer Crew Roster", category: "logistics", deadlineRatio: 0.12, urgency: "medium" },
    { suffix: "Final Community Headcount Check", category: "catering", deadlineRatio: 0.04, urgency: "critical" }
  ],
  "Corporate / Retreat": [
    { suffix: "Reserve Conference Venue", category: "venue", deadlineRatio: 0.70, urgency: "critical" },
    { suffix: "Confirm Catering & Dietary Menus", category: "catering", deadlineRatio: 0.45, urgency: "critical" },
    { suffix: "Setup AV & Projection Equipment", category: "decor", deadlineRatio: 0.30, urgency: "medium" },
    { suffix: "Book Event Photographer", category: "photography", deadlineRatio: 0.20, urgency: "low" },
    { suffix: "Arrange Team Transport & Parking", category: "logistics", deadlineRatio: 0.12, urgency: "medium" },
    { suffix: "Distribute Agenda & Name Badges", category: "miscellaneous", deadlineRatio: 0.05, urgency: "low" }
  ]
};

export interface CustomEventResult {
  budget: BudgetItem[];
  budgetItems: BudgetItem[];
  milestones: MilestoneTask[];
}

/**
 * Custom Event Guided Intake — Deterministic Budget & DAG Generator.
 * Generates a customized 6-category budget allocation and 6-step milestone DAG
 * based on user inputs, boosting the selected Must-Have category by +10%
 * and embedding dietary profile and guest accessibility requirements.
 *
 * @param input - Custom event intake parameters including occasion, budget, pax, and needs
 * @returns Complete custom budget items and sequenced milestone DAG
 */
export function generateCustomEventPlan(input: CustomEventInput): CustomEventResult {
  const baseRatios = { ...OCCASION_RATIOS[input.occasionType] };
  const boostCategory = MUST_HAVE_TO_CATEGORY[input.mustHavePriority];

  // Apply +10% boost to the must-have category, proportionally reduce others
  const boostAmount = 0.10;
  const originalBoostRatio = baseRatios[boostCategory];
  const newBoostRatio = Math.min(0.60, originalBoostRatio + boostAmount);
  const actualBoost = newBoostRatio - originalBoostRatio;

  // Proportionally reduce remaining categories
  const otherCategories = (Object.keys(baseRatios) as EventCategory[]).filter(c => c !== boostCategory);
  const otherSum = otherCategories.reduce((s, c) => s + baseRatios[c], 0);

  const adjustedRatios: Record<EventCategory, number> = { ...baseRatios };
  adjustedRatios[boostCategory] = newBoostRatio;
  for (const cat of otherCategories) {
    adjustedRatios[cat] = baseRatios[cat] - (baseRatios[cat] / otherSum) * actualBoost;
  }

  // Generate budget items
  const categories: EventCategory[] = ["venue", "catering", "decor", "photography", "logistics", "miscellaneous"];
  const categoryLabels: Record<EventCategory, string> = {
    venue: "Event Venue & Space",
    catering: `Feast & Dining (${input.guestCount} pax)`,
    decor: "Stage, Decor & Ambience",
    photography: "Photography & Memories",
    logistics: "Logistics & Transport",
    miscellaneous: "Emergency Buffer & Extras"
  };

  const budgetItems: BudgetItem[] = categories.map((cat, idx) => {
    const allocatedAmount = Math.round(input.totalBudgetCap * adjustedRatios[cat]);
    let notes = cat === boostCategory ? `+10% Must-Have boost applied (${input.mustHavePriority})` : "AI-generated estimate";
    if (cat === "catering" && input.dietaryProfile) {
      notes += ` · Dietary: ${input.dietaryProfile}`;
    }
    if (cat === "logistics" && input.guestAccessibility) {
      notes += ` · Accessibility: ${input.guestAccessibility}`;
    }
    return {
      id: `custom-${idx + 1}`,
      category: cat,
      label: categoryLabels[cat],
      allocatedAmount,
      actualAmount: 0,
      isEstimate: true,
      notes
    };
  });

  // Guarantee exact penny matching with zero rounding drift
  const currentSum = budgetItems.reduce((acc, curr) => acc + curr.allocatedAmount, 0);
  const diff = input.totalBudgetCap - currentSum;
  if (diff !== 0 && budgetItems.length > 0) {
    budgetItems[0].allocatedAmount += diff;
  }

  // Generate milestone DAG
  const milestoneTemplates = OCCASION_MILESTONES[input.occasionType];
  const milestones: MilestoneTask[] = milestoneTemplates.map((tmpl, idx) => {
    const deadlineDays = Math.max(1, Math.round(input.daysUntilEvent * tmpl.deadlineRatio));
    return {
      id: `cm-${idx + 1}`,
      title: tmpl.suffix,
      deadlineDaysBeforeEvent: deadlineDays,
      category: tmpl.category,
      dependsOn: idx === 0 ? [] : [`cm-${idx}`],
      status: "pending" as const,
      urgency: tmpl.urgency,
      leadTimeDays: deadlineDays
    };
  });

  return { budget: budgetItems, budgetItems, milestones };
}
