import type { FC } from "react";
import { useState } from "react";
import {
  AlertCircle,
  Lock,
  Unlock,
  MessageSquare,
  Sparkles,
  ExternalLink
} from "lucide-react";
import {
  BudgetItem,
  MilestoneTask,
  ScaledCategory,
  VendorAuditResult,
  TradeoffStrategy,
  PlanningTriageTier
} from "../types/planner";
import { TopicTabId } from "./TopicTabs";
import { auditVendorQuoteOffline, generateWhatsAppLink } from "../lib/plannerEngine";
import { SafeNarrative } from "./SafeNarrative";

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
  vendorPhone: string;
  sampleVendorNote: string;
  filterQuery: string;
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
  tradeoffs,
  onApplyTradeoff,
  onToggleVerified,
  onCycleTaskStatus,
  vendorPhone,
  sampleVendorNote,
  filterQuery
}) => {
  // Vendor Auditor local state
  const [vendorNote, setVendorNote] = useState<string>(sampleVendorNote);
  const [vendorAudit, setVendorAudit] = useState<VendorAuditResult>(
    auditVendorQuoteOffline(sampleVendorNote)
  );

  const handleAudit = () => {
    const result = auditVendorQuoteOffline(vendorNote);
    setVendorAudit(result);
  };

  const query = filterQuery.toLowerCase();

  // Filter items
  const filteredBudget = budgetItems.filter(
    (b) =>
      b.label.toLowerCase().includes(query) ||
      b.category.toLowerCase().includes(query) ||
      (b.notes && b.notes.toLowerCase().includes(query))
  );

  // Map topological order to tasks
  const orderedMilestones = topologicalOrder
    .map((id) => milestones.find((m) => m.id === id))
    .filter((m): m is MilestoneTask => !!m)
    .filter(
      (m) =>
        m.title.toLowerCase().includes(query) ||
        m.category.toLowerCase().includes(query)
    );

  const showBudget = activeTab === "overview" || activeTab === "budget";
  const showDag = activeTab === "overview" || activeTab === "dag";
  const showVendor = activeTab === "overview" || activeTab === "vendor";

  return (
    <div className="utsav-r4-main" id={`panel-${activeTab}`} role="tabpanel">
      {/* SECTION 1: BUDGET ALLOCATION LEDGER & TRADE-OFFS */}
      {showBudget && (
        <section
          aria-labelledby="budget-ledger-title"
          className="utsav-card"
        >
          <div className="utsav-card-header">
            <div>
              <h2 id="budget-ledger-title" className="utsav-card-title flex items-center gap-2">
                <span>Budget Allocation Ledger</span>
                <span className="text-xs font-normal text-slate-500 font-mono">
                  (Linear Catering & Logistics Scaling)
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
                  ? `₹${variance.toLocaleString("en-IN")} Surplus`
                  : `₹${Math.abs(variance).toLocaleString("en-IN")} Overrun`}
              </span>
            </div>
          </div>

          <p className="text-xs text-slate-600 mb-4 leading-relaxed">
            Per <code className="bg-slate-100 px-1 py-0.5 rounded font-mono">ADR-2</code>, catering and logistics scale linearly with guest headcount (ratio:{" "}
            <strong>{(guestCount / baseGuestCount).toFixed(2)}x</strong>), while venue and photography remain step-fixed invariance.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 mb-5">
            {filteredBudget.map((item) => {
              const scaledCat = scaledCategories.find((s) => s.category === item.category);
              const perPlate =
                item.category === "catering" && guestCount > 0
                  ? Math.round(item.allocatedAmount / guestCount)
                  : null;

              return (
                <div
                  key={item.id}
                  className="bg-white border border-slate-200 rounded-xl p-3.5 flex flex-col justify-between hover:border-slate-300 transition-colors shadow-xs"
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-900">{item.label}</span>
                      </div>
                      <span className="text-[11px] font-mono uppercase text-slate-500">
                        {item.category} {scaledCat?.isVariable ? "· Variable" : "· Step-Fixed"}
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
                          Estimated Assumption
                        </span>
                      ) : (
                        <span className="utsav-badge utsav-badge-ontrack hover:opacity-85 text-[10px]">
                          Verified Quote
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
                      {perPlate ? `₹${perPlate.toLocaleString("en-IN")}/plate` : "Fixed Contract"}
                    </span>
                    <strong className="text-slate-900 font-bold tabular-nums font-mono text-sm">
                      ₹{item.allocatedAmount.toLocaleString("en-IN")}
                    </strong>
                  </div>
                </div>
              );
            })}
          </div>

          {/* AI / Deterministic Trade-off Strategies List */}
          {variance < 0 && tradeoffs.length > 0 && (
            <div className="bg-rose-50/70 border border-rose-200 rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-rose-600" aria-hidden="true" />
                  <h3 className="text-xs font-bold text-rose-900 uppercase tracking-wider">
                    Balanced Trade-off Resolutions (&lt;5ms Deterministic Fallback)
                  </h3>
                </div>
                <span className="text-[11px] text-rose-700 font-semibold">
                  Select a strategy to rebalance
                </span>
              </div>

              <div className="flex flex-col gap-2.5">
                {tradeoffs.map((strategy, idx) => (
                  <div
                    key={idx}
                    className="bg-white border border-rose-200 rounded-lg p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-rose-300 transition-colors"
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
                            {adj.category}: {adj.delta < 0 ? `-${Math.abs(adj.delta)}` : `+${adj.delta}`}
                          </span>
                        ))}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => onApplyTradeoff(strategy)}
                      className="utsav-btn utsav-btn-primary text-xs px-3 py-1 font-semibold shrink-0"
                    >
                      Apply Strategy
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>
      )}

      {/* SECTION 2: CHRONOLOGICAL MILESTONE DAG LIST */}
      {showDag && (
        <section
          aria-labelledby="milestone-dag-title"
          className="utsav-card"
        >
          <div className="utsav-card-header">
            <div>
              <h2 id="milestone-dag-title" className="utsav-card-title flex items-center gap-2">
                <span>Milestone Dependency Graph (DAG)</span>
                <span className="text-xs font-normal text-slate-500 font-mono">
                  (Kahn&apos;s Topological Sort Order)
                </span>
              </h2>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500 font-mono">
                {milestones.filter((m) => m.status === "completed").length}/{milestones.length} Completed
              </span>
              {bottlenecks.length > 0 && (
                <span className="utsav-badge utsav-badge-timeline">
                  {bottlenecks.length} Bottleneck(s)
                </span>
              )}
            </div>
          </div>

          <p className="text-xs text-slate-600 mb-4 leading-relaxed">
            Per <code className="bg-slate-100 px-1 py-0.5 rounded font-mono">ADR-3</code>, milestone prerequisites are resolved using Kahn&apos;s algorithm. Tasks with unsatisfied prerequisites cannot be completed until parent locks clear.
          </p>

          <div className="flex flex-col gap-2.5">
            {orderedMilestones.map((task, idx) => {
              const isBottleneck = bottlenecks.includes(task.id);
              const hasUncompletedPrereq = task.dependsOn.some((pId) => {
                const parent = milestones.find((m) => m.id === pId);
                return parent && parent.status !== "completed";
              });

              return (
                <div
                  key={task.id}
                  className={`bg-white border rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors shadow-xs ${
                    isBottleneck
                      ? "border-amber-400 bg-amber-50/30"
                      : "border-slate-200 hover:border-slate-300"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <span className="w-6 h-6 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center font-bold text-xs shrink-0 font-mono">
                      {idx + 1}
                    </span>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-bold text-slate-900">{task.title}</span>
                        {hasUncompletedPrereq && (
                          <span className="inline-flex items-center gap-1 text-[10px] text-amber-800 bg-amber-100 border border-amber-300 px-1.5 py-0.5 rounded font-medium">
                            <Lock className="w-3 h-3 text-amber-600" aria-hidden="true" />
                            <span>Prereq Locked ({task.dependsOn.join(", ")})</span>
                          </span>
                        )}
                        {isBottleneck && (
                          <span className="utsav-badge utsav-badge-timeline text-[10px]">
                            Critical Path Delay
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5 font-mono">
                        Lead Time: <strong>{task.leadTimeDays || task.deadlineDaysBeforeEvent} days</strong> · Category: {task.category}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                    <button
                      type="button"
                      onClick={() => onCycleTaskStatus(task.id)}
                      className={`utsav-btn text-xs px-2.5 py-1 font-semibold ${
                        task.status === "completed"
                          ? "utsav-badge-ontrack border-emerald-300"
                          : task.status === "in_progress"
                          ? "utsav-badge-timeline border-amber-300"
                          : "bg-slate-100 text-slate-700 border-slate-300"
                      }`}
                    >
                      {task.status === "completed" && <CheckCircle2Icon className="w-3.5 h-3.5" />}
                      {task.status === "pending" && hasUncompletedPrereq && <Lock className="w-3.5 h-3.5" />}
                      {task.status === "pending" && !hasUncompletedPrereq && <Unlock className="w-3.5 h-3.5" />}
                      <span className="capitalize">{task.status.replace("_", " ")}</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* SECTION 3: PLAIN-TEXT VENDOR QUOTE AUDITOR */}
      {showVendor && (
        <section
          aria-labelledby="vendor-auditor-title"
          className="utsav-card"
        >
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
            Per <code className="bg-slate-100 px-1 py-0.5 rounded font-mono">ADR-5</code>, vendor quotes are audited from plain-text WhatsApp snippets. The engine audits omitted 18% GST, generator fuel running hours, and hall cleaning deposits.
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
                className="utsav-btn utsav-btn-primary text-xs px-3 py-1.5 font-semibold"
              >
                Audit Vendor Note
              </button>
            </div>
          </div>

          {/* Audit Results Card */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
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

            {/* Flagged Hidden Costs */}
            <div className="mb-3">
              <div className="flex items-center gap-1.5 text-xs font-bold text-amber-900 mb-1.5">
                <AlertCircle className="w-3.5 h-3.5 text-amber-600" aria-hidden="true" />
                <span>Flagged Potential Hidden Costs:</span>
              </div>
              <ul className="text-xs text-slate-700 list-disc list-inside space-y-1">
                {vendorAudit.flaggedHiddenCosts.map((cost, cIdx) => (
                  <li key={cIdx} className="text-[11px] leading-snug">
                    {cost}
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
                      className="bg-white border border-slate-200 rounded-lg p-2.5 flex items-center justify-between gap-3 text-xs"
                    >
                      <span className="text-slate-700 text-[11px] leading-snug">&quot;{q}&quot;</span>
                      <a
                        href={waUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="utsav-btn bg-emerald-600 text-white hover:bg-emerald-700 text-[11px] px-2.5 py-1 font-semibold shrink-0 flex items-center gap-1"
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
    </div>
  );
};

const CheckCircle2Icon = ({ className }: { className?: string }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <circle cx="12" cy="12" r="10" />
    <path d="m9 12 2 2 4-4" />
  </svg>
);
