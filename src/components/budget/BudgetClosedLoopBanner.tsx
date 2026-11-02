/**
 * Closed-Loop Human Trade-off Resolution Banner component.
 */
import type { FC } from "react";
import { TopicTabId } from "../TopicTabs";

export interface ClosedLoopNotice {
  title: string;
  message: string;
  affectedCategories?: {
    category: string;
    label: string;
    delta: number;
    newAllocated: number;
    rationale: string;
    vendorName?: string;
  }[];
  actionTab?: TopicTabId;
  actionLabel?: string;
}

interface BudgetClosedLoopBannerProps {
  closedLoopNotice: ClosedLoopNotice;
  onTabChange?: (tab: TopicTabId) => void;
  onSearchChange?: (query: string) => void;
  onDismissClosedLoopNotice?: () => void;
}

export const BudgetClosedLoopBanner: FC<BudgetClosedLoopBannerProps> = ({
  closedLoopNotice,
  onTabChange,
  onSearchChange,
  onDismissClosedLoopNotice
}) => {
  return (
    <div className="bg-emerald-50 border-2 border-emerald-500 rounded-xl p-4 mb-5 shadow-xs">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-emerald-200 pb-3 mb-3">
        <div className="flex items-start gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-bold text-sm shrink-0 mt-0.5">
            ✓
          </div>
          <div>
            <h3 className="text-xs font-bold text-emerald-950 uppercase tracking-wide">
              {closedLoopNotice.title}
            </h3>
            <p className="text-xs text-emerald-900 mt-0.5 leading-relaxed">
              {closedLoopNotice.message}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
          {closedLoopNotice.actionTab && onTabChange && (
            <button
              type="button"
              onClick={() => onTabChange(closedLoopNotice.actionTab!)}
              className="utsav-btn bg-emerald-700 hover:bg-emerald-800 text-white text-xs px-3 py-1.5 font-bold shadow-xs cursor-pointer flex items-center gap-1.5"
            >
              <span>{closedLoopNotice.actionLabel || "Audit Vendor Quotes & Dispatch Addendums →"}</span>
            </button>
          )}
          {onDismissClosedLoopNotice && (
            <button
              type="button"
              onClick={onDismissClosedLoopNotice}
              className="text-xs text-emerald-800 hover:text-emerald-950 font-bold px-2 py-1 cursor-pointer"
              title="Dismiss notice"
            >
              [Dismiss]
            </button>
          )}
        </div>
      </div>

      {closedLoopNotice.affectedCategories && closedLoopNotice.affectedCategories.length > 0 && (
        <div>
          <span className="text-[10px] font-mono font-bold text-emerald-800 uppercase tracking-wider block mb-2">
            Scope Reductions &amp; Contract Addendums Incorporated Into Vendor Ledger Notes:
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {closedLoopNotice.affectedCategories.map((cat, idx) => (
              <div
                key={idx}
                className="bg-white border border-emerald-200 rounded-lg p-2.5 text-xs flex flex-col justify-between"
              >
                <div className="flex items-center justify-between gap-1 mb-1">
                  <strong className="text-slate-900 font-bold">{cat.label}</strong>
                  <span className="font-mono font-bold text-rose-700 bg-rose-50 px-1.5 py-0.2 rounded text-[11px]">
                    {cat.delta < 0
                      ? `-₹${Math.abs(cat.delta).toLocaleString("en-IN")}`
                      : `+₹${cat.delta.toLocaleString("en-IN")}`}
                  </span>
                </div>
                <p className="text-[11px] text-slate-600 italic leading-snug">
                  &quot;{cat.rationale}&quot;
                </p>
                <div className="mt-2 pt-1.5 border-t border-slate-100 flex items-center justify-between text-[10px] font-mono text-slate-500">
                  <span>New Allocation: ₹{cat.newAllocated.toLocaleString("en-IN")}</span>
                  {onTabChange && (
                    <button
                      type="button"
                      onClick={() => {
                        onSearchChange?.(cat.category);
                        onTabChange("vendor");
                      }}
                      className="text-indigo-600 hover:underline font-bold cursor-pointer"
                    >
                      Dispatch Addendum →
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
