/**
 * Custom hook orchestrating top-level UtsavAI application state, preset scenarios, and action dispatchers.
 */
import { useState, useMemo } from "react";
import {
  evaluateEventPlan,
  generateDeterministicTradeoffs,
  generateIcsCalendar
} from "../lib/plannerEngine";
import { EventCategory } from "../types/planner";
import { logActivityEvent } from "../lib/services/event-logger";
import { SupportedLanguage } from "../lib/i18n";
import { TopicTabId } from "../components/TopicTabs";
import { ClosedLoopNotice } from "../components/sections/BudgetSection";
import { usePresetState } from "./usePresetState";
import { useAiRebalance } from "./useAiRebalance";
import { useActionDiff } from "./useActionDiff";
import { usePlanMutations } from "./usePlanMutations";

function isValidEventCategory(cat: string): cat is EventCategory {
  return ["venue", "catering", "decor", "photography", "logistics", "miscellaneous"].includes(cat);
}

export function useAppController() {
  const preset = usePresetState();
  const diff = useActionDiff();

  // Guided Walkthrough & Multi-Generational State
  const [walkthroughStep, setWalkthroughStep] = useState<number>(1);
  const [dietaryProfile, setDietaryProfile] = useState<string>("Jain Pure Veg");
  const [guestAccessibility, setGuestAccessibility] = useState<string>("Children + Seniors");

  // UI Interactive State & Modals
  const [activeTab, setActiveTab] = useState<TopicTabId>("overview");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [isCustomEventOpen, setIsCustomEventOpen] = useState<boolean>(false);
  const [isActivityLogOpen, setIsActivityLogOpen] = useState<boolean>(false);
  const [language, setLanguage] = useState<SupportedLanguage>("en");
  const [closedLoopNotice, setClosedLoopNotice] = useState<ClosedLoopNotice | null>(null);

  // Deterministic Evaluation — Single Source of Truth
  const evaluation = useMemo(() => {
    return evaluateEventPlan({
      eventTitle: preset.eventTitle,
      personaLens: preset.persona,
      guestCount: preset.guestCount,
      baseGuestCount: preset.baseGuestCount,
      totalBudgetCap: preset.budgetCap,
      daysRemaining: preset.daysRemaining,
      budgetItems: preset.budgetItems,
      milestones: preset.milestones
    });
  }, [
    preset.eventTitle,
    preset.persona,
    preset.guestCount,
    preset.baseGuestCount,
    preset.budgetCap,
    preset.daysRemaining,
    preset.budgetItems,
    preset.milestones
  ]);

  // Live Gemini AI Bridge
  const ai = useAiRebalance({
    eventTitle: preset.eventTitle,
    persona: preset.persona,
    guestCount: preset.guestCount,
    baseGuestCount: preset.baseGuestCount,
    budgetCap: preset.budgetCap,
    daysRemaining: preset.daysRemaining,
    budgetItems: preset.budgetItems,
    milestones: preset.milestones,
    variance: evaluation.variance
  });

  // Trade-off Strategies: AI proposals if fetched, otherwise deterministic fallback
  const tradeoffs = useMemo(() => {
    if (evaluation.variance < 0) {
      if (ai.aiTradeoffs && ai.aiTradeoffs.length > 0) {
        return ai.aiTradeoffs;
      }
      return generateDeterministicTradeoffs(
        Math.abs(evaluation.variance),
        evaluation.scaledCategories
      );
    }
    return [];
  }, [evaluation.variance, evaluation.scaledCategories, ai.aiTradeoffs]);

  // Plan mutation handlers
  const mutations = usePlanMutations({
    preset,
    evaluation,
    setClosedLoopNotice,
    triggerActionDiff: diff.triggerActionDiff
  });

  const handleLogRealTimeEvent = (eventDescription: string, category: string = "logistics") => {
    if (!eventDescription.trim()) return;
    const safeCategory = isValidEventCategory(category) ? category : "logistics";
    logActivityEvent({
      taskId: `live-${Date.now()}`,
      taskTitle: `Real-Time Event: ${eventDescription.slice(0, 40)}`,
      category: safeCategory,
      channel: "system",
      vendorName: "Live Floor Ops",
      recipient: "Coordinator Team",
      summary: `[Real-Time Event Tracker]: ${eventDescription}`,
      loopStatus: "closed"
    });
  };

  const handleResolveTradeoffsClick = () => {
    setActiveTab("budget");
    setWalkthroughStep(2);
  };

  const handleExportIcs = () => {
    const icsContent = generateIcsCalendar(preset.milestones, preset.eventDate, preset.eventTitle);
    const blob = new Blob([icsContent], { type: "text/calendar;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `${preset.eventTitle.toLowerCase().replace(/\s+/g, "-")}-schedule.ics`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleShareWhatsAppPlan = () => {
    const text = `🎉 *${preset.eventTitle}* Execution Plan\nBudget Cap: ₹${preset.budgetCap.toLocaleString("en-IN")}\nGuests: ${preset.guestCount} Pax\nDays Left: ${preset.daysRemaining}\nTriage Tier: ${evaluation.triageTier}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
  };

  return {
    activePreset: preset.activePreset,
    persona: preset.persona,
    eventTitle: preset.eventTitle,
    eventDate: preset.eventDate,
    budgetCap: preset.budgetCap,
    guestCount: preset.guestCount,
    baseGuestCount: preset.baseGuestCount,
    daysRemaining: preset.daysRemaining,
    budgetItems: preset.budgetItems,
    milestones: preset.milestones,
    vendorPhone: preset.vendorPhone,
    sampleVendorNote: preset.sampleVendorNote,
    walkthroughStep,
    dietaryProfile,
    guestAccessibility,
    activeTab,
    searchQuery,
    isCustomEventOpen,
    isActivityLogOpen,
    isDiffModalOpen: diff.isDiffModalOpen,
    actionDiffData: diff.actionDiffData,
    language,
    closedLoopNotice,
    aiStatus: ai.aiStatus,
    tradeoffs,
    aiNarrative: ai.aiNarrative,
    aiProvenance: ai.aiProvenance,
    isRebalancing: ai.isRebalancing,
    evaluation,
    setBudgetCap: preset.setBudgetCap,
    setGuestCount: preset.setGuestCount,
    setDaysRemaining: preset.setDaysRemaining,
    setSearchQuery,
    setActiveTab,
    setWalkthroughStep,
    setDietaryProfile,
    setGuestAccessibility,
    setLanguage,
    setIsCustomEventOpen,
    setIsActivityLogOpen,
    setIsDiffModalOpen: diff.setIsDiffModalOpen,
    setClosedLoopNotice,
    handleSelectPersona: preset.handleSelectPersona,
    handleSelectPreset: preset.handleSelectPreset,
    handleResetPreset: preset.handleResetPreset,
    handleApplyCustomEvent: mutations.handleApplyCustomEvent,
    handleToggleVerified: preset.handleToggleVerified,
    handleUpdateBudgetItemAmount: preset.handleUpdateBudgetItemAmount,
    handleTopUpBudget: mutations.handleTopUpBudget,
    handleLogRealTimeEvent,
    handleCycleTaskStatus: preset.handleCycleTaskStatus,
    handleUpdateTaskStatus: preset.handleUpdateTaskStatus,
    handleApplyTradeoff: mutations.handleApplyTradeoff,
    handleConsultAiTradeoffs: ai.handleConsultAiTradeoffs,
    handleSimulateMidFlightShift: mutations.handleSimulateMidFlightShift,
    handleResolveTradeoffsClick,
    handleExportIcs,
    handleShareWhatsAppPlan,
    triggerActionDiff: diff.triggerActionDiff
  };
}
