/**
 * Custom hook managing plan mutations: custom event intake, budget top-up, trade-offs, and mid-flight revisions.
 */
import { evaluateEventPlan } from "../lib/plannerEngine";
import {
  BudgetItem,
  MilestoneTask,
  TradeoffStrategy,
  TradeoffAdjustment,
  PlannerEvaluationResult,
  PersonaLens
} from "../types/planner";
import { logActivityEvent } from "../lib/services/event-logger";
import { ClosedLoopNotice } from "../components/sections/BudgetSection";
import { ActionDiffRow } from "../components/ActionDiffModal";

interface UsePlanMutationsParams {
  preset: {
    eventTitle: string;
    persona: PersonaLens;
    guestCount: number;
    baseGuestCount: number;
    budgetCap: number;
    daysRemaining: number;
    budgetItems: BudgetItem[];
    milestones: MilestoneTask[];
    setEventTitle: (t: string) => void;
    setBudgetCap: (c: number) => void;
    setGuestCount: (g: number) => void;
    setBaseGuestCount: (bg: number) => void;
    setDaysRemaining: (d: number) => void;
    setBudgetItems: (b: BudgetItem[]) => void;
    setMilestones: (m: MilestoneTask[]) => void;
  };
  evaluation: PlannerEvaluationResult;
  setClosedLoopNotice: (notice: ClosedLoopNotice | null) => void;
  triggerActionDiff: (params: {
    actionName: string;
    title: string;
    explanation: string;
    recommendedNextStep?: string;
    deltas: ActionDiffRow[];
    beforeEvaluation: PlannerEvaluationResult;
    afterEvaluation: PlannerEvaluationResult;
  }) => void;
}

export function usePlanMutations({
  preset,
  evaluation,
  setClosedLoopNotice,
  triggerActionDiff
}: UsePlanMutationsParams) {
  const handleApplyCustomEvent = (result: {
    eventTitle: string;
    guestCount: number;
    budgetCap: number;
    daysRemaining: number;
    budget: BudgetItem[];
    milestones: MilestoneTask[];
  }) => {
    const beforeEval = evaluation;
    const nextEval = evaluateEventPlan({
      eventTitle: result.eventTitle,
      personaLens: preset.persona,
      guestCount: result.guestCount,
      baseGuestCount: result.guestCount,
      totalBudgetCap: result.budgetCap,
      daysRemaining: result.daysRemaining,
      budgetItems: result.budget,
      milestones: result.milestones
    });

    preset.setEventTitle(result.eventTitle);
    preset.setBudgetCap(result.budgetCap);
    preset.setGuestCount(result.guestCount);
    preset.setBaseGuestCount(result.guestCount);
    preset.setDaysRemaining(result.daysRemaining);
    preset.setBudgetItems(result.budget);
    preset.setMilestones(result.milestones);

    triggerActionDiff({
      actionName: `Custom Intake: ${result.eventTitle}`,
      title: "Synthesized Dynamic Event Plan",
      explanation: `Deterministic engine generated a 6-category allocation ledger and dependency DAG in <5ms.`,
      deltas: [
        { label: "Event Title", before: preset.eventTitle, after: result.eventTitle, diff: "Custom Plan" },
        {
          label: "Budget Cap",
          before: `₹${preset.budgetCap.toLocaleString("en-IN")}`,
          after: `₹${result.budgetCap.toLocaleString("en-IN")}`,
          diff: `₹${result.budgetCap.toLocaleString("en-IN")}`
        }
      ],
      beforeEvaluation: beforeEval,
      afterEvaluation: nextEval
    });
  };

  const handleTopUpBudget = (additionalAmount?: number) => {
    const deficit = Math.abs(evaluation.variance);
    const topUp = additionalAmount || (deficit > 0 ? deficit : 100000);
    const newCap = preset.budgetCap + topUp;
    preset.setBudgetCap(newCap);

    setClosedLoopNotice({
      title: "Budget Cap Top-Up Authorized",
      message: `Authorized +₹${topUp.toLocaleString("en-IN")} additional budget ceiling (New Cap: ₹${newCap.toLocaleString("en-IN")}). Deficit is 100% eliminated.`,
      affectedCategories: [],
      actionTab: "overview",
      actionLabel: "View Updated Event Schedule →"
    });
  };

  const handleApplyTradeoff = (strategy: TradeoffStrategy) => {
    const beforeEval = evaluation;
    const categoryDeltaMap = new Map<string, { delta: number; rationale: string }>();
    strategy.adjustments.forEach((adj: TradeoffAdjustment) => {
      categoryDeltaMap.set(adj.category, { delta: adj.delta, rationale: adj.rationale });
    });

    const updatedItems = preset.budgetItems.map((item) => {
      const adjustment = categoryDeltaMap.get(item.category);
      if (adjustment) {
        const newAllocated = Math.max(0, item.allocatedAmount + adjustment.delta);
        return {
          ...item,
          allocatedAmount: newAllocated,
          isEstimate: false,
          notes: `${item.notes ? item.notes + " | " : ""}[Scope Revised: ${adjustment.rationale}]`
        };
      }
      return item;
    });

    preset.setBudgetItems(updatedItems);

    const nextEval = evaluateEventPlan({
      eventTitle: preset.eventTitle,
      personaLens: preset.persona,
      guestCount: preset.guestCount,
      baseGuestCount: preset.baseGuestCount,
      totalBudgetCap: preset.budgetCap,
      daysRemaining: preset.daysRemaining,
      budgetItems: updatedItems,
      milestones: preset.milestones
    });

    setClosedLoopNotice({
      title: `Trade-Off Applied: "${strategy.strategyTitle}"`,
      message: `Adjusted category budget allocations. Scope adjustments were incorporated into the ledger.`,
      affectedCategories: strategy.adjustments.map((adj: TradeoffAdjustment) => {
        const item = updatedItems.find((b) => b.category === adj.category);
        return {
          category: adj.category,
          label: item?.label || adj.category,
          delta: adj.delta,
          newAllocated: item?.allocatedAmount || 0,
          rationale: adj.rationale
        };
      }),
      actionTab: "vendor",
      actionLabel: "Audit Vendor Quotes & Dispatch Addendums →"
    });

    triggerActionDiff({
      actionName: `Applied Trade-Off: ${strategy.strategyTitle}`,
      title: "Executed Category Rebalance",
      explanation: strategy.description,
      deltas: strategy.adjustments.map((adj: TradeoffAdjustment) => {
        const it = preset.budgetItems.find((b) => b.category === adj.category);
        return {
          label: `${it?.label || adj.category} Budget`,
          before: `₹${it?.allocatedAmount.toLocaleString("en-IN") || 0}`,
          after: `₹${((it?.allocatedAmount || 0) + adj.delta).toLocaleString("en-IN")}`,
          diff: `${adj.delta < 0 ? "-" : "+"}₹${Math.abs(adj.delta).toLocaleString("en-IN")}`,
          isImprovement: true
        };
      }),
      beforeEvaluation: beforeEval,
      afterEvaluation: nextEval
    });
  };

  const handleSimulateMidFlightShift = () => {
    const beforeEval = evaluation;
    const newGuestCount = preset.guestCount + 50;
    const newBudgetCap = Math.round(preset.budgetCap * 0.9);
    const newDaysRemaining = Math.max(1, preset.daysRemaining - 14);

    preset.setGuestCount(newGuestCount);
    preset.setBudgetCap(newBudgetCap);
    preset.setDaysRemaining(newDaysRemaining);

    const nextEval = evaluateEventPlan({
      eventTitle: preset.eventTitle,
      personaLens: preset.persona,
      guestCount: newGuestCount,
      baseGuestCount: preset.baseGuestCount,
      totalBudgetCap: newBudgetCap,
      daysRemaining: newDaysRemaining,
      budgetItems: preset.budgetItems,
      milestones: preset.milestones
    });

    logActivityEvent({
      taskId: "mid-flight-shift",
      taskTitle: "⚡ Mid-Flight Revision (+50 Guests, -10% Budget, -14d)",
      category: "catering",
      channel: "system",
      vendorName: "Deterministic Engine",
      recipient: "Executive Operations",
      summary: `Simulated live disruption: +50 guests, ₹${(newBudgetCap / 100000).toFixed(1)}L budget cap, ${newDaysRemaining} days remaining. Triage Tier shifted to ${nextEval.triageTier}.`,
      loopStatus: "closed"
    });

    triggerActionDiff({
      actionName: "⚡ Mid-Flight Plan Revision",
      title: "Simulated Mid-Flight Disruption (Briefing 27:55)",
      explanation: `Stress-tested live event revision in-place: added +50 guests, reduced budget cap by 10%, and pulled event 14 days earlier without recreating from scratch.`,
      recommendedNextStep:
        nextEval.triageTier === "CRITICAL_OVERRUN"
          ? "Apply a trade-off in Step 2 to absorb the +50 guest catering expansion."
          : "Review the Dependency Flowchart in Step 3 for tight lead-time bottlenecks.",
      deltas: [
        { label: "Guest Headcount", before: `${preset.guestCount} Pax`, after: `${newGuestCount} Pax`, diff: "+50 Pax" },
        { label: "Budget Cap", before: `₹${preset.budgetCap.toLocaleString("en-IN")}`, after: `₹${newBudgetCap.toLocaleString("en-IN")}`, diff: "-10% Budget Cap" },
        { label: "Days to Event", before: `${preset.daysRemaining} Days`, after: `${newDaysRemaining} Days`, diff: "-14 Days Pulled In" },
        {
          label: "Triage Health",
          before: `${beforeEval.triageTier} (${beforeEval.urgencyScore}/100)`,
          after: `${nextEval.triageTier} (${nextEval.urgencyScore}/100)`,
          diff: `${nextEval.triageTier.replace("_", " ")}`,
          isImprovement: nextEval.urgencyScore <= beforeEval.urgencyScore
        }
      ],
      beforeEvaluation: beforeEval,
      afterEvaluation: nextEval
    });
  };

  return {
    handleApplyCustomEvent,
    handleTopUpBudget,
    handleApplyTradeoff,
    handleSimulateMidFlightShift
  };
}
