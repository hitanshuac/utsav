import React from "react";
import { FileSearch, AlertCircle, CheckCircle, ArrowRight } from "lucide-react";
import { formatINR } from "../../lib/engine/budget-math";
import { CATEGORY_PASTEL } from "../../lib/pastel";
import { usePlannerStore } from "../../lib/store/usePlannerStore";
import { WhatsAppAction } from "./WhatsAppAction";

const SAMPLE_VENDOR_NOTES = [
  {
    label: "Catering Quote",
    text: "Royal Caterers: ₹650 per plate, minimum 180 pax. Waitstaff included. Cleaning fee ₹5000 extra. GST extra at 18%."
  },
  {
    label: "Mandap Decor",
    text: "Subham Floral & Tent House: ₹1,15,000 package for main stage mandap, entrance floral gate, and warm LED par lights. Generator diesel extra at actuals. Night dismantling labor ₹4500 extra. 18% GST extra."
  },
  {
    label: "Wedding Cinema",
    text: "LensCraft Wedding Cinema: ₹1,20,000 for 2 candid photographers + 1 drone operator. 4K highlight reel included. Raw hard drive extra. Post-11 PM overtime billed at ₹8000/hour."
  }
];

export const VendorAuditor: React.FC = () => {
  const vendorNoteInput = usePlannerStore((s) => s.vendorNoteInput);
  const vendorPhone = usePlannerStore((s) => s.vendorPhone);
  const latestAuditResult = usePlannerStore((s) => s.latestAuditResult);
  const isAuditingVendor = usePlannerStore((s) => s.isAuditingVendor);
  const guestCount = usePlannerStore((s) => s.guestCount);
  const highlightedTarget = usePlannerStore((s) => s.highlightedTarget);
  const setVendorNoteInput = usePlannerStore((s) => s.setVendorNoteInput);
  const setVendorPhone = usePlannerStore((s) => s.setVendorPhone);
  const runVendorAudit = usePlannerStore((s) => s.runVendorAudit);
  const applyVendorQuoteToBudget = usePlannerStore((s) => s.applyVendorQuoteToBudget);

  const isSectionHighlighted = highlightedTarget?.sectionId === "vendor-section";

  return (
    <section
      aria-labelledby="vendor-auditor-heading"
      className={`bg-white border rounded-xl p-5 flex flex-col gap-4 transition-all shadow-xs ${
        isSectionHighlighted
          ? "border-slate-900 ring-2 ring-slate-900/10"
          : "border-slate-200"
      }`}
    >
      <div className="border-b border-slate-100 pb-3 flex items-center justify-between gap-2">
        <div>
          <h2 id="vendor-auditor-heading" className="text-base font-bold text-slate-900">
            Vendor Notes & Quotes
          </h2>
          <p className="text-xs text-slate-500">
            Audit rough quotes to detect hidden taxes, transport extras, or overtime clauses.
          </p>
        </div>
        <span className="text-xs font-mono text-slate-400">
          Base: {guestCount} guests
        </span>
      </div>

      {/* Preset Samples */}
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="text-xs text-slate-500 mr-1">Samples:</span>
        {SAMPLE_VENDOR_NOTES.map((sample) => (
          <button
            key={sample.label}
            type="button"
            onClick={() => setVendorNoteInput(sample.text)}
            className="px-2.5 py-1 text-xs font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors"
          >
            {sample.label}
          </button>
        ))}
      </div>

      {/* Input */}
      <div className="flex flex-col gap-2">
        <textarea
          id="vendor-rough-notes"
          rows={3}
          value={vendorNoteInput}
          onChange={(e) => setVendorNoteInput(e.target.value)}
          placeholder="Paste quotation text or WhatsApp message here..."
          className="w-full p-3 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900"
        />

        <div className="flex items-center justify-end">
          <button
            type="button"
            onClick={() => runVendorAudit()}
            disabled={isAuditingVendor || !vendorNoteInput.trim()}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800 disabled:opacity-50 transition-colors"
          >
            <FileSearch className="w-3.5 h-3.5" aria-hidden="true" />
            <span>{isAuditingVendor ? "Auditing..." : "Audit Quote"}</span>
          </button>
        </div>
      </div>

      {/* Audited Result Card */}
      {latestAuditResult && (
        <div className="bg-slate-50/70 border border-slate-200 rounded-lg p-4 flex flex-col gap-3.5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200/80 pb-3">
            <div>
              <span className={`inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full ${CATEGORY_PASTEL.catering.badgeBg} ${CATEGORY_PASTEL.catering.badgeText}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${CATEGORY_PASTEL.catering.dot}`} />
                Audited Estimate
              </span>
              <h3 className="text-base font-bold text-slate-900 mt-1">
                {latestAuditResult.vendorName}
              </h3>
            </div>

            <div className="flex items-center gap-3">
              <div className="text-right">
                <div className="text-[11px] text-slate-500">Estimate</div>
                <div
                  data-testid="audited-quote-amount"
                  className="font-mono text-base font-bold text-slate-900 tabular-nums"
                >
                  {formatINR(latestAuditResult.quotedAmount)}
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  applyVendorQuoteToBudget(latestAuditResult, "catering");
                  usePlannerStore.getState().navigateToOverview(
                    {
                      sectionId: "budget-section",
                      tab: "budget",
                      category: "catering",
                      label: `${latestAuditResult.vendorName}`
                    },
                    "catering"
                  );
                }}
                className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-slate-900 bg-white border border-slate-300 rounded-md hover:bg-slate-100 transition-colors shadow-2xs"
              >
                <span>Sync to Budget</span>
                <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* Flagged Hidden Costs */}
            <div className="bg-rose-50/70 border border-rose-200/80 rounded-lg p-3 flex flex-col gap-1.5">
              <div className="flex items-center gap-1 text-xs font-bold text-rose-800">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                <span>Flagged Extras</span>
              </div>
              <ul className="space-y-1 text-xs text-rose-950">
                {latestAuditResult.flaggedHiddenCosts.map((clause, i) => (
                  <li key={i} className="flex items-start gap-1.5">
                    <span className="text-rose-500 font-bold">•</span>
                    <span>{clause}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Inclusions */}
            <div className="bg-emerald-50/70 border border-emerald-200/80 rounded-lg p-3 flex flex-col gap-1.5">
              <div className="flex items-center gap-1 text-xs font-bold text-emerald-800">
                <CheckCircle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                <span>Included in Quote</span>
              </div>
              <ul className="space-y-1 text-xs text-emerald-950">
                {latestAuditResult.detectedInclusions.map((inc, i) => (
                  <li key={i} className="flex items-start gap-1.5">
                    <span className="text-emerald-500 font-bold">•</span>
                    <span>{inc}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Negotiation Questions & WhatsApp */}
          <div className="pt-2 border-t border-slate-200/80 flex flex-col gap-2">
            <div className="text-xs font-bold text-slate-800">
              Clarification Checklist
            </div>
            <ol className="list-decimal list-inside space-y-0.5 text-xs text-slate-600">
              {latestAuditResult.negotiationQuestions.map((q, idx) => (
                <li key={idx}>{q}</li>
              ))}
            </ol>
            <WhatsAppAction
              phone={vendorPhone}
              onPhoneChange={setVendorPhone}
              vendorName={latestAuditResult.vendorName}
              questions={latestAuditResult.negotiationQuestions}
            />
          </div>
        </div>
      )}
    </section>
  );
};
