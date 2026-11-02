/**
 * Vendor Audit Section Component — Plain-text vendor quote auditor, hidden cost detector, and WhatsApp negotiation generator.
 */
import type { FC } from "react";
import {
  AlertCircle,
  MessageSquare,
  Sparkles,
  ExternalLink,
  ArrowRight,
  CheckCircle2
} from "lucide-react";
import {
  BudgetItem,
  MilestoneTask,
  VendorAuditResult
} from "../../types/planner";
import { generateWhatsAppLink } from "../../lib/plannerEngine";
import { logActivityEvent } from "../../lib/services/event-logger";
import { TopicTabId } from "../TopicTabs";

interface VendorAuditSectionProps {
  vendorNote: string;
  setVendorNote: (note: string) => void;
  vendorAudit: VendorAuditResult;
  isAuditing: boolean;
  auditProvenance: "ai" | "fallback";
  handleAudit: () => void;
  budgetItems: BudgetItem[];
  activeTargetItem?: BudgetItem;
  setSelectedTargetItemId: (id: string) => void;
  syncFeedback: {
    vendorName: string;
    amount: number;
    categoryLabel: string;
    milestoneTitle?: string;
  } | null;
  handleSyncVendorQuoteToBudget: () => void;
  vendorPhone: string;
  onTabChange?: (tab: TopicTabId) => void;
}

export const VendorAuditSection: FC<VendorAuditSectionProps> = ({
  vendorNote,
  setVendorNote,
  vendorAudit,
  isAuditing,
  auditProvenance,
  handleAudit,
  budgetItems,
  activeTargetItem,
  setSelectedTargetItemId,
  syncFeedback,
  handleSyncVendorQuoteToBudget,
  vendorPhone,
  onTabChange
}) => {
  return (
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
            disabled={isAuditing}
            className="utsav-btn utsav-btn-primary text-xs px-3.5 py-1.5 font-semibold cursor-pointer disabled:opacity-60 flex items-center gap-1.5"
          >
            {isAuditing && <Sparkles className="w-3 h-3 text-amber-300 animate-spin" aria-hidden="true" />}
            <span>{isAuditing ? "Auditing with Gemini 3.5..." : "Audit Vendor Note"}</span>
          </button>
        </div>
      </div>

      {/* Audit Results Card */}
      <div
        className="bg-slate-50 border border-slate-200 rounded-xl p-4 shadow-xs"
        aria-live="polite"
        aria-busy={isAuditing}
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
          <span
            className={`utsav-badge text-[10px] font-semibold border ${
              auditProvenance === "ai"
                ? "bg-emerald-50 text-emerald-800 border-emerald-300"
                : "utsav-badge-ontrack"
            }`}
          >
            {auditProvenance === "ai" ? "✨ Gemini 3.5 Live AI Audit" : "🛡️ Deterministic Guard Active"}
          </span>
        </div>

        {/* INTEGRATION & CLOSED-LOOP BUDGET SYNC CARD */}
        <div className="bg-white border-2 border-indigo-200 rounded-xl p-3.5 mb-4 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-indigo-100 pb-3 mb-3">
            <div className="flex items-start gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold text-sm shrink-0">
                ⚡
              </div>
              <div>
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wide flex items-center gap-1.5">
                  <span>Integrate Quote with Event Budget &amp; Milestones</span>
                  <span className="text-[10px] bg-indigo-50 text-indigo-700 border border-indigo-200 px-1.5 py-0.2 rounded font-mono font-semibold">
                    Closed Loop
                  </span>
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Directly apply this audited ₹{vendorAudit.quotedAmount.toLocaleString("en-IN")} quote into your budget allocation ledger and advance dependent milestones.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <label htmlFor="target-budget-item-select" className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                Target Category:
              </label>
              <select
                id="target-budget-item-select"
                value={activeTargetItem?.id || ""}
                onChange={(e) => setSelectedTargetItemId(e.target.value)}
                className="utsav-select text-xs font-semibold py-1 px-2 border-slate-300 rounded bg-slate-50"
                aria-label="Select target budget category to apply quote"
              >
                {budgetItems.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.label} (Current: ₹{b.allocatedAmount.toLocaleString("en-IN")})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {syncFeedback ? (
            <div className="bg-emerald-50 border border-emerald-300 rounded-lg p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span className="text-xs font-semibold text-emerald-950">
                  Applied <strong>₹{syncFeedback.amount.toLocaleString("en-IN")}</strong> to <strong>{syncFeedback.categoryLabel}</strong> (Verified Quote Locked).
                  {syncFeedback.milestoneTitle && (
                    <span className="text-emerald-800 font-normal"> Linked milestone <em>&quot;{syncFeedback.milestoneTitle}&quot;</em> progressed.</span>
                  )}
                </span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {onTabChange && (
                  <button
                    type="button"
                    onClick={() => onTabChange("budget")}
                    className="utsav-btn bg-emerald-700 hover:bg-emerald-800 text-white text-[11px] px-2.5 py-1 font-bold shadow-xs cursor-pointer flex items-center gap-1"
                  >
                    <span>View in Step 2: Budget</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="text-xs text-slate-600 flex flex-wrap items-center gap-x-4 gap-y-1">
                <span>
                  Target Line: <strong className="text-slate-900">{activeTargetItem?.label}</strong>
                </span>
                <span>
                  Current: <span className="font-mono font-bold text-slate-800">₹{activeTargetItem?.allocatedAmount.toLocaleString("en-IN")}</span>
                  {activeTargetItem?.isEstimate && <span className="text-amber-700 font-bold ml-1">(Unverified)</span>}
                </span>
                <span>
                  Audited Quote: <span className="font-mono font-bold text-indigo-700">₹{vendorAudit.quotedAmount.toLocaleString("en-IN")}</span>
                </span>
                {activeTargetItem && (
                  <span className="font-mono text-[11px] font-bold">
                    {vendorAudit.quotedAmount <= activeTargetItem.allocatedAmount ? (
                      <span className="text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded">
                        Saves ₹{(activeTargetItem.allocatedAmount - vendorAudit.quotedAmount).toLocaleString("en-IN")}
                      </span>
                    ) : (
                      <span className="text-rose-700 bg-rose-50 border border-rose-200 px-1.5 py-0.5 rounded">
                        Deficit +₹{(vendorAudit.quotedAmount - activeTargetItem.allocatedAmount).toLocaleString("en-IN")}
                      </span>
                    )}
                  </span>
                )}
              </div>

              <button
                type="button"
                onClick={handleSyncVendorQuoteToBudget}
                className="utsav-btn bg-indigo-600 hover:bg-indigo-700 text-white text-xs px-3.5 py-1.5 font-bold shadow-xs cursor-pointer flex items-center justify-center gap-1.5 shrink-0"
              >
                <span>⚡ Apply to Budget &amp; Lock Verified</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>

        {/* Flagged Hidden Costs with Solid High-Contrast Indicator */}
        <div className="mb-3">
          <div className="flex items-center gap-1.5 text-xs font-bold text-rose-900 mb-1.5">
            <span className="w-2 h-2 rounded-full bg-rose-600 inline-block shrink-0" aria-hidden="true" />
            <AlertCircle className="w-3.5 h-3.5 text-rose-600" aria-hidden="true" />
            <span>Flagged Potential Hidden Costs:</span>
          </div>
          <ul className="text-xs text-slate-700 space-y-1.5">
            {vendorAudit.flaggedHiddenCosts.map((cost, cIdx) => (
              <li
                key={cIdx}
                className="border-2 border-rose-300 bg-rose-50 rounded-lg p-2 text-[11px] leading-snug flex items-start gap-2"
              >
                <span className="w-2 h-2 rounded-full bg-rose-600 mt-1 shrink-0" aria-hidden="true" />
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
  );
};
