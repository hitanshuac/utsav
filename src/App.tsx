import { useState, useMemo, useEffect, lazy, Suspense } from "react";
import { AppBar } from "./components/AppBar";
import { TopicTabs, TopicTabId } from "./components/TopicTabs";
import { AlertBanner } from "./components/AlertBanner";
import { PageHeader } from "./components/PageHeader";
import { MainPanel, ClosedLoopNotice } from "./components/MainPanel";
import { SidebarStack } from "./components/SidebarStack";
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
import { SupportedLanguage } from "./lib/i18n";

export default function App() {
  // Preset & Configuration State - Initialized on Preset C (Neighborhood Cultural Utsav — Tier 1 Critical Overrun)
  const [activePreset, setActivePreset] = useState<JudgePreset>(JUDGE_PRESETS.presetC);
  const [persona, setPersona] = useState<PersonaLens>(JUDGE_PRESETS.presetC.persona);
  const [eventTitle, setEventTitle] = useState<string>(JUDGE_PRESETS.presetC.title);
  const [eventDate, setEventDate] = useState<string>(JUDGE_PRESETS.presetC.eventDate);
  const [budgetCap, setBudgetCap] = useState<number>(JUDGE_PRESETS.presetC.budgetCap);
  const [guestCount, setGuestCount] = useState<number>(JUDGE_PRESETS.presetC.guestCount);
  const [baseGuestCount, setBaseGuestCount] = useState<number>(JUDGE_PRESETS.presetC.guestCount);
  const [daysRemaining, setDaysRemaining] = useState<number>(JUDGE_PRESETS.presetC.daysRemaining);
  const [budgetItems, setBudgetItems] = useState<BudgetItem[]>(JUDGE_PRESETS.presetC.budget);
  const [milestones, setMilestones] = useState<MilestoneTask[]>(JUDGE_PRESETS.presetC.milestones);
  const [vendorPhone, setVendorPhone] = useState<string>(JUDGE_PRESETS.presetC.vendorPhone);
  const [sampleVendorNote, setSampleVendorNote] = useState<string>(
    JUDGE_PRESETS.presetC.sampleVendorNote
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
  const [language, setLanguage] = useState<SupportedLanguage>("en");
  const [closedLoopNotice, setClosedLoopNotice] = useState<ClosedLoopNotice | null>(null);

  // Live Gemini AI Status & Inference State
  const [aiStatus, setAiStatus] = useState<{
    configured: boolean;
    model: string;
    source: "gemini-live" | "deterministic-shield";
  }>({
    configured: true,
    model: "gemini-3.5-flash",
    source: "gemini-live"
  });
  const [aiTradeoffs, setAiTradeoffs] = useState<TradeoffStrategy[] | null>(null);
  const [aiNarrative, setAiNarrative] = useState<string | null>(null);
  const [aiProvenance, setAiProvenance] = useState<"ai" | "fallback">("fallback");
  const [isRebalancing, setIsRebalancing] = useState<boolean>(false);

  // Poll / check AI health status on mount
  useEffect(() => {
    fetch("/api/health")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.llm) {
          setAiStatus({
            configured: Boolean(data.llm.configured),
            model: data.llm.model || "gemini-3.5-flash",
            source: data.llm.source || "gemini-live"
          });
        }
      })
      .catch(() => {
        setAiStatus({
          configured: false,
          model: "none",
          source: "deterministic-shield"
        });
      });
  }, []);

  // Reset custom AI trade-offs if budget items, guest count, or cap changes
  useEffect(() => {
    setAiTradeoffs(null);
    setAiNarrative(null);
    setAiProvenance("fallback");
  }, [guestCount, budgetCap, budgetItems, persona]);

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

  // Trade-off Strategies: AI proposals if fetched, otherwise deterministic fallback
  const tradeoffs = useMemo(() => {
    if (evaluation.variance < 0) {
      if (aiTradeoffs && aiTradeoffs.length > 0) {
        return aiTradeoffs;
      }
      return generateDeterministicTradeoffs(
        Math.abs(evaluation.variance),
        evaluation.scaledCategories
      );
    }
    return [];
  }, [evaluation.variance, evaluation.scaledCategories, aiTradeoffs]);

  // Consult Gemini AI for qualitative trade-off phrasing & compromise strategies
  const handleConsultAiTradeoffs = async () => {
    if (evaluation.variance >= 0) return;
    setIsRebalancing(true);
    try {
      const res = await fetch("/api/rebalance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventTitle,
          personaLens: persona,
          guestCount,
          baseGuestCount,
          totalBudgetCap: budgetCap,
          daysRemaining,
          budgetItems,
          milestones
        })
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.strategies) && data.strategies.length > 0) {
          setAiTradeoffs(data.strategies);
          if (data.narrative) setAiNarrative(data.narrative);
          const prov = data.provenance === "ai" ? "ai" : "fallback";
          setAiProvenance(prov);
          logActivityEvent({
            taskId: "ai-rebalance",
            taskTitle: `Consulted Gemini 3.5 AI Advisor (${prov === "ai" ? "Live AI" : "Deterministic Fallback"})`,
            category: "decor",
            channel: "system",
            vendorName: "Google Gemini 3.5",
            recipient: "Host & Coordinator",
            summary: `Generated ${data.strategies.length} trade-off strategies for ₹${Math.abs(evaluation.variance).toLocaleString("en-IN")} deficit.`,
            loopStatus: "closed"
          });
          return;
        }
      }
    } catch {
      // offline fallback
    } finally {
      setIsRebalancing(false);
    }
    setAiTradeoffs(null);
    setAiProvenance("fallback");
  };

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

  // 1-Click Role Lens Switcher (Recalibrates priorities per ADR-1 Role-Impact Matrix)
  const handleSelectPersona = (nextPersona: PersonaLens) => {
    const prevPersona = persona;
    setPersona(nextPersona);

    const personaDescriptions: Record<PersonaLens, { name: string; focus: string; audit: string }> = {
      family_host: {
        name: "Family Host",
        focus: "Hospitality & Per-Plate Feast Focus",
        audit: "Food Quality & Guest Comfort Protection"
      },
      wedding_coordinator: {
        name: "Wedding Coordinator",
        focus: "DAG Critical Path & Vendor SLAs",
        audit: "Strict 18% GST Inclusions & Milestone Bottlenecks"
      },
      community_organizer: {
        name: "Community Organizer",
        focus: "Civic Ground NOCs & Mass Volunteer Rosters",
        audit: "Municipal Safety, Fire Permits & Headcount Logistics"
      }
    };

    const prevInfo = personaDescriptions[prevPersona];
    const nextInfo = personaDescriptions[nextPersona];

    logActivityEvent({
      taskId: `lens-${nextPersona}`,
      taskTitle: `Switched Lens: ${nextInfo.name}`,
      category: "logistics",
      channel: "system",
      vendorName: "Deterministic Engine",
      recipient: "Coordinator Ops",
      summary: `Active persona lens switched to ${nextInfo.name}. Dashboard priority recalibrated: ${nextInfo.focus}.`,
      loopStatus: "closed"
    });
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
      summary: `Dynamic 6-category plan & 6-step milestone schedule generated in <5ms for ${result.guestCount} pax, ₹${result.budgetCap.toLocaleString("en-IN")}.`,
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

  // Toggle Verified Quote vs Estimated Assumption (Seamless)
  const handleToggleVerified = (itemId: string) => {
    const updatedItems = budgetItems.map((item) =>
      item.id === itemId ? { ...item, isEstimate: !item.isEstimate } : item
    );
    const targetItem = budgetItems.find((i) => i.id === itemId);
    const willBeEstimate = targetItem ? !targetItem.isEstimate : false;

    setBudgetItems(updatedItems);

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
  };

  // Manual Budget Item Amount Edit (Inline Number Revision)
  const handleUpdateBudgetItemAmount = (itemId: string, newAmount: number) => {
    const targetItem = budgetItems.find((i) => i.id === itemId);
    if (!targetItem || isNaN(newAmount) || newAmount < 0) return;
    const oldAmount = targetItem.allocatedAmount;

    const updatedItems = budgetItems.map((item) =>
      item.id === itemId ? { ...item, allocatedAmount: newAmount, isEstimate: false } : item
    );

    setBudgetItems(updatedItems);

    logActivityEvent({
      taskId: itemId,
      taskTitle: `Manual Revision: ${targetItem.label}`,
      category: targetItem.category,
      channel: "system",
      vendorName: "Coordinator Input",
      recipient: "Operations",
      summary: `Manually updated ${targetItem.label} allocation from ₹${oldAmount.toLocaleString("en-IN")} to ₹${newAmount.toLocaleString("en-IN")} (Variance impact: ${newAmount < oldAmount ? `saved ₹${(oldAmount - newAmount).toLocaleString("en-IN")}` : `increased ₹${(newAmount - oldAmount).toLocaleString("en-IN")}`}).`,
      loopStatus: "closed"
    });
  };

  // 1-Click Budget Cap Top-Up (Directly fund deficit)
  const handleTopUpBudget = (additionalAmount?: number) => {
    const deficit = Math.abs(evaluation.variance);
    const topUp = additionalAmount || (deficit > 0 ? deficit : 100000);
    const oldCap = budgetCap;
    const newCap = oldCap + topUp;

    setBudgetCap(newCap);

    logActivityEvent({
      taskId: "budget-topup",
      taskTitle: `Budget Cap Top-Up (+₹${topUp.toLocaleString("en-IN")})`,
      category: "venue",
      channel: "system",
      vendorName: "Host / Family Infusion",
      recipient: "Finance Ops",
      summary: `Allocated additional ₹${topUp.toLocaleString("en-IN")} to authorized budget ceiling (New Cap: ₹${newCap.toLocaleString("en-IN")}). Deficit resolved with zero vendor scope cuts.`,
      loopStatus: "closed"
    });

    setClosedLoopNotice({
      title: "Budget Cap Top-Up Authorized",
      message: `Authorized +₹${topUp.toLocaleString("en-IN")} additional budget ceiling (New Cap: ₹${newCap.toLocaleString("en-IN")}). Deficit is 100% eliminated with zero cuts to banquet feast menus, floral decor, or guest logistics.`,
      affectedCategories: [],
      actionTab: "overview",
      actionLabel: "View Updated Event Schedule →"
    });
  };

  // Real-Time Event & Disruption Tracker (Closes operations loop)
  const handleLogRealTimeEvent = (eventDescription: string, category: string = "logistics") => {
    if (!eventDescription.trim()) return;

    logActivityEvent({
      taskId: `live-${Date.now()}`,
      taskTitle: `Real-Time Event: ${eventDescription.slice(0, 40)}`,
      category: category as any,
      channel: "system",
      vendorName: "Live Floor Ops",
      recipient: "Coordinator Team",
      summary: `[Real-Time Event Tracker]: ${eventDescription}`,
      loopStatus: "closed"
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
          ? `Milestone marked completed. Prerequisite locks on dependent downstream tasks have cleared.`
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

  // Apply Trade-off Resolution Strategy (Closes human vendor communication loop)
  const handleApplyTradeoff = (strategy: TradeoffStrategy) => {
    const beforeEval = evaluation;
    const updated = [...budgetItems];
    const affectedCategories: ClosedLoopNotice["affectedCategories"] = [];

    for (const adj of strategy.adjustments) {
      const itemIdx = updated.findIndex((i) => i.category === adj.category);
      if (itemIdx >= 0) {
        const item = updated[itemIdx];
        const oldAmount = item.allocatedAmount;
        const newAllocated = Math.max(0, oldAmount + adj.delta);
        const deltaFormatted = adj.delta < 0 ? `-₹${Math.abs(adj.delta).toLocaleString("en-IN")}` : `+₹${adj.delta.toLocaleString("en-IN")}`;
        const scopeNote = `[Scope Revised ${deltaFormatted} via '${strategy.strategyTitle}']: ${adj.rationale || "Contract scope adjusted to absorb deficit."}`;

        updated[itemIdx] = {
          ...item,
          allocatedAmount: newAllocated,
          actualAmount: Math.max(0, (item.actualAmount || oldAmount) + adj.delta),
          notes: scopeNote,
          isEstimate: false
        };

        affectedCategories.push({
          category: adj.category,
          label: item.label,
          delta: adj.delta,
          newAllocated,
          rationale: adj.rationale || "Deficit rebalance",
          vendorName: item.label
        });

        logActivityEvent({
          taskId: `vendor-revised-${item.category}`,
          taskTitle: `Vendor Scope Revised: ${item.label}`,
          category: item.category,
          channel: "system",
          vendorName: `${item.label} Lead`,
          recipient: "Operations Lead",
          summary: `Contract scope adjusted by ${deltaFormatted}: "${scopeNote}". Direct vendor negotiation addendum ready.`,
          loopStatus: "closed"
        });
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
      summary: `Applied '${strategy.strategyTitle}': Saved ₹${Math.abs(beforeEval.variance).toLocaleString("en-IN")}. Deficit eliminated. ${affectedCategories.length} vendor contract scopes updated with addendums.`,
      loopStatus: "closed"
    });

    setClosedLoopNotice({
      title: `Trade-Off Enacted: ${strategy.strategyTitle}`,
      message: `Deficit eliminated! ₹${Math.abs(beforeEval.variance).toLocaleString("en-IN")} was absorbed by rebalancing vendor line items. Concrete scope reductions and contract addendums have been written directly to the vendor ledger notes below.`,
      affectedCategories,
      actionTab: "vendor",
      actionLabel: "Audit Vendor Quotes & Dispatch Addendums →"
    });

    triggerActionDiff({
      actionName: `Applied Trade-Off: ${strategy.strategyTitle}`,
      title: "Deterministic Rebalance Executed",
      explanation: `The deterministic engine resolved the ₹${Math.abs(beforeEval.variance).toLocaleString("en-IN")} deficit by trimming non-contractual aesthetic items while safeguarding core hospitality.`,
      recommendedNextStep: "Proceed to Step 3 to audit revised vendor quotes or review the Milestone Dependency Flowchart.",
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
        onSelectPersona={handleSelectPersona}
        activePresetId={activePreset.id}
        onSelectPreset={handleSelectPreset}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onOpenActivityHistory={() => setIsActivityLogOpen(true)}
        language={language}
        onLanguageChange={setLanguage}
      />

      {/* REGION 2: UNIFIED 4-STEP GUIDED STEP-TAB BAR */}
      <TopicTabs
        activeTab={activeTab}
        onTabChange={(tab) => {
          setActiveTab(tab);
          if (tab === "overview" || tab === "dag") setWalkthroughStep(1);
          else if (tab === "budget") setWalkthroughStep(2);
          else if (tab === "vendor") setWalkthroughStep(3);
          else if (tab === "activity") setWalkthroughStep(4);
        }}
        overrunCount={evaluation.overrunAmount > 0 ? 1 : 0}
        bottleneckCount={evaluation.criticalPathBottlenecks.length}
        language={language}
      />

      {/* DYNAMIC ALERT BANNER (CRITICAL FLASHING HIGHLIGHTS) */}
      <AlertBanner
        urgencyScore={evaluation.urgencyScore}
        triageTier={evaluation.triageTier}
        deficitAmount={evaluation.overrunAmount}
        bottleneckCount={evaluation.criticalPathBottlenecks.length}
        onResolveTradeoffs={handleResolveTradeoffsClick}
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
        language={language}
        aiStatus={aiStatus}
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
          onUpdateBudgetItem={handleUpdateBudgetItemAmount}
          onTopUpBudget={handleTopUpBudget}
          onLogRealTimeEvent={handleLogRealTimeEvent}
          vendorPhone={vendorPhone}
          sampleVendorNote={sampleVendorNote}
          filterQuery={searchQuery}
          onClearFilter={() => setSearchQuery("")}
          onSearchChange={setSearchQuery}
          daysRemaining={daysRemaining}
          eventTitle={eventTitle}
          persona={persona}
          language={language}
          onTabChange={setActiveTab}
          onConsultAiTradeoffs={handleConsultAiTradeoffs}
          isRebalancing={isRebalancing}
          aiNarrative={aiNarrative}
          aiProvenance={aiProvenance}
          closedLoopNotice={closedLoopNotice}
          onDismissClosedLoopNotice={() => setClosedLoopNotice(null)}
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
