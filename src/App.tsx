/**
 * UtsavAI Root Application Shell
 * 4-Region Solid-Surface Material 3 Layout with live GenAI & Deterministic Planner Engine.
 */
import { lazy, Suspense } from "react";
import { AppBar } from "./components/AppBar";
import { TopicTabs } from "./components/TopicTabs";
import { AlertBanner } from "./components/AlertBanner";
import { PageHeader } from "./components/PageHeader";
import { MainPanel } from "./components/MainPanel";
import { SidebarStack } from "./components/SidebarStack";
import { ActionDiffModal } from "./components/ActionDiffModal";
import { ActivityHistoryPanel } from "./components/ActivityHistoryPanel";
import { useAppController } from "./hooks/useAppController";

const CustomEventModal = lazy(() => import("./components/CustomEventModal"));

export default function App() {
  const c = useAppController();

  return (
    <div className="utsav-shell">
      <a href="#main-content" className="skip-link">
        Skip to main execution workspace
      </a>

      {/* REGION 1: STICKY TOP APP BAR WITH ACTIVITY LOG COUNTER */}
      <AppBar
        currentPersona={c.persona}
        onSelectPersona={c.handleSelectPersona}
        activePresetId={c.activePreset.id}
        onSelectPreset={c.handleSelectPreset}
        searchQuery={c.searchQuery}
        onSearchChange={c.setSearchQuery}
        onOpenActivityHistory={() => c.setIsActivityLogOpen(true)}
        language={c.language}
      />

      {/* REGION 2: UNIFIED 4-STEP GUIDED STEP-TAB BAR */}
      <TopicTabs
        activeTab={c.activeTab}
        onTabChange={(tab) => {
          c.setActiveTab(tab);
          if (tab === "overview" || tab === "dag") c.setWalkthroughStep(1);
          else if (tab === "budget") c.setWalkthroughStep(2);
          else if (tab === "vendor") c.setWalkthroughStep(3);
          else if (tab === "activity") c.setWalkthroughStep(4);
        }}
        overrunCount={c.evaluation.overrunAmount > 0 ? 1 : 0}
        bottleneckCount={c.evaluation.criticalPathBottlenecks.length}
        language={c.language}
      />

      {/* DYNAMIC ALERT BANNER (CRITICAL FLASHING HIGHLIGHTS) */}
      <AlertBanner
        urgencyScore={c.evaluation.urgencyScore}
        triageTier={c.evaluation.triageTier}
        deficitAmount={c.evaluation.overrunAmount}
        bottleneckCount={c.evaluation.criticalPathBottlenecks.length}
        onResolveTradeoffs={c.handleResolveTradeoffsClick}
      />

      {/* REGION 3: PAGE HEADER */}
      <PageHeader
        eventTitle={c.eventTitle}
        eventDate={c.eventDate}
        daysRemaining={c.daysRemaining}
        guestCount={c.guestCount}
        triageTier={c.evaluation.triageTier}
        urgencyScore={c.evaluation.urgencyScore}
        onResetPreset={c.handleResetPreset}
        onExportIcs={c.handleExportIcs}
        onOpenCustomEvent={() => c.setIsCustomEventOpen(true)}
        language={c.language}
        aiStatus={c.aiStatus}
      />

      {/* REGION 4: 12-COLUMN EXECUTION GRID (8 MAIN / 4 SIDEBAR) */}
      <main id="main-content" tabIndex={-1} className="utsav-r4-grid">
        {/* 8-Column Main Panel */}
        <MainPanel
          activeTab={c.activeTab}
          budgetItems={c.budgetItems}
          scaledCategories={c.evaluation.scaledCategories}
          milestones={c.milestones}
          topologicalOrder={c.evaluation.topologicalOrder}
          bottlenecks={c.evaluation.criticalPathBottlenecks}
          guestCount={c.guestCount}
          baseGuestCount={c.baseGuestCount}
          totalBudgetCap={c.budgetCap}
          totalAllocated={c.evaluation.totalAllocated}
          variance={c.evaluation.variance}
          triageTier={c.evaluation.triageTier}
          tradeoffs={c.tradeoffs}
          onApplyTradeoff={c.handleApplyTradeoff}
          onToggleVerified={c.handleToggleVerified}
          onCycleTaskStatus={c.handleCycleTaskStatus}
          onUpdateTaskStatus={c.handleUpdateTaskStatus}
          onUpdateBudgetItem={c.handleUpdateBudgetItemAmount}
          onTopUpBudget={c.handleTopUpBudget}
          onLogRealTimeEvent={c.handleLogRealTimeEvent}
          vendorPhone={c.vendorPhone}
          sampleVendorNote={c.sampleVendorNote}
          filterQuery={c.searchQuery}
          onClearFilter={() => c.setSearchQuery("")}
          onSearchChange={c.setSearchQuery}
          daysRemaining={c.daysRemaining}
          eventTitle={c.eventTitle}
          persona={c.persona}
          language={c.language}
          onTabChange={c.setActiveTab}
          onConsultAiTradeoffs={c.handleConsultAiTradeoffs}
          isRebalancing={c.isRebalancing}
          aiNarrative={c.aiNarrative}
          aiProvenance={c.aiProvenance}
          closedLoopNotice={c.closedLoopNotice}
          onDismissClosedLoopNotice={() => c.setClosedLoopNotice(null)}
          onActionTriggered={(name, explanation, deltas) => {
            c.triggerActionDiff({
              actionName: name,
              title: name,
              explanation,
              deltas: deltas || [],
              beforeEvaluation: c.evaluation,
              afterEvaluation: c.evaluation
            });
          }}
        />

        {/* 4-Column Sidebar Stack */}
        <SidebarStack
          guestCount={c.guestCount}
          onGuestCountChange={c.setGuestCount}
          budgetCap={c.budgetCap}
          onBudgetCapChange={c.setBudgetCap}
          daysRemaining={c.daysRemaining}
          onDaysRemainingChange={c.setDaysRemaining}
          scaledCategories={c.evaluation.scaledCategories}
          totalAllocated={c.evaluation.totalAllocated}
          variance={c.evaluation.variance}
          triageTier={c.evaluation.triageTier}
          urgencyScore={c.evaluation.urgencyScore}
          vendorPhone={c.vendorPhone}
          onSimulateMidFlightShift={c.handleSimulateMidFlightShift}
          onOpenActivityHistory={() => c.setIsActivityLogOpen(true)}
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

      {/* BEFORE -> AFTER ACTION MODIFICATION POPUP */}
      <ActionDiffModal
        isOpen={c.isDiffModalOpen}
        diff={c.actionDiffData}
        onClose={() => c.setIsDiffModalOpen(false)}
        onViewActivityLog={() => {
          c.setIsDiffModalOpen(false);
          c.setActiveTab("activity");
        }}
      />

      {/* ACTIVITY HISTORY LOG DRAWER */}
      <ActivityHistoryPanel
        isOpen={c.isActivityLogOpen}
        onClose={() => c.setIsActivityLogOpen(false)}
      />

      {/* CUSTOM EVENT GUIDED INTAKE MODAL */}
      <Suspense fallback={null}>
        <CustomEventModal
          isOpen={c.isCustomEventOpen}
          onClose={() => c.setIsCustomEventOpen(false)}
          onApply={c.handleApplyCustomEvent}
        />
      </Suspense>
    </div>
  );
}
