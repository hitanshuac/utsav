import React, { useState } from "react";
import { Download, SlidersHorizontal, ChevronDown, ChevronUp, ArrowLeft } from "lucide-react";
import { TMinusAlertBanner } from "../components/alerts/TMinusAlertBanner";
import { BudgetProgress } from "../components/budget/BudgetProgress";
import { GuestBufferCalculator } from "../components/budget/GuestBufferCalculator";
import { InteractiveMetricBar } from "../components/budget/InteractiveMetricBar";
import { TradeoffDrawer } from "../components/budget/TradeoffDrawer";
import { EvaluatorShield } from "../components/controls/EvaluatorShield";
import { QuickAdjustmentBar } from "../components/controls/QuickAdjustmentBar";
import { SosCashLedger } from "../components/controls/SosCashLedger";
import { MilestoneList } from "../components/timeline/MilestoneList";
import { ActivityLoopLogger } from "../components/timeline/ActivityLoopLogger";
import { PendingTaskStrip } from "../components/timeline/PendingTaskStrip";
import { TaskDependencyGraph } from "../components/timeline/TaskDependencyGraph";
import { TMinusCascadeHub } from "../components/timeline/TMinusCascadeHub";
import { VendorAuditor } from "../components/vendor/VendorAuditor";
import { generateIcsCalendar } from "../lib/engine/calendar-utils";
import { computeScheduledMilestones } from "../lib/engine/dependency-graph";
import { usePlannerStore, WorkspaceTab } from "../lib/store/usePlannerStore";

export default function CommandCenterPage() {
  const eventTitle = usePlannerStore((s) => s.eventTitle);
  const eventDate = usePlannerStore((s) => s.eventDate);
  const milestones = usePlannerStore((s) => s.milestones);
  const activeTab = usePlannerStore((s) => s.activeTab);
  const setActiveTab = usePlannerStore((s) => s.setActiveTab);
  const lastActionNotice = usePlannerStore((s) => s.lastActionNotice);
  const clearNotice = usePlannerStore((s) => s.clearNotice);

  const [showSimControls, setShowSimControls] = useState(false);

  const scheduledMilestones = computeScheduledMilestones(milestones, eventDate);
  const pendingCount = scheduledMilestones.filter((m) => m.status !== "completed").length;
  const icsHref = generateIcsCalendar(
    scheduledMilestones.map((m) => ({ title: m.title, targetDate: m.targetDate }))
  );

  const navTabs: { id: WorkspaceTab; label: string }[] = [
    { id: "overview", label: "Tasks" },
    { id: "milestones", label: "Schedule" },
    { id: "budget", label: "Budget" },
    { id: "sos", label: "Lifafa" },
    { id: "vendor", label: "Vendors" }
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans">
      {/* Top Navbar (Strict 3-Zone Top Bar Contract) */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-20">
        <div className="max-w-[1360px] mx-auto flex items-center justify-between gap-8 px-6 py-3">
          {/* Zone 1: Single-element Brand Wordmark */}
          <button
            type="button"
            onClick={() => setActiveTab("overview")}
            className="text-base font-bold tracking-tight text-slate-900 hover:opacity-85 transition-opacity whitespace-nowrap shrink-0"
          >
            Utsav
          </button>

          {/* Zone 2: Clean Single-Line Text Navigation Links */}
          <nav
            aria-label="Workspace Views"
            className="hidden md:flex items-center gap-6 text-xs font-medium text-slate-600"
          >
            {navTabs.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  aria-current={isActive ? "page" : undefined}
                  className={`py-1 transition-colors whitespace-nowrap shrink-0 border-b-2 ${
                    isActive
                      ? "border-slate-900 text-slate-900 font-semibold"
                      : "border-transparent text-slate-500 hover:text-slate-900"
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </nav>

          {/* Zone 3: 1 Primary Action */}
          <div className="flex items-center gap-2 shrink-0">
            <a
              href={icsHref}
              download="utsav-event-plan.ics"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0"
            >
              <Download className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Export</span>
            </a>
          </div>
        </div>

        {/* Mobile View Switcher */}
        <div
          role="tablist"
          aria-label="Mobile Navigation"
          className="flex md:hidden items-center gap-1.5 overflow-x-auto px-4 py-2 border-t border-slate-100 bg-slate-50"
        >
          {navTabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={activeTab === tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-3 py-1 text-xs font-semibold rounded-md whitespace-nowrap shrink-0 ${
                activeTab === tab.id
                  ? "bg-slate-900 text-white"
                  : "bg-white text-slate-600 border border-slate-200"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </header>

      {/* Main Viewport */}
      <main id="top" className="flex-1 max-w-[1360px] w-full mx-auto px-4 sm:px-6 py-4 flex flex-col gap-3.5">
        {/* Title Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-3">
            <div>
              <h1 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">
                {eventTitle}
              </h1>
              <div className="text-xs text-slate-500 font-mono tabular-nums">
                {eventDate} · {pendingCount} pending
              </div>
            </div>

            {activeTab !== "overview" && (
              <button
                type="button"
                onClick={() => setActiveTab("overview")}
                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-100 transition-colors whitespace-nowrap shrink-0"
              >
                <ArrowLeft className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Tasks</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            {lastActionNotice && (
              <div
                role="status"
                aria-live="polite"
                className="flex items-center gap-2 px-2.5 py-1 bg-slate-100 border border-slate-200 rounded-lg text-xs text-slate-800"
              >
                <span className="truncate max-w-xs">{lastActionNotice}</span>
                <button
                  type="button"
                  onClick={clearNotice}
                  className="text-slate-400 hover:text-slate-800 font-bold"
                >
                  ✕
                </button>
              </div>
            )}

            <button
              type="button"
              onClick={() => setShowSimControls((prev) => !prev)}
              aria-expanded={showSimControls}
              className={`inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-lg border transition-colors whitespace-nowrap shrink-0 ${
                showSimControls
                  ? "bg-slate-900 text-white border-slate-900"
                  : "bg-white text-slate-700 border-slate-200 hover:bg-slate-100"
              }`}
            >
              <SlidersHorizontal className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Options</span>
              {showSimControls ? (
                <ChevronUp className="w-3.5 h-3.5" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5" />
              )}
            </button>
          </div>
        </div>

        {/* High-Priority T-Minus Warning Notification Banner */}
        <TMinusAlertBanner />

        {/* 4-Block Concise Metric Bar */}
        <InteractiveMetricBar />

        {/* Persistent Activity Logger & Call Loop Summary Strip */}
        <ActivityLoopLogger />

        {/* Drawer for Presets & Settings */}
        {showSimControls && (
          <div className="flex flex-col gap-3">
            <EvaluatorShield />
            <QuickAdjustmentBar />
          </div>
        )}

        {/* TAB 1: TASKS & INTERCONNECTED GRAPH (Overview) */}
        {activeTab === "overview" && (
          <div className="flex flex-col gap-3.5">
            <PendingTaskStrip />
            <TaskDependencyGraph />
          </div>
        )}

        {/* TAB 2: SCHEDULE (T-Minus & Delay Cascade + Topological Timeline) */}
        {activeTab === "milestones" && (
          <div id="timeline-section" className="flex flex-col gap-5">
            <TMinusCascadeHub />
            <MilestoneList />
          </div>
        )}

        {/* TAB 3: BUDGET (Catering Buffer Calc + Budget Progress) */}
        {activeTab === "budget" && (
          <div id="budget-section" className="flex flex-col gap-5">
            <GuestBufferCalculator />
            <BudgetProgress />
          </div>
        )}

        {/* TAB 4: SOS & CASH LIFAFA */}
        {activeTab === "sos" && (
          <div id="sos-section" className="flex flex-col gap-4">
            <SosCashLedger />
          </div>
        )}

        {/* TAB 5: VENDORS */}
        {activeTab === "vendor" && (
          <div id="vendor-section" className="flex flex-col gap-4">
            <VendorAuditor />
          </div>
        )}

        {/* TAB 6: TRADE-OFFS */}
        {activeTab === "tradeoffs" && (
          <div id="tradeoff-section" className="flex flex-col gap-4">
            <TradeoffDrawer />
          </div>
        )}
      </main>

      {/* Clean Footer */}
      <footer className="border-t border-slate-200 bg-white mt-auto py-3">
        <div className="max-w-[1360px] mx-auto px-6 flex items-center justify-between text-xs text-slate-400">
          <span>Utsav</span>
          <span>Event Command Center</span>
        </div>
      </footer>
    </div>
  );
}
