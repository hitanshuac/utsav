import React, { useState } from "react";
import {
  AlertTriangle,
  Plus,
  Trash2,
  ArrowUpRight
} from "lucide-react";
import { calculateBudgetSummary, formatINR } from "../../lib/engine/budget-math";
import { CATEGORY_PASTEL } from "../../lib/pastel";
import { BudgetFilterMode, usePlannerStore } from "../../lib/store/usePlannerStore";
import { EventCategory } from "../../lib/types";

export const BudgetProgress: React.FC = () => {
  const budgetItems = usePlannerStore((s) => s.budgetItems);
  const budgetCap = usePlannerStore((s) => s.budgetCap);
  const budgetFilter = usePlannerStore((s) => s.budgetFilter);
  const highlightedTarget = usePlannerStore((s) => s.highlightedTarget);
  const setBudgetFilter = usePlannerStore((s) => s.setBudgetFilter);
  const navigateToOverview = usePlannerStore((s) => s.navigateToOverview);
  const updateBudgetItem = usePlannerStore((s) => s.updateBudgetItem);
  const toggleBudgetItemVerified = usePlannerStore((s) => s.toggleBudgetItemVerified);
  const removeBudgetItem = usePlannerStore((s) => s.removeBudgetItem);
  const addBudgetItem = usePlannerStore((s) => s.addBudgetItem);

  const [newLabel, setNewLabel] = useState("");
  const [newCategory, setNewCategory] = useState<EventCategory>("catering");
  const [newAmount, setNewAmount] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  const summary = calculateBudgetSummary(budgetItems, budgetCap);

  const filteredItems = budgetItems.filter((item) => {
    if (budgetFilter === "all") return true;
    if (budgetFilter === "estimates") return item.isEstimate;
    if (budgetFilter === "verified") return !item.isEstimate;
    return item.category === budgetFilter;
  });

  const isSectionHighlighted = highlightedTarget?.sectionId === "budget-section";

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanLabel = newLabel.trim();
    const parsedAmount = Number(newAmount);

    if (!cleanLabel) {
      setFormError("Enter item name");
      return;
    }
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      setFormError("Enter positive amount");
      return;
    }

    setFormError(null);
    addBudgetItem({
      category: newCategory,
      label: cleanLabel,
      allocatedAmount: Math.round(parsedAmount),
      actualAmount: 0,
      isEstimate: true,
      notes: ""
    });
    setNewLabel("");
    setNewAmount("");
  };

  const filterButtons: { id: BudgetFilterMode; label: string; count?: number }[] = [
    { id: "all", label: "All", count: budgetItems.length },
    {
      id: "estimates",
      label: "Estimates",
      count: budgetItems.filter((i) => i.isEstimate).length
    },
    {
      id: "verified",
      label: "Verified",
      count: budgetItems.filter((i) => !i.isEstimate).length
    },
    { id: "venue", label: "Venue" },
    { id: "catering", label: "Catering" },
    { id: "decor", label: "Decor" },
    { id: "photography", label: "Photo" },
    { id: "logistics", label: "Logistics" }
  ];

  return (
    <section
      aria-labelledby="budget-ledger-heading"
      className={`bg-white border rounded-xl p-5 flex flex-col gap-4 transition-all shadow-xs ${
        isSectionHighlighted
          ? "border-slate-900 ring-2 ring-slate-900/10"
          : "border-slate-200"
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-3">
        <div>
          <h2 id="budget-ledger-heading" className="text-base font-bold text-slate-900">
            Budget Ledger
          </h2>
          <p className="text-xs text-slate-500">
            {budgetItems.length} line items totaling {formatINR(summary.totalAllocated)}
          </p>
        </div>

        {summary.isOverBudget && (
          <div className="flex items-center gap-2 text-xs font-semibold text-rose-700 bg-rose-50 border border-rose-200 px-3 py-1.5 rounded-lg">
            <AlertTriangle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
            <span>Overrun: {formatINR(Math.abs(summary.variance))}</span>
            <button
              type="button"
              onClick={() =>
                navigateToOverview({
                  sectionId: "tradeoff-section",
                  label: "Trade-offs"
                })
              }
              className="inline-flex items-center gap-0.5 underline hover:text-rose-900 ml-1"
            >
              Resolve <ArrowUpRight className="w-3 h-3" />
            </button>
          </div>
        )}
      </div>

      {/* Filter Tabs */}
      <div
        role="group"
        aria-label="Filter budget items"
        className="flex flex-wrap items-center gap-1.5"
      >
        {filterButtons.map((btn) => {
          const isActive = budgetFilter === btn.id;
          const isCategory = btn.id in CATEGORY_PASTEL;
          const pastel = isCategory ? CATEGORY_PASTEL[btn.id as EventCategory] : null;

          return (
            <button
              key={btn.id}
              type="button"
              onClick={() => setBudgetFilter(btn.id)}
              aria-pressed={isActive}
              className={`px-2.5 py-1 text-xs font-medium rounded-md transition-all whitespace-nowrap shrink-0 flex items-center gap-1.5 border ${
                isActive
                  ? "bg-slate-900 text-white border-slate-900 shadow-2xs"
                  : pastel
                  ? `${pastel.badgeBg} ${pastel.badgeText} border-transparent hover:opacity-80`
                  : "bg-slate-100 text-slate-600 border-transparent hover:bg-slate-200"
              }`}
            >
              {pastel && (
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    isActive ? "bg-white" : pastel.dot
                  }`}
                  aria-hidden="true"
                />
              )}
              <span>{btn.label}</span>
              {typeof btn.count === "number" && (
                <span
                  className={`font-mono text-[11px] ${
                    isActive ? "text-slate-300" : "text-slate-400"
                  }`}
                >
                  {btn.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Line Item Table */}
      <div className="overflow-x-auto border border-slate-200 rounded-lg">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-500">
              <th className="py-2.5 px-3">Item</th>
              <th className="py-2.5 px-3">Category</th>
              <th className="py-2.5 px-3">Status</th>
              <th className="py-2.5 px-3 text-right">Allocated (₹)</th>
              <th className="py-2.5 px-3 text-right w-12"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-sm">
            {filteredItems.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-8 px-4 text-center text-xs text-slate-400">
                  No items in this view.{" "}
                  <button
                    type="button"
                    onClick={() => setBudgetFilter("all")}
                    className="font-semibold text-slate-800 underline ml-1"
                  >
                    Reset filter
                  </button>
                </td>
              </tr>
            ) : (
              filteredItems.map((item) => {
                const pastel = CATEGORY_PASTEL[item.category] || CATEGORY_PASTEL.miscellaneous;
                const isRowHighlighted = highlightedTarget?.category === item.category;

                return (
                  <tr
                    key={item.id}
                    id={`budget-row-${item.category}`}
                    className={`transition-colors ${
                      isRowHighlighted
                        ? "bg-slate-100/80"
                        : "hover:bg-slate-50/60"
                    }`}
                  >
                    <td className="py-2.5 px-3">
                      <div className="font-medium text-slate-900">{item.label}</div>
                      {item.notes && (
                        <div className="text-[11px] text-slate-400 mt-0.5">{item.notes}</div>
                      )}
                    </td>
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full ${pastel.badgeBg} ${pastel.badgeText}`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${pastel.dot}`} />
                        {pastel.name}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => toggleBudgetItemVerified(item.id)}
                        className={`inline-flex items-center text-xs font-semibold px-2 py-0.5 rounded-md border transition-colors ${
                          item.isEstimate
                            ? "bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100"
                            : "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
                        }`}
                      >
                        {item.isEstimate ? "Estimate" : "Verified"}
                      </button>
                    </td>
                    <td className="py-2.5 px-3 text-right whitespace-nowrap">
                      <input
                        type="number"
                        min={0}
                        step={5000}
                        aria-label={`Amount for ${item.label}`}
                        value={item.allocatedAmount}
                        onChange={(e) => {
                          const val = Math.max(0, Number(e.target.value) || 0);
                          updateBudgetItem(item.id, {
                            allocatedAmount: val,
                            actualAmount: item.isEstimate ? 0 : val
                          });
                        }}
                        className="w-28 text-right font-mono text-sm font-medium text-slate-900 bg-slate-50 border border-slate-200 rounded-md px-2 py-1 tabular-nums focus:outline-none focus:ring-1 focus:ring-slate-900"
                      />
                    </td>
                    <td className="py-2.5 px-3 text-right whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => removeBudgetItem(item.id)}
                        aria-label={`Delete ${item.label}`}
                        className="p-1 text-slate-400 hover:text-rose-600 rounded transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Add Line Item */}
      <form
        onSubmit={handleAddSubmit}
        aria-label="Add budget item"
        className="pt-2 border-t border-slate-100 flex flex-col gap-2"
      >
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
          <div className="sm:col-span-5">
            <input
              type="text"
              placeholder="Item title (e.g., Sangeet Sound & Dhol)"
              value={newLabel}
              onChange={(e) => setNewLabel(e.target.value)}
              className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900"
            />
          </div>

          <div className="sm:col-span-3">
            <select
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value as EventCategory)}
              className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900"
            >
              <option value="venue">Venue (Fixed)</option>
              <option value="catering">Catering (Scales w/ Guests)</option>
              <option value="decor">Decor (Fixed)</option>
              <option value="photography">Photography (Fixed)</option>
              <option value="logistics">Logistics (Scales w/ Guests)</option>
              <option value="miscellaneous">Miscellaneous</option>
            </select>
          </div>

          <div className="sm:col-span-2">
            <input
              type="number"
              min={1}
              placeholder="Amount (₹)"
              value={newAmount}
              onChange={(e) => setNewAmount(e.target.value)}
              className="w-full px-2.5 py-1.5 text-xs font-mono bg-slate-50 border border-slate-200 rounded-lg text-slate-900 tabular-nums focus:outline-none focus:ring-1 focus:ring-slate-900"
            />
          </div>

          <div className="sm:col-span-2">
            <button
              type="submit"
              className="w-full inline-flex items-center justify-center gap-1 px-3 py-1.5 text-xs font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors whitespace-nowrap h-full"
            >
              <Plus className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Add</span>
            </button>
          </div>
        </div>
        {formError && (
          <p role="alert" className="text-xs text-rose-600 font-medium">
            {formError}
          </p>
        )}
      </form>
    </section>
  );
};
