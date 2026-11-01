import type { FC } from "react";
import { useState } from "react";
import {
  AlertCircle,
  MessageSquare,
  Sparkles,
  ExternalLink,
  Shield,
  ArrowRight,
  UserCheck,
  CheckCircle2,
  Edit3,
  PlusCircle
} from "lucide-react";
import {
  BudgetItem,
  MilestoneTask,
  ScaledCategory,
  VendorAuditResult,
  TradeoffStrategy,
  PlanningTriageTier,
  PersonaLens
} from "../types/planner";
import { TopicTabId } from "./TopicTabs";
import { auditVendorQuoteOffline, generateWhatsAppLink } from "../lib/plannerEngine";
import { SafeNarrative } from "./SafeNarrative";
import { VisualDependencyFlowchart } from "./VisualDependencyFlowchart";
import { ActivityHistoryPanel } from "./ActivityHistoryPanel";
import { logActivityEvent } from "../lib/services/event-logger";
import { SupportedLanguage, TRANSLATIONS } from "../lib/i18n";

interface MainPanelProps {
  activeTab: TopicTabId;
  budgetItems: BudgetItem[];
  scaledCategories: ScaledCategory[];
  milestones: MilestoneTask[];
  topologicalOrder: string[];
  bottlenecks: string[];
  guestCount: number;
  baseGuestCount: number;
  totalBudgetCap: number;
  totalAllocated: number;
  variance: number;
  triageTier: PlanningTriageTier;
  tradeoffs: TradeoffStrategy[];
  onApplyTradeoff: (strategy: TradeoffStrategy) => void;
  onToggleVerified: (itemId: string) => void;
  onCycleTaskStatus: (taskId: string) => void;
  onUpdateTaskStatus?: (taskId: string, status: "pending" | "in_progress" | "completed") => void;
  onUpdateBudgetItem?: (itemId: string, newAmount: number) => void;
  onTopUpBudget?: (amount: number) => void;
  onLogRealTimeEvent?: (description: string, category?: string) => void;
  vendorPhone: string;
  sampleVendorNote: string;
  filterQuery: string;
  onClearFilter?: () => void;
  daysRemaining?: number;
  eventTitle?: string;
  onActionTriggered?: (actionName: string, explanation: string, deltas?: any[]) => void;
  persona?: PersonaLens;
  language?: SupportedLanguage;
  onTabChange?: (tab: TopicTabId) => void;
}

export const MainPanel: FC<MainPanelProps> = ({
  activeTab,
  budgetItems,
  scaledCategories,
  milestones,
  topologicalOrder,
  bottlenecks,
  guestCount,
  baseGuestCount,
  totalBudgetCap,
  totalAllocated,
  variance,
  triageTier,
  tradeoffs,
  onApplyTradeoff,
  onToggleVerified,
  onCycleTaskStatus,
  onUpdateTaskStatus,
  onUpdateBudgetItem,
  onTopUpBudget,
  onLogRealTimeEvent,
  vendorPhone,
  sampleVendorNote,
  filterQuery,
  onClearFilter,
  daysRemaining = 30,
  eventTitle = "Celebration",
  onActionTriggered,
  persona = "family_host",
  language = "en",
  onTabChange
}) => {
  const t = TRANSLATIONS[language] || TRANSLATIONS.en;

  // Local state for manual inline editing & real-time event logger
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editAmountValue, setEditAmountValue] = useState<string>("");
  const [liveEventText, setLiveEventText] = useState<string>("");
  const [liveEventCategory, setLiveEventCategory] = useState<string>("catering");

  const handleCommitLiveEvent = () => {
    if (!liveEventText.trim()) return;
    if (onLogRealTimeEvent) {
      onLogRealTimeEvent(liveEventText.trim(), liveEventCategory);
    } else {
      logActivityEvent({
        taskId: `live-${Date.now()}`,
        taskTitle: `Real-Time Event: ${liveEventText.trim().slice(0, 40)}`,
        category: liveEventCategory as any,
        channel: "system",
        vendorName: "Live Floor Ops",
        recipient: "Coordinator Team",
        summary: `[Real-Time Event Tracker]: ${liveEventText.trim()}`,
        loopStatus: "closed"
      });
    }
    setLiveEventText("");
  };

  // Vendor Auditor local state
  const [vendorNote, setVendorNote] = useState<string>(sampleVendorNote);
  const [vendorAudit, setVendorAudit] = useState<VendorAuditResult>(
    auditVendorQuoteOffline(sampleVendorNote)
  );

  const handleAudit = () => {
    const result = auditVendorQuoteOffline(vendorNote);
    setVendorAudit(result);
    logActivityEvent({
      taskId: "vendor-audit",
      taskTitle: `Audited Vendor Quote: ${result.vendorName}`,
      category: "miscellaneous",
      channel: "system",
      vendorName: result.vendorName,
      recipient: "Coordinator Ops",
      summary: `Audited ₹${result.quotedAmount.toLocaleString("en-IN")} quote. Detected ${result.flaggedHiddenCosts.length} potential hidden cost risk(s).`,
      loopStatus: "closed"
    });
    if (onActionTriggered) {
      onActionTriggered(
        `Audited Vendor Quote: ${result.vendorName}`,
        `Deterministic quote audit identified ₹${result.quotedAmount.toLocaleString("en-IN")} base amount with ${result.flaggedHiddenCosts.length} flagged risk items.`,
        [
          {
            label: "Detected Base Amount",
            before: "—",
            after: `₹${result.quotedAmount.toLocaleString("en-IN")}`,
            diff: "Audited"
          },
          {
            label: "Flagged Hidden Costs",
            before: "0",
            after: `${result.flaggedHiddenCosts.length} items`,
            diff: result.flaggedHiddenCosts.length > 0 ? "Risks Flagged" : "Clear",
            isImprovement: result.flaggedHiddenCosts.length === 0
          }
        ]
      );
    }
  };

  const query = (filterQuery || "").trim().toLowerCase();

  // Filter items in real time across budget and milestones
  const filteredBudget = budgetItems.filter(
    (b) =>
      b.label.toLowerCase().includes(query) ||
      b.category.toLowerCase().includes(query) ||
      (b.notes && b.notes.toLowerCase().includes(query))
  );

  const filteredMilestones = milestones.filter(
    (m) =>
      m.title.toLowerCase().includes(query) ||
      m.category.toLowerCase().includes(query) ||
      (m.vendorContact?.name && m.vendorContact.name.toLowerCase().includes(query)) ||
      m.id.toLowerCase().includes(query)
  );

  const matchingCount = query ? filteredBudget.length + filteredMilestones.length : 0;

  // Distinct workspace modes to prevent double rendering between Step 1 & Step 2
  const showOverview = activeTab === "overview";
  const showBudget = activeTab === "budget";
  const showDag = activeTab === "dag";
  const showVendor = activeTab === "vendor";
  const showActivity = activeTab === "activity";

  // Per-plate catering cost
  const cateringItem = budgetItems.find((b) => b.category === "catering");
  const cateringPerPlate = cateringItem && guestCount > 0 ? Math.round(cateringItem.allocatedAmount / guestCount) : 0;

  // Milestone completion stats
  const completedMilestones = milestones.filter((m) => m.status === "completed").length;

  return (
    <div className="utsav-r4-main" id={`panel-${activeTab}`} role="tabpanel">
      {/* Prominent Active Search Filter Bar */}
      {query && (
        <div className="bg-amber-50 border border-amber-300 text-amber-900 rounded-xl px-4 py-2.5 mb-4 flex items-center justify-between shadow-xs">
          <span className="text-xs font-semibold">
            Filtering by <strong>&quot;{filterQuery}&quot;</strong> — {matchingCount} matching items found
          </span>
          {onClearFilter && (
            <button
              type="button"
              onClick={onClearFilter}
              className="text-xs font-bold text-amber-900 hover:text-amber-950 underline cursor-pointer"
            >
              [Clear]
            </button>
          )}
        </div>
      )}

      {/* PROMINENT ROLE LENS BANNER (TAILORED OPERATIONAL FOCUS) */}
      <div className="bg-white border border-slate-200 rounded-xl p-3 mb-4 shadow-xs flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-200 flex items-center justify-center shrink-0">
            <UserCheck className="w-4 h-4 text-indigo-700" aria-hidden="true" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <strong className="text-xs font-bold text-slate-900">
                {persona === "family_host"
                  ? "Viewing As: Family Host"
                  : persona === "wedding_coordinator"
                  ? "Viewing As: Wedding Coordinator"
                  : "Viewing As: Community Organizer"}
              </strong>
            </div>
            <p className="text-[11px] text-slate-600 mt-0.5 leading-snug">
              {persona === "family_host" &&
                `Focus: Food quality & per-plate costs (₹${cateringPerPlate.toLocaleString("en-IN")}/plate for ${guestCount} guests). Protects the feast meal; trims aesthetic decor first if budget overruns.`}
              {persona === "wedding_coordinator" &&
                `Focus: Milestone deadlines & vendor contracts. Enforces timeline prerequisites and flags missing 18% GST or unverified quotes.`}
              {persona === "community_organizer" &&
                `Focus: Municipal NOCs & crowd safety. Prioritizes Fire Safety permits (T-40d), stage permissions, and volunteer assignments for ${guestCount} attendees.`}
            </p>
          </div>
        </div>
      </div>

      {/* STEP 1: VISUAL FLOWCHART & EXECUTIVE SUMMARY (NO BUDGET DUPLICATION) */}
      {(showOverview || showDag) && (
        <div className="space-y-4">
          <VisualDependencyFlowchart
            milestones={filteredMilestones}
            topologicalOrder={topologicalOrder}
            bottlenecks={bottlenecks}
            daysRemaining={daysRemaining}
            eventTitle={eventTitle}
            onCycleTaskStatus={onCycleTaskStatus}
            onUpdateTaskStatus={onUpdateTaskStatus}
            onActionTriggered={onActionTriggered}
            language={language}
          />

          {/* Executive Summary Card on Step 1 (Replaces duplicated budget cards) */}
          {showOverview && (
            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3 mb-3">
                <div>
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                    <Shield className="w-4 h-4 text-emerald-600" aria-hidden="true" />
                    <span>Executive Event Execution Summary</span>
                  </h3>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Step 1 Milestone Progress &amp; Core Health Indicators
                  </p>
                </div>

                {onTabChange && (
                  <button
                    type="button"
                    onClick={() => onTabChange("budget")}
                    className="utsav-btn utsav-btn-primary text-xs px-3 py-1.5 font-bold shadow-xs flex items-center gap-1.5 self-start sm:self-auto cursor-pointer"
                  >
                    <span>Proceed to Step 2: Budget &amp; Trade-Offs</span>
                    <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
                  </button>
                )}
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-2.5">
                  <span className="text-slate-500 text-[11px] block">Budget Ceiling</span>
                  <strong className="text-slate-900 font-bold font-mono text-sm">
                    ₹{totalBudgetCap.toLocaleString("en-IN")}
                  </strong>
                </div>

                <div className="bg-slate-50 border border-slate-200 rounded-lg p-2.5">
                  <span className="text-slate-500 text-[11px] block">Allocated Total</span>
                  <strong className="text-slate-900 font-bold font-mono text-sm">
                    ₹{totalAllocated.toLocaleString("en-IN")}
                  </strong>
                </div>

                <div className="bg-slate-50 border border-slate-200 rounded-lg p-2.5">
                  <span className="text-slate-500 text-[11px] block">Milestone Progress</span>
                  <strong className="text-emerald-700 font-bold font-mono text-sm">
                    {completedMilestones} / {milestones.length} Completed
                  </strong>
                </div>

                <div className="bg-slate-50 border border-slate-200 rounded-lg p-2.5">
                  <span className="text-slate-500 text-[11px] block">Critical Bottlenecks</span>
                  <strong
                    className={`font-bold font-mono text-sm ${
                      bottlenecks.length > 0 ? "text-red-600" : "text-emerald-600"
                    }`}
                  >
                    {bottlenecks.length > 0 ? `${bottlenecks.length} Blocked` : "All Clear"}
                  </strong>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* STEP 2: BUDGET ALLOCATION LEDGER & TRADE-OFFS (DEDICATED STEP 2) */}
      {showBudget && (
        <section aria-labelledby="budget-ledger-title" className="utsav-card">
          <div className="utsav-card-header">
            <div>
              <h2 id="budget-ledger-title" className="utsav-card-title flex items-center gap-2">
                <span>{t.budgetLedgerTitle}</span>
                <span className="text-xs font-normal text-slate-500 font-mono">
                  ({t.scalesWithGuests})
                </span>
              </h2>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-600 font-mono tabular-nums">
                Total: ₹{totalAllocated.toLocaleString("en-IN")} / ₹{totalBudgetCap.toLocaleString("en-IN")}
              </span>
              <span
                className={`utsav-badge ${
                  variance >= 0 ? "utsav-badge-ontrack" : "utsav-badge-critical"
                }`}
              >
                {variance >= 0
                  ? `₹${variance.toLocaleString("en-IN")} ${t.varianceSurplus}`
                  : `₹${Math.abs(variance).toLocaleString("en-IN")} ${t.varianceDeficit}`}
              </span>
            </div>
          </div>

          <p className="text-xs text-slate-600 mb-4 leading-relaxed">
            Catering and logistics scale linearly with guest headcount (ratio:{" "}
            <strong>{(guestCount / baseGuestCount).toFixed(2)}x</strong>), while venue and photography remain fixed contract costs.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 mb-5">
            {filteredBudget.map((item) => {
              const scaledCat = scaledCategories.find((s) => s.category === item.category);
              const perPlate =
                item.category === "catering" && guestCount > 0
                  ? Math.round(item.allocatedAmount / guestCount)
                  : null;

              const isCardCritical =
                (triageTier === "CRITICAL_OVERRUN" || variance < 0) &&
                (item.isEstimate ||
                  (item.category === "catering" && guestCount > baseGuestCount) ||
                  item.allocatedAmount > totalBudgetCap * 0.35);

              return (
                <div
                  key={item.id}
                  className={`rounded-xl p-3.5 flex flex-col justify-between transition-colors shadow-xs ${
                    isCardCritical
                      ? "critical-flash-card"
                      : "bg-white border border-slate-200 hover:border-slate-300"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                      <div className="flex items-center gap-2">
                        {isCardCritical && (
                          <span className="critical-pulse-dot shrink-0" aria-hidden="true" />
                        )}
                        <span className="text-xs font-bold text-slate-900">{item.label}</span>
                      </div>
                      <span className="text-[11px] font-mono uppercase text-slate-500">
                        {item.category} · {scaledCat?.isVariable ? t.scalesWithGuests : t.fixedContract}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => onToggleVerified(item.id)}
                      title="Click to toggle Verified Quote vs Estimated Assumption"
                      className="cursor-pointer"
                    >
                      {item.isEstimate ? (
                        <span className="utsav-badge utsav-badge-timeline hover:opacity-85 text-[10px]">
                          {t.unverifiedEstimate}
                        </span>
                      ) : (
                        <span className="utsav-badge utsav-badge-ontrack hover:opacity-85 text-[10px]">
                          {t.verifiedQuote}
                        </span>
                      )}
                    </button>
                  </div>

                  {item.notes && (
                    <p className="text-[11px] text-slate-500 mb-2.5 italic">
                      &quot;{item.notes}&quot;
                    </p>
                  )}

                  <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
                    <span className="text-slate-500">
                      {perPlate ? `₹${perPlate.toLocaleString("en-IN")}/plate` : t.fixedContract}
                    </span>
                    {editingItemId === item.id ? (
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs text-slate-500 font-mono">₹</span>
                        <input
                          type="number"
                          value={editAmountValue}
                          onChange={(e) => setEditAmountValue(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              const val = parseInt(editAmountValue, 10);
                              if (!isNaN(val) && val >= 0 && onUpdateBudgetItem) {
                                onUpdateBudgetItem(item.id, val);
                              }
                              setEditingItemId(null);
                            } else if (e.key === "Escape") {
                              setEditingItemId(null);
                            }
                          }}
                          className="w-24 px-1.5 py-0.5 border border-indigo-500 rounded text-xs font-mono font-bold bg-white text-slate-900 outline-none"
                          autoFocus
                          aria-label={`Edit allocated amount for ${item.label}`}
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const val = parseInt(editAmountValue, 10);
                            if (!isNaN(val) && val >= 0 && onUpdateBudgetItem) {
                              onUpdateBudgetItem(item.id, val);
                            }
                            setEditingItemId(null);
                          }}
                          className="px-2 py-0.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[11px] font-bold cursor-pointer"
                          title="Save amount"
                        >
                          ✓
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingItemId(null)}
                          className="px-2 py-0.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded text-[11px] cursor-pointer"
                          title="Cancel"
                        >
                          ✕
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <strong className="text-slate-900 font-bold tabular-nums font-mono text-sm">
                          ₹{item.allocatedAmount.toLocaleString("en-IN")}
                        </strong>
                        {onUpdateBudgetItem && (
                          <button
                            type="button"
                            onClick={() => {
                              setEditingItemId(item.id);
                              setEditAmountValue(item.allocatedAmount.toString());
                            }}
                            className="text-[11px] text-indigo-600 hover:text-indigo-800 font-semibold px-1 py-0.5 rounded hover:bg-indigo-50 transition-colors cursor-pointer flex items-center gap-0.5"
                            title={`Edit amount for ${item.label}`}
                            aria-label={`Edit amount for ${item.label}`}
                          >
                            <Edit3 className="w-2.5 h-2.5" />
                            <span>Edit</span>
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* TWO-TRACK DEFICIT RESOLUTION OPTIONS (OPTION 1: TOP-UP BUDGET, OPTION 2: TRADE-OFF STRATEGIES) */}
          {variance < 0 && (
            <div
              className="bg-rose-50 border border-rose-200 rounded-xl p-4 shadow-xs"
              aria-live="polite"
              aria-busy="false"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3 pb-2 border-b border-rose-200">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-rose-600 shrink-0" aria-hidden="true" />
                  <div>
                    <h3 className="text-xs font-bold text-rose-900 uppercase tracking-wider">
                      Deficit Resolution Options: Choose Your Path
                    </h3>
                    <span className="text-[11px] text-rose-700">
                      Current Deficit: <strong>₹{Math.abs(variance).toLocaleString("en-IN")}</strong>. Choose to allocate more budget, or rebalance category expenses.
                    </span>
                  </div>
                </div>
              </div>

              {/* OPTION 1: ALLOCATE MORE BUDGET (SIMPLEST REAL-WORLD FIX) */}
              {onTopUpBudget && (
                <div className="bg-white border-2 border-emerald-500 rounded-xl p-3.5 mb-3.5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-start gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-center shrink-0 mt-0.5">
                      <span className="text-base font-bold text-emerald-700">₹</span>
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <strong className="text-xs font-bold text-slate-900">
                          Option 1: Allocate More Budget (+₹{Math.abs(variance).toLocaleString("en-IN")} Top-Up)
                        </strong>
                        <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.2 rounded font-mono">
                          Direct Solution
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-600 mt-0.5 leading-snug">
                        Self-Fund / Family Contribution. Expand the authorized budget cap from ₹{(totalBudgetCap / 100000).toFixed(2)}L to ₹{((totalBudgetCap + Math.abs(variance)) / 100000).toFixed(2)}L to absorb the entire deficit without trimming feast menus, floral decor, or guest shuttles.
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => onTopUpBudget(Math.abs(variance))}
                    className="utsav-btn bg-emerald-600 hover:bg-emerald-700 text-white text-xs px-4 py-2 font-bold shrink-0 cursor-pointer shadow-xs transition-colors"
                  >
                    ⚡ Top-Up Budget (+₹{Math.abs(variance).toLocaleString("en-IN")})
                  </button>
                </div>
              )}

              {/* OPTION 2: COST-CUTTING TRADE-OFF STRATEGIES */}
              {tradeoffs.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wide">
                      Option 2: Rebalance Expenses via Category Trade-Offs
                    </span>
                    <span className="text-[10px] text-slate-500">
                      {tradeoffs.length} Strategies Available
                    </span>
                  </div>

                  <div className="flex flex-col gap-2.5">
                    {tradeoffs.map((strategy, idx) => (
                      <div
                        key={idx}
                        className="bg-white border border-rose-200 rounded-lg p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-rose-300 transition-colors shadow-xs"
                      >
                        <div>
                          <strong className="text-xs font-bold text-slate-900 block mb-0.5">
                            {strategy.strategyTitle}
                          </strong>
                          <SafeNarrative content={strategy.description} className="text-[11px] text-slate-600 mb-1" />
                          <div className="flex flex-wrap gap-1.5">
                            {strategy.adjustments.map((adj, aIdx) => (
                              <span
                                key={aIdx}
                                className="text-[10px] bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded font-mono font-semibold"
                              >
                                {adj.category}: {adj.delta < 0 ? `-₹${Math.abs(adj.delta).toLocaleString("en-IN")}` : `+₹${adj.delta.toLocaleString("en-IN")}`}
                              </span>
                            ))}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => onApplyTradeoff(strategy)}
                          className="utsav-btn utsav-btn-primary text-xs px-3.5 py-2 font-bold shrink-0 cursor-pointer shadow-xs"
                        >
                          {t.applyStrategy}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* REAL-TIME OPERATIONS TRACKER (CLOSED-LOOP VERIFICATION) */}
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs mt-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3 mb-3">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-indigo-600 shrink-0" aria-hidden="true" />
                <div>
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wide">
                    Real-Time Operations Tracker · Closed-Loop Execution
                  </h3>
                  <span className="text-[11px] text-slate-500">
                    Track live ground changes, log vendor updates, and maintain an immutable audit trail.
                  </span>
                </div>
              </div>

              {/* Loop Status Badges */}
              <div className="flex items-center gap-2 text-xs font-mono">
                <span className="bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded font-bold">
                  {budgetItems.filter((b) => !b.isEstimate).length}/{budgetItems.length} Quotes Locked
                </span>
                <span className="bg-indigo-50 text-indigo-800 border border-indigo-200 px-2 py-0.5 rounded font-bold">
                  {milestones.filter((m) => m.status === "completed").length}/{milestones.length} Milestones Done
                </span>
              </div>
            </div>

            {/* Quick Live Event Logger Form */}
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
              <label htmlFor="live-event-input" className="text-xs font-semibold text-slate-700 block mb-1.5">
                + Log Real-Time Ground Change / Vendor Decision:
              </label>
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  id="live-event-input"
                  type="text"
                  value={liveEventText}
                  onChange={(e) => setLiveEventText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && liveEventText.trim()) {
                      handleCommitLiveEvent();
                    }
                  }}
                  placeholder="e.g. Extra 25 chairs requested by bride's family, or Caterer confirmed arrival at 4:30 PM..."
                  className="flex-1 px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 outline-none focus:border-indigo-500"
                />
                <select
                  value={liveEventCategory}
                  onChange={(e) => setLiveEventCategory(e.target.value)}
                  className="px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-medium text-slate-700 outline-none"
                >
                  <option value="catering">Catering</option>
                  <option value="decor">Decor</option>
                  <option value="venue">Venue</option>
                  <option value="photography">Photography</option>
                  <option value="logistics">Logistics</option>
                  <option value="miscellaneous">Miscellaneous</option>
                </select>
                <button
                  type="button"
                  onClick={handleCommitLiveEvent}
                  disabled={!liveEventText.trim()}
                  className="utsav-btn utsav-btn-primary text-xs px-3.5 py-1.5 font-bold shrink-0 disabled:opacity-50 cursor-pointer"
                >
                  Record & Close Loop
                </button>
              </div>
              <p className="text-[10px] text-slate-500 mt-1.5">
                Every logged event is timestamped, categorized, and added to the immutable audit trail (Step 4) with <code>loopStatus: closed</code>.
              </p>
            </div>
          </div>
        </section>
      )}

      {/* STEP 3: PLAIN-TEXT VENDOR QUOTE AUDITOR */}
      {showVendor && (
        <section aria-labelledby="vendor-auditor-title" className="utsav-card">
          <div className="utsav-card-header">
            <div>
              <h2 id="vendor-auditor-title" className="utsav-card-title flex items-center gap-2">
                <span>Plain-Text Vendor Quote Auditor</span>
                <span className="text-xs font-normal text-slate-500 font-mono">
                  (&lt;250 Tokens / WhatsApp Link Generator)
                </span>
              </h2>
            </div>
            <span className="utsav-badge utsav-badge-vendor">Zero OCR Lag</span>
          </div>

          <p className="text-xs text-slate-600 mb-3 leading-relaxed">
            Vendor quotes are audited from plain-text WhatsApp snippets. The engine audits omitted 18% GST, generator fuel running hours, and hall cleaning deposits.
          </p>

          <div className="mb-3">
            <textarea
              rows={3}
              value={vendorNote}
              onChange={(e) => setVendorNote(e.target.value)}
              placeholder="Paste vendor WhatsApp message, invoice breakdown, or quote note here..."
              className="utsav-input text-xs font-mono resize-y"
              aria-label="Vendor Quotation Plain-Text Note"
            />
            <div className="flex justify-end mt-2">
              <button
                type="button"
                onClick={handleAudit}
                className="utsav-btn utsav-btn-primary text-xs px-3.5 py-1.5 font-semibold cursor-pointer"
              >
                Audit Vendor Note
              </button>
            </div>
          </div>

          {/* Audit Results Card */}
          <div
            className="bg-slate-50 border border-slate-200 rounded-xl p-4 shadow-xs"
            aria-live="polite"
            aria-busy="false"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-3 mb-3">
              <div>
                <strong className="text-xs font-bold text-slate-900 block">
                  {vendorAudit.vendorName}
                </strong>
                <span className="text-[11px] text-slate-500">
                  Detected Base Amount:{" "}
                  <strong className="text-slate-800 tabular-nums">
                    ₹{vendorAudit.quotedAmount.toLocaleString("en-IN")}
                  </strong>
                </span>
              </div>
              <span className="utsav-badge utsav-badge-ontrack text-[10px]">
                Deterministic Guard Active
              </span>
            </div>

            {/* Flagged Hidden Costs with Critical Pulsing Highlight */}
            <div className="mb-3">
              <div className="flex items-center gap-1.5 text-xs font-bold text-rose-900 mb-1.5">
                <span className="critical-pulse-dot" aria-hidden="true" />
                <AlertCircle className="w-3.5 h-3.5 text-rose-600" aria-hidden="true" />
                <span>Flagged Potential Hidden Costs:</span>
              </div>
              <ul className="text-xs text-slate-700 space-y-1.5">
                {vendorAudit.flaggedHiddenCosts.map((cost, cIdx) => (
                  <li
                    key={cIdx}
                    className="critical-flash-card rounded-lg p-2 text-[11px] leading-snug flex items-start gap-2"
                  >
                    <span className="critical-pulse-dot mt-1 shrink-0" aria-hidden="true" />
                    <span>{cost}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* 3 Negotiation Questions with WhatsApp Dispatch */}
            <div>
              <div className="text-xs font-bold text-slate-900 mb-2 flex items-center gap-1.5">
                <MessageSquare className="w-3.5 h-3.5 text-slate-600" aria-hidden="true" />
                <span>Contextual Negotiation Prompts (1-Click WhatsApp):</span>
              </div>
              <div className="flex flex-col gap-2">
                {vendorAudit.negotiationQuestions.map((q, qIdx) => {
                  const waUrl = generateWhatsAppLink(
                    vendorPhone,
                    `Namaste! Regarding the quotation for our celebration: ${q}`
                  );
                  return (
                    <div
                      key={qIdx}
                      className="bg-white border border-slate-200 rounded-lg p-2.5 flex items-center justify-between gap-3 text-xs shadow-xs"
                    >
                      <span className="text-slate-700 text-[11px] leading-snug">&quot;{q}&quot;</span>
                      <a
                        href={waUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={() => {
                          logActivityEvent({
                            taskId: "vendor-question",
                            taskTitle: `Dispatched Negotiation Question #${qIdx + 1}`,
                            category: "miscellaneous",
                            channel: "whatsapp",
                            vendorName: vendorAudit.vendorName,
                            recipient: vendorPhone,
                            summary: `Dispatched question on WhatsApp: "${q}"`,
                            loopStatus: "awaiting_call"
                          });
                        }}
                        className="utsav-btn bg-emerald-600 text-white hover:bg-emerald-700 text-[11px] px-2.5 py-1 font-semibold shrink-0 flex items-center gap-1 cursor-pointer"
                        aria-label={`Send question ${qIdx + 1} to vendor on WhatsApp`}
                      >
                        <span>WhatsApp</span>
                        <ExternalLink className="w-3 h-3" aria-hidden="true" />
                      </a>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* STEP 4: LIVE ACTIVITY & LOOP-CLOSURE AUDIT HISTORY */}
      {showActivity && (
        <ActivityHistoryPanel isEmbedded={true} />
      )}
    </div>
  );
};

export default MainPanel;
