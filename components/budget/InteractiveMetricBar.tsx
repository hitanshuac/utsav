import React from "react";
import { Plus, Minus } from "lucide-react";
import { calculateBudgetSummary, formatINR } from "../../lib/engine/budget-math";
import { usePlannerStore } from "../../lib/store/usePlannerStore";

export const InteractiveMetricBar: React.FC = () => {
  const budgetItems = usePlannerStore((s) => s.budgetItems);
  const budgetCap = usePlannerStore((s) => s.budgetCap);
  const guestCount = usePlannerStore((s) => s.guestCount);
  const setGuestCountWithScaling = usePlannerStore((s) => s.setGuestCountWithScaling);
  const setActiveTab = usePlannerStore((s) => s.setActiveTab);

  const summary = calculateBudgetSummary(budgetItems, budgetCap);

  return (
    <section aria-label="Key Numbers" className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {/* 1. Total Budget */}
      <button
        type="button"
        onClick={() => setActiveTab("budget")}
        className="p-3.5 rounded-xl border border-purple-200/70 bg-purple-50/40 hover:bg-purple-50 transition-colors text-left flex flex-col justify-between"
      >
        <span className="text-xs font-medium text-purple-900">Budget Cap</span>
        <span className="font-mono text-lg font-bold text-slate-900 tabular-nums mt-0.5">
          {formatINR(summary.totalCap)}
        </span>
      </button>

      {/* 2. Total Allocated */}
      <button
        type="button"
        onClick={() => setActiveTab("budget")}
        className="p-3.5 rounded-xl border border-sky-200/70 bg-sky-50/40 hover:bg-sky-50 transition-colors text-left flex flex-col justify-between"
      >
        <div className="flex items-center justify-between w-full">
          <span className="text-xs font-medium text-sky-900">Allocated</span>
          <span className="text-[11px] font-mono text-sky-700 tabular-nums">
            {summary.utilizationPercent.toFixed(0)}%
          </span>
        </div>
        <span
          data-testid="budget-total-allocated"
          className="font-mono text-lg font-bold text-slate-900 tabular-nums mt-0.5"
        >
          {formatINR(summary.totalAllocated)}
        </span>
      </button>

      {/* 3. Variance / Balance */}
      <button
        type="button"
        onClick={() => setActiveTab(summary.isOverBudget ? "tradeoffs" : "budget")}
        className={`p-3.5 rounded-xl border transition-colors text-left flex flex-col justify-between ${
          summary.isOverBudget
            ? "border-rose-300 bg-rose-50/70 hover:bg-rose-50"
            : "border-emerald-200/70 bg-emerald-50/40 hover:bg-emerald-50"
        }`}
      >
        <span
          className={`text-xs font-medium ${
            summary.isOverBudget ? "text-rose-900 font-semibold" : "text-emerald-900"
          }`}
        >
          {summary.isOverBudget ? "Overrun" : "Balance"}
        </span>
        <span
          data-testid="budget-variance-value"
          className={`font-mono text-lg font-bold tabular-nums mt-0.5 ${
            summary.isOverBudget ? "text-rose-700" : "text-emerald-700"
          }`}
        >
          {summary.variance >= 0 ? `+${formatINR(summary.variance)}` : formatINR(summary.variance)}
        </span>
      </button>

      {/* 4. Guests with Quick Adjust */}
      <div
        onClick={() => setActiveTab("budget")}
        className="p-3.5 rounded-xl border border-amber-200/70 bg-amber-50/40 hover:bg-amber-50/70 transition-colors cursor-pointer flex flex-col justify-between"
      >
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-amber-900">Guests & Buffer</span>
          <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              onClick={() => setGuestCountWithScaling(Math.max(20, guestCount - 20))}
              aria-label="Fewer guests"
              className="p-0.5 rounded border border-amber-300 bg-white text-amber-900 hover:bg-amber-100 transition-colors"
            >
              <Minus className="w-3 h-3" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={() => setGuestCountWithScaling(Math.min(600, guestCount + 20))}
              aria-label="More guests"
              className="p-0.5 rounded border border-amber-300 bg-white text-amber-900 hover:bg-amber-100 transition-colors"
            >
              <Plus className="w-3 h-3" aria-hidden="true" />
            </button>
          </div>
        </div>
        <span
          data-testid="kpi-guest-count"
          className="font-mono text-lg font-bold text-slate-900 tabular-nums mt-0.5"
        >
          {guestCount} pax
        </span>
      </div>
    </section>
  );
};
