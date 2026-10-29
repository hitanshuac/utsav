import { useState, useMemo } from "react";
import { AppBar } from "./components/AppBar";
import { TopicTabs, TopicTabId } from "./components/TopicTabs";
import { AlertBanner } from "./components/AlertBanner";
import { PageHeader } from "./components/PageHeader";
import { MainPanel } from "./components/MainPanel";
import { SidebarStack } from "./components/SidebarStack";
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
  TradeoffStrategy
} from "./types/planner";

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

  // UI Interactive State
  const [activeTab, setActiveTab] = useState<TopicTabId>("overview");
  const [searchQuery, setSearchQuery] = useState<string>("");

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

  // 1-Click Load Scenario Preset
  const handleSelectPreset = (preset: JudgePreset) => {
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
  };

  // Reset to Active Preset Baseline
  const handleResetPreset = () => {
    handleSelectPreset(activePreset);
  };

  // Toggle Verified Quote vs Estimated Assumption
  const handleToggleVerified = (itemId: string) => {
    setBudgetItems((prev) =>
      prev.map((item) =>
        item.id === itemId ? { ...item, isEstimate: !item.isEstimate } : item
      )
    );
  };

  // Cycle Milestone Status
  const handleCycleTaskStatus = (taskId: string) => {
    setMilestones((prev) =>
      prev.map((task) => {
        if (task.id !== taskId) return task;
        const nextStatus =
          task.status === "pending"
            ? "in_progress"
            : task.status === "in_progress"
            ? "completed"
            : "pending";
        return { ...task, status: nextStatus };
      })
    );
  };

  // Apply Trade-off Resolution Strategy
  const handleApplyTradeoff = (strategy: TradeoffStrategy) => {
    setBudgetItems((prev) => {
      const updated = [...prev];
      for (const adj of strategy.adjustments) {
        const itemIdx = updated.findIndex((i) => i.category === adj.category);
        if (itemIdx >= 0) {
          updated[itemIdx] = {
            ...updated[itemIdx],
            allocatedAmount: Math.max(0, updated[itemIdx].allocatedAmount + adj.delta)
          };
        }
      }
      return updated;
    });
  };

  // 1-Click Resolve Trade-offs from Alert Banner
  const handleResolveTradeoffsClick = () => {
    setActiveTab("budget");
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
      {/* REGION 1: STICKY TOP APP BAR */}
      <AppBar
        currentPersona={persona}
        onSelectPersona={setPersona}
        activePresetId={activePreset.id}
        onSelectPreset={handleSelectPreset}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
      />

      {/* REGION 2: TOPIC NAVIGATION TAB BAR */}
      <TopicTabs
        activeTab={activeTab}
        onTabChange={setActiveTab}
        overrunCount={evaluation.overrunAmount > 0 ? 1 : 0}
        bottleneckCount={evaluation.criticalPathBottlenecks.length}
      />

      {/* DYNAMIC ALERT BANNER (BETWEEN R2 AND R3) */}
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
      />

      {/* REGION 4: 12-COLUMN EXECUTION GRID (8 MAIN / 4 SIDEBAR) */}
      <main className="utsav-r4-grid">
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
          vendorPhone={vendorPhone}
          sampleVendorNote={sampleVendorNote}
          filterQuery={searchQuery}
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
    </div>
  );
}
