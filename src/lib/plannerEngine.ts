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
  EventCategory,
  PlanningTriageTier
} from "../types/planner";
import { generateIcsCalendar, generateWhatsAppLink } from "./actionDispatchers";
import { sortMilestonesTopologically, resolveMilestoneDAG } from "./engine/dependency-graph";
import { generateDeterministicTradeoffs } from "./engine/tradeoffs";
import { auditVendorQuoteOffline, preAuditVendorQuote } from "./engine/vendor-audit";
import {
  generateCustomEventPlan,
  OccasionType,
  MustHavePriority,
  DietaryProfile,
  GuestAccessibility,
  CustomEventInput,
  CustomEventIntakeInput,
  CustomEventResult
} from "./engine/custom-intake";

export {
  generateIcsCalendar,
  generateWhatsAppLink,
  sortMilestonesTopologically,
  resolveMilestoneDAG,
  generateDeterministicTradeoffs,
  auditVendorQuoteOffline,
  preAuditVendorQuote,
  generateCustomEventPlan
};

export type {
  OccasionType,
  MustHavePriority,
  DietaryProfile,
  GuestAccessibility,
  CustomEventInput,
  CustomEventIntakeInput,
  CustomEventResult
};

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
    const rawAllocated =
      typeof item.allocatedAmount === "number" && !isNaN(item.allocatedAmount)
        ? item.allocatedAmount
        : item.actualAmount || 0;
    const scaledAmount = isVar ? Math.round(rawAllocated * ratio) : rawAllocated;

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
