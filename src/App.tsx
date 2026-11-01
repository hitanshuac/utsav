import { useState, useMemo, lazy, Suspense } from "react";
import { AppBar } from "./components/AppBar";
import { TopicTabs, TopicTabId } from "./components/TopicTabs";
import { AlertBanner } from "./components/AlertBanner";
import { PageHeader } from "./components/PageHeader";
import { MainPanel } from "./components/MainPanel";
import { SidebarStack } from "./components/SidebarStack";
import { GuidedWalkthroughBar } from "./components/GuidedWalkthroughBar";
import { ActionDiffModal, ActionDiffData, ActionDiffRow } from "./components/ActionDiffModal";
import { ActivityHistoryPanel } from "./components/ActivityHistoryPanel";
const CustomEventModal = lazy(() => import("./components/CustomEventModal"));
import { JUDGE_PRESETS, JudgePreset } from "./lib/presets";
import {
  evaluateEventPlan,
  generateDeterministicTradeoffs,
  generateIcsCalendar
} from "./lib/plannerEngine";
import {
  PersonaLens,
  BudgetItem,
  MilestoneTask,
  TradeoffStrategy,
  PlannerEvaluationResult
} from "./types/planner";
import { logActivityEvent } from "./lib/services/event-logger";

export default function App() {
  // Preset & Configuration State
  const [activePreset, setActivePreset] = useState<JudgePreset>(JUDGE_PRESETS.presetA);
  const [persona, setPersona] = useState<PersonaLens>(JUDGE_PRESETS.presetA.persona);
  const [eventTitle, setEventTitle] = useState<string>(JUDGE_PRESETS.presetA.title);
  const [eventDate, setEventDate] = useState<string>(JUDGE_PRESETS.presetA.eventDate);
  const [budgetCap, setBudgetCap] = useState<number>(JUDGE_PRESETS.presetA.budgetCap);
  const [guestCount, setGuestCount] = useState<number>(JUDGE_PRESETS.presetA.guestCount);
  const [baseGuestCount, setBaseGuestCount] = useState<number>(JUDGE_PRESETS.presetA.guestCount);
  const [daysRemaining, setDaysRemaining] = useState<number>(JUDGE_PRESETS.presetA.daysRemaining);
  const [budgetItems, setBudgetItems] = useState<BudgetItem[]>(JUDGE_PRESETS.presetA.budget);
  const [milestones, setMilestones] = useState<MilestoneTask[]>(JUDGE_PRESETS.presetA.milestones);
  const [vendorPhone, setVendorPhone] = useState<string>(JUDGE_PRESETS.presetA.vendorPhone);
  const [sampleVendorNote, setSampleVendorNote] = useState<string>(
    JUDGE_PRESETS.presetA.sampleVendorNote
  );

  // Guided Walkthrough & Multi-Generational State
  const [walkthroughStep, setWalkthroughStep] = useState<number>(1);
  const [dietaryProfile, setDietaryProfile] = useState<string>("Jain Pure Veg");
  const [guestAccessibility, setGuestAccessibility] = useState<string>("Children + Seniors");

  // UI Interactive State & Modals
  const [activeTab, setActiveTab] = useState<TopicTabId>("overview");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [isCustomEventOpen, setIsCustomEventOpen] = useState<boolean>(false);
  const [isActivityLogOpen, setIsActivityLogOpen] = useState<boolean>(false);
  const [isDiffModalOpen, setIsDiffModalOpen] = useState<boolean>(false);
  const [actionDiffData, setActionDiffData] = useState<ActionDiffData | null>(null);

  // Deterministic Evaluation — Single Source of Truth
  const evaluation = useMemo(() => {
    return evaluateEventPlan({
      eventTitle,
      personaLens: persona,
      guestCount,
      baseGuestCount,
      totalBudgetCap: budgetCap,
      daysRemaining,
      budgetItems,
      milestones
    });
  }, [
    eventTitle,
    persona,
    guestCount,
    baseGuestCount,
    budgetCap,
    daysRemaining,
    budgetItems,
    milestones
  ]);

  // Deterministic Trade-off Strategies
  const tradeoffs = useMemo(() => {
    if (evaluation.variance < 0) {
      return generateDeterministicTradeoffs(
        Math.abs(evaluation.variance),
        evaluation.scaledCategories
      );
    }
    return [];
  }, [evaluation.variance, evaluation.scaledCategories]);

  // Trigger Action Diff Modal Helper
  const triggerActionDiff = (params: {
    actionName: string;
    title: string;
    explanation: string;
    recommendedNextStep?: string;
    deltas: ActionDiffRow[];
    beforeEvaluation: PlannerEvaluationResult;
    afterEvaluation: PlannerEvaluationResult;
  }) => {
    setActionDiffData({
      actionName: params.actionName,
      title: params.title,
      timestamp: new Date().toLocaleTimeString("en-IN", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit"
      }),
      beforeTier: params.beforeEvaluation.triageTier,
      afterTier: params.afterEvaluation.triageTier,
      beforeScore: params.beforeEvaluation.urgencyScore,
      afterScore: params.afterEvaluation.urgencyScore,
      deltas: params.deltas,
      explanation: params.explanation,
      recommendedNextStep: params.recommendedNextStep
    });
    setIsDiffModalOpen(true);
  };

  // 1-Click Load Scenario Preset
  const handleSelectPreset = (preset: JudgePreset) => {
    const beforeEval = evaluation;
    const nextEval = evaluateEventPlan({
      eventTitle: preset.title,
      personaLens: preset.persona,
      guestCount: preset.guestCount,
      baseGuestCount: preset.guestCount,
      totalBudgetCap: preset.budgetCap,
      daysRemaining: preset.daysRemaining,
      budgetItems: preset.budget,
      milestones: preset.milestones
    });

    setActivePreset(preset);
    setPersona(preset.persona);
    setEventTitle(preset.title);
    setEventDate(preset.eventDate);
    setBudgetCap(preset.budgetCap);
    setGuestCount(preset.guestCount);
    setBaseGuestCount(preset.guestCount);
    setDaysRemaining(preset.daysRemaining);
    setBudgetItems(preset.budget);
    setMilestones(preset.milestones);
    setVendorPhone(preset.vendorPhone);
    setSampleVendorNote(preset.sampleVendorNote);

    logActivityEvent({
      taskId: `preset-${preset.id}`,
      taskTitle: `Switched Preset: ${preset.name}`,
      category: "logistics",
      channel: "system",
      vendorName: "Deterministic Engine",
      recipient: "Coordinator Team",
      summary: `Loaded ${preset.name}: ₹${(preset.budgetCap / 100000).toFixed(1)}L Cap, ${preset.guestCount} Pax, ${preset.daysRemaining}d Out. Triage Tier: ${nextEval.triageTier}.`,
      loopStatus: "closed"
    });

    triggerActionDiff({
      actionName: `Preset Shift: ${preset.name}`,
      title: `Loaded ${preset.name} Scenario Preset`,
      explanation: `Loaded official Hack2Skill Challenge 5 scenario preset with ${preset.guestCount} guests, ₹${(preset.budgetCap / 100000).toFixed(1)}L budget cap, and Kahn's DAG milestones.`,
      recommendedNextStep:
        nextEval.triageTier === "CRITICAL_OVERRUN"
          ? "Step 2: Inspect flashing red overrun category and click '⚡ Apply Strategy'."
          : nextEval.triageTier === "TIMELINE_BOTTLENECK"
          ? "Step 3: Check Flowchart for blocked critical-path milestone prerequisites."
          : "Step 4: Audit vendor plain-text quotation and verify contract terms.",
      deltas: [
        {
          label: "Scenario Preset",
          before: activePreset.name,
          after: preset.name,
          diff: "Preset Shift"
        },
        {
          label: "Budget Cap",
          before: `₹${budgetCap.toLocaleString("en-IN")}`,
          after: `₹${preset.budgetCap.toLocaleString("en-IN")}`,
          diff: `₹${(preset.budgetCap / 100000).toFixed(1)}L`
        },
        {
          label: "Guest Count",
          before: `${guestCount} Pax`,
          after: `${preset.guestCount} Pax`,
          diff: `${preset.guestCount} Pax`
        },
        {
          label: "Days to Event",
          before: `${daysRemaining} Days`,
          after: `${preset.daysRemaining} Days`,
          diff: `${preset.daysRemaining}d`
        },
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

  // Reset to Active Preset Baseline
  const handleResetPreset = () => {
    handleSelectPreset(activePreset);
  };

  // Apply Custom Event Plan from Guided Intake Modal
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
      personaLens: persona,
      guestCount: result.guestCount,
      baseGuestCount: result.guestCount,
      totalBudgetCap: result.budgetCap,
      daysRemaining: result.daysRemaining,
      budgetItems: result.budget,
      milestones: result.milestones
    });

    setEventTitle(result.eventTitle);
    setBudgetCap(result.budgetCap);
    setGuestCount(result.guestCount);
    setBaseGuestCount(result.guestCount);
    setDaysRemaining(result.daysRemaining);
    setBudgetItems(result.budget);
    setMilestones(result.milestones);

    logActivityEvent({
      taskId: "custom-intake",
      taskTitle: `Generated Custom Event: ${result.eventTitle}`,
      category: "venue",
      channel: "system",
      vendorName: "Deterministic Engine",
      recipient: "Coordinator Team",
      summary: `Dynamic 6-category plan & 6-step Kahn's DAG generated in <5ms for ${result.guestCount} pax, ₹${result.budgetCap.toLocaleString("en-IN")}.`,
      loopStatus: "closed"
    });

    triggerActionDiff({
      actionName: `Custom Intake: ${result.eventTitle}`,
      title: "Synthesized Dynamic Event Plan",
      explanation: `Deterministic engine generated a 6-category allocation ledger and dependency DAG in <5ms adhering to cultural and accessibility constraints.`,
      recommendedNextStep: "Proceed to Step 2 to verify catering per-plate calculations.",
      deltas: [
        {
          label: "Event Title",
          before: eventTitle,
          after: result.eventTitle,
          diff: "Custom Plan"
        },
        {
          label: "Budget Cap",
          before: `₹${budgetCap.toLocaleString("en-IN")}`,
          after: `₹${result.budgetCap.toLocaleString("en-IN")}`,
          diff: `₹${result.budgetCap.toLocaleString("en-IN")}`
        },
        {
          label: "Guest Count",
          before: `${guestCount} Pax`,
          after: `${result.guestCount} Pax`,
          diff: `${result.guestCount} Pax`
        }
      ],
      beforeEvaluation: beforeEval,
      afterEvaluation: nextEval
    });
  };

  // Toggle Verified Quote vs Estimated Assumption
  const handleToggleVerified = (itemId: string) => {
    const beforeEval = evaluation;
    const updatedItems = budgetItems.map((item) =>
      item.id === itemId ? { ...item, isEstimate: !item.isEstimate } : item
    );
    const targetItem = budgetItems.find((i) => i.id === itemId);
    const willBeEstimate = targetItem ? !targetItem.isEstimate : false;

    setBudgetItems(updatedItems);

    const nextEval = evaluateEventPlan({
      eventTitle,
      personaLens: persona,
      guestCount,
      baseGuestCount,
      totalBudgetCap: budgetCap,
      daysRemaining,
      budgetItems: updatedItems,
      milestones
    });

    logActivityEvent({
      taskId: itemId,
      taskTitle: `Quote Status Toggled: ${targetItem?.label || "Budget Item"}`,
      category: targetItem?.category || "venue",
      channel: "system",
      vendorName: "Deterministic Engine",
      recipient: "Operations",
      summary: `Transitioned ${targetItem?.label} to ${willBeEstimate ? "Estimated Assumption" : "Verified Quote"}.`,
      loopStatus: "closed"
    });

    triggerActionDiff({
      actionName: `Quote Status: ${targetItem?.label}`,
      title: `Toggled ${targetItem?.label} Status`,
      explanation: willBeEstimate
        ? `Marked item as estimated assumption. The engine flags unconfirmed estimates during Tier 1 Overrun.`
        : `Locked item with a verified vendor contract quote, removing estimate uncertainty risk.`,
      recommendedNextStep: willBeEstimate
        ? "Obtain written quotation from vendor to lock contract rate."
        : "Check downstream milestone dependencies in Step 3.",
      deltas: [
        {
          label: targetItem?.label || "Item",
          before: targetItem?.isEstimate ? "Estimated Assumption" : "Verified Quote",
          after: willBeEstimate ? "Estimated Assumption" : "Verified Quote",
          diff: willBeEstimate ? "Unconfirmed Risk" : "Locked Quote",
          isImprovement: !willBeEstimate
        }
      ],
      beforeEvaluation: beforeEval,
      afterEvaluation: nextEval
    });
  };

  // Cycle Milestone Status
  const handleCycleTaskStatus = (taskId: string) => {
    const target = milestones.find((m) => m.id === taskId);
    if (!target) return;
    const nextStatus =
      target.status === "pending"
        ? "in_progress"
        : target.status === "in_progress"
        ? "completed"
        : "pending";

    handleUpdateTaskStatus(taskId, nextStatus);
  };

  // Direct Update Milestone Status
  const handleUpdateTaskStatus = (
    taskId: string,
    status: "pending" | "in_progress" | "completed"
  ) => {
    const beforeEval = evaluation;
    const target = milestones.find((m) => m.id === taskId);
    if (!target) return;

    const updatedMilestones = milestones.map((m) =>
      m.id === taskId ? { ...m, status } : m
    );

    setMilestones(updatedMilestones);

    const nextEval = evaluateEventPlan({
      eventTitle,
      personaLens: persona,
      guestCount,
      baseGuestCount,
      totalBudgetCap: budgetCap,
      daysRemaining,
      budgetItems,
      milestones: updatedMilestones
    });

    logActivityEvent({
      taskId,
      taskTitle: `Task Status: ${target.title}`,
      category: target.category,
      channel: "system",
      vendorName: target.vendorContact?.name || "Deterministic Engine",
      recipient: "Operations Lead",
      summary: `Milestone transitioned from '${target.status}' to '${status}'. Downstream dependencies re-evaluated.`,
      loopStatus: "closed"
    });

    triggerActionDiff({
      actionName: `Task Transition: ${target.title}`,
      title: `Updated Milestone ${target.id.toUpperCase()}`,
      explanation:
        status === "completed"
          ? `Milestone marked completed. Prerequisite locks on dependent downstream tasks in Kahn's DAG have cleared.`
          : `Milestone status set to ${status}. Upstream prerequisite checks are enforced.`,
      recommendedNextStep:
        status === "completed"
          ? "Check Step 3 flowchart for newly unlocked downstream milestones."
          : "Coordinate with assigned vendor lead to resolve pending deliverables.",
      deltas: [
        {
          label: target.title,
          before: target.status.replace("_", " "),
          after: status.replace("_", " "),
          diff: status === "completed" ? "Unlocked Downstream" : "Status Changed",
          isImprovement: status === "completed"
        },
        {
          label: "Bottleneck Count",
          before: `${beforeEval.criticalPathBottlenecks.length}`,
          after: `${nextEval.criticalPathBottlenecks.length}`,
          diff: `${nextEval.criticalPathBottlenecks.length - beforeEval.criticalPathBottlenecks.length}`,
          isImprovement: nextEval.criticalPathBottlenecks.length <= beforeEval.criticalPathBottlenecks.length
        }
      ],
      beforeEvaluation: beforeEval,
      afterEvaluation: nextEval
    });
  };

  // Apply Trade-off Resolution Strategy
  const handleApplyTradeoff = (strategy: TradeoffStrategy) => {
    const beforeEval = evaluation;
    const updated = [...budgetItems];
    for (const adj of strategy.adjustments) {
      const itemIdx = updated.findIndex((i) => i.category === adj.category);
      if (itemIdx >= 0) {
        updated[itemIdx] = {
          ...updated[itemIdx],
          allocatedAmount: Math.max(0, updated[itemIdx].allocatedAmount + adj.delta)
        };
      }
    }

    setBudgetItems(updated);

    const nextEval = evaluateEventPlan({
      eventTitle,
      personaLens: persona,
      guestCount,
      baseGuestCount,
      totalBudgetCap: budgetCap,
      daysRemaining,
      budgetItems: updated,
      milestones
    });

    logActivityEvent({
      taskId: "tradeoff-apply",
      taskTitle: `Applied Trade-Off: ${strategy.strategyTitle}`,
      category: "decor",
      channel: "system",
      vendorName: "Deterministic Engine",
      recipient: "Coordinator Ops",
      summary: `Applied '${strategy.strategyTitle}': Saved ₹${Math.abs(beforeEval.variance).toLocaleString("en-IN")}. Deficit eliminated.`,
      loopStatus: "closed"
    });

    triggerActionDiff({
      actionName: `Applied Trade-Off: ${strategy.strategyTitle}`,
      title: "Deterministic Rebalance Executed",
      explanation: `The deterministic engine resolved the ₹${Math.abs(beforeEval.variance).toLocaleString("en-IN")} deficit by trimming non-contractual aesthetic items while safeguarding core hospitality.`,
      recommendedNextStep: "Proceed to Step 3 to review the Milestone Dependency Flowchart.",
      deltas: [
        {
          label: "Total Allocated",
          before: `₹${beforeEval.totalAllocated.toLocaleString("en-IN")}`,
          after: `₹${nextEval.totalAllocated.toLocaleString("en-IN")}`,
          diff: `-₹${(beforeEval.totalAllocated - nextEval.totalAllocated).toLocaleString("en-IN")} saved`,
          isImprovement: true
        },
        {
          label: "Budget Variance",
          before: `-₹${Math.abs(beforeEval.variance).toLocaleString("en-IN")} Deficit`,
          after: `${nextEval.variance >= 0 ? "₹0 Balanced" : `-₹${Math.abs(nextEval.variance)}`}`,
          diff: "Balanced",
          isImprovement: true
        },
        ...strategy.adjustments.map((adj) => ({
          label: `${adj.category.toUpperCase()} Adjustment`,
          before: `₹${(beforeEval.scaledCategories.find((c) => c.category === adj.category)?.allocatedAmount || 0).toLocaleString("en-IN")}`,
          after: `₹${((beforeEval.scaledCategories.find((c) => c.category === adj.category)?.allocatedAmount || 0) + adj.delta).toLocaleString("en-IN")}`,
          diff: adj.delta < 0 ? `-₹${Math.abs(adj.delta).toLocaleString("en-IN")}` : `+₹${adj.delta}`,
          isImprovement: adj.delta < 0
        }))
      ],
      beforeEvaluation: beforeEval,
      afterEvaluation: nextEval
    });
  };

  // 1-Click Mid-Flight Shift Simulator (Official Briefing 27:55)
  const handleSimulateMidFlightShift = () => {
    const beforeEval = evaluation;
    const newGuestCount = guestCount + 50;
    const newBudgetCap = Math.round(budgetCap * 0.9);
    const newDaysRemaining = Math.max(7, daysRemaining - 14);

    setGuestCount(newGuestCount);
    setBudgetCap(newBudgetCap);
    setDaysRemaining(newDaysRemaining);

    const nextEval = evaluateEventPlan({
      eventTitle,
      personaLens: persona,
      guestCount: newGuestCount,
      baseGuestCount,
      totalBudgetCap: newBudgetCap,
      daysRemaining: newDaysRemaining,
      budgetItems,
      milestones
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
        {
          label: "Guest Headcount",
          before: `${guestCount} Pax`,
          after: `${newGuestCount} Pax`,
          diff: "+50 Pax"
        },
        {
          label: "Budget Cap",
          before: `₹${budgetCap.toLocaleString("en-IN")}`,
          after: `₹${newBudgetCap.toLocaleString("en-IN")}`,
          diff: "-10% Budget Cap"
        },
        {
          label: "Days to Event",
          before: `${daysRemaining} Days`,
          after: `${newDaysRemaining} Days`,
          diff: "-14 Days Pulled In"
        },
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

  // 1-Click Resolve Trade-offs from Alert Banner
  const handleResolveTradeoffsClick = () => {
    setActiveTab("budget");
    setWalkthroughStep(2);
  };

  // Export RFC 5545 .ics Calendar
  const handleExportIcs = () => {
    const icsContent = generateIcsCalendar(milestones, eventDate, eventTitle);
    const blob = new Blob([icsContent], { type: "text/calendar;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${eventTitle.toLowerCase().replace(/[^a-z0-9]/g, "-")}-schedule.ics`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="utsav-shell">
      <a href="#main-content" className="skip-link">Skip to main execution workspace</a>

      {/* REGION 1: STICKY TOP APP BAR WITH ACTIVITY LOG COUNTER */}
      <AppBar
        currentPersona={persona}
        onSelectPersona={setPersona}
        activePresetId={activePreset.id}
        onSelectPreset={handleSelectPreset}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onOpenActivityHistory={() => setIsActivityLogOpen(true)}
      />

      {/* REGION 2: TOPIC NAVIGATION TAB BAR */}
      <TopicTabs
        activeTab={activeTab}
        onTabChange={(tab) => {
          setActiveTab(tab);
          if (tab === "overview") setWalkthroughStep(1);
          else if (tab === "budget") setWalkthroughStep(2);
          else if (tab === "dag") setWalkthroughStep(3);
          else if (tab === "vendor") setWalkthroughStep(4);
        }}
        overrunCount={evaluation.overrunAmount > 0 ? 1 : 0}
        bottleneckCount={evaluation.criticalPathBottlenecks.length}
      />

      {/* DYNAMIC ALERT BANNER (CRITICAL FLASHING HIGHLIGHTS) */}
      <AlertBanner
        urgencyScore={evaluation.urgencyScore}
        triageTier={evaluation.triageTier}
        deficitAmount={evaluation.overrunAmount}
        bottleneckCount={evaluation.criticalPathBottlenecks.length}
        onResolveTradeoffs={handleResolveTradeoffsClick}
      />

      {/* RESTORATION 1: 4-STEP GUIDED WALKTHROUGH STRIP & INLINE WIZARD */}
      <GuidedWalkthroughBar
        currentStep={walkthroughStep}
        onStepChange={setWalkthroughStep}
        eventTitle={eventTitle}
        onEventTitleChange={setEventTitle}
        budgetCap={budgetCap}
        onBudgetCapChange={setBudgetCap}
        guestCount={guestCount}
        onGuestCountChange={setGuestCount}
        daysRemaining={daysRemaining}
        onDaysRemainingChange={setDaysRemaining}
        dietaryProfile={dietaryProfile}
        onDietaryProfileChange={setDietaryProfile}
        guestAccessibility={guestAccessibility}
        onGuestAccessibilityChange={setGuestAccessibility}
        overrunAmount={evaluation.overrunAmount}
        variance={evaluation.variance}
        bottleneckCount={evaluation.criticalPathBottlenecks.length}
        tradeoffsCount={tradeoffs.length}
        onApplyFirstTradeoff={
          tradeoffs.length > 0 ? () => handleApplyTradeoff(tradeoffs[0]) : undefined
        }
        onOpenCustomEvent={() => setIsCustomEventOpen(true)}
        onOpenActivityHistory={() => setIsActivityLogOpen(true)}
        onSwitchTab={setActiveTab}
      />

      {/* REGION 3: PAGE HEADER */}
      <PageHeader
        eventTitle={eventTitle}
        eventDate={eventDate}
        daysRemaining={daysRemaining}
        guestCount={guestCount}
        triageTier={evaluation.triageTier}
        urgencyScore={evaluation.urgencyScore}
        onResetPreset={handleResetPreset}
        onExportIcs={handleExportIcs}
        onOpenCustomEvent={() => setIsCustomEventOpen(true)}
      />

      {/* REGION 4: 12-COLUMN EXECUTION GRID (8 MAIN / 4 SIDEBAR) */}
      <main id="main-content" tabIndex={-1} className="utsav-r4-grid">
        {/* 8-Column Main Panel */}
        <MainPanel
          activeTab={activeTab}
          budgetItems={budgetItems}
          scaledCategories={evaluation.scaledCategories}
          milestones={milestones}
          topologicalOrder={evaluation.topologicalOrder}
          bottlenecks={evaluation.criticalPathBottlenecks}
          guestCount={guestCount}
          baseGuestCount={baseGuestCount}
          totalBudgetCap={budgetCap}
          totalAllocated={evaluation.totalAllocated}
          variance={evaluation.variance}
          triageTier={evaluation.triageTier}
          tradeoffs={tradeoffs}
          onApplyTradeoff={handleApplyTradeoff}
          onToggleVerified={handleToggleVerified}
          onCycleTaskStatus={handleCycleTaskStatus}
          onUpdateTaskStatus={handleUpdateTaskStatus}
          vendorPhone={vendorPhone}
          sampleVendorNote={sampleVendorNote}
          filterQuery={searchQuery}
          daysRemaining={daysRemaining}
          eventTitle={eventTitle}
          onActionTriggered={(name, explanation, deltas) => {
            triggerActionDiff({
              actionName: name,
              title: name,
              explanation,
              deltas: deltas || [],
              beforeEvaluation: evaluation,
              afterEvaluation: evaluation
            });
          }}
        />

        {/* 4-Column Sidebar Stack */}
        <SidebarStack
          guestCount={guestCount}
          onGuestCountChange={setGuestCount}
          budgetCap={budgetCap}
          onBudgetCapChange={setBudgetCap}
          daysRemaining={daysRemaining}
          onDaysRemainingChange={setDaysRemaining}
          scaledCategories={evaluation.scaledCategories}
          totalAllocated={evaluation.totalAllocated}
          variance={evaluation.variance}
          triageTier={evaluation.triageTier}
          urgencyScore={evaluation.urgencyScore}
          vendorPhone={vendorPhone}
          onSimulateMidFlightShift={handleSimulateMidFlightShift}
          onOpenActivityHistory={() => setIsActivityLogOpen(true)}
        />
      </main>

      {/* SOLID SURFACE FOOTER */}
      <footer className="border-t border-slate-200 bg-white py-4 mt-auto">
        <div className="max-w-[1440px] mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <strong className="text-slate-800">UtsavAI</strong>
            <span>· Deterministic Indian Event Execution Engine</span>
          </div>
          <div className="font-mono text-[11px] text-slate-400">
            Zero-PII Ephemeral State · Solid-Surface Material 3 Architecture · Hack2Skill Challenge 5
          </div>
        </div>
      </footer>

      {/* RESTORATION 4: BEFORE -> AFTER ACTION MODIFICATION POPUP */}
      <ActionDiffModal
        isOpen={isDiffModalOpen}
        diff={actionDiffData}
        onClose={() => setIsDiffModalOpen(false)}
        onViewActivityLog={() => {
          setIsDiffModalOpen(false);
          setActiveTab("activity");
        }}
      />

      {/* RESTORATION 5: ACTIVITY HISTORY LOG DRAWER */}
      <ActivityHistoryPanel
        isOpen={isActivityLogOpen}
        onClose={() => setIsActivityLogOpen(false)}
      />

      {/* CUSTOM EVENT GUIDED INTAKE MODAL */}
      <Suspense fallback={null}>
        <CustomEventModal
          isOpen={isCustomEventOpen}
          onClose={() => setIsCustomEventOpen(false)}
          onApply={handleApplyCustomEvent}
        />
      </Suspense>
    </div>
  );
}
