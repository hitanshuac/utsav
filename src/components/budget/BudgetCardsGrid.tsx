/**
 * Budget Cards Grid Component — Renders category budget allocations, status badges, and inline inline editors.
 */
import type { FC } from "react";
import { useState } from "react";
import { Edit3 } from "lucide-react";
import {
  BudgetItem,
  ScaledCategory,
  PlanningTriageTier,
  PersonaLens
} from "../../types/planner";
import { TopicTabId } from "../TopicTabs";

interface BudgetCardsGridProps {
  sortedBudget: BudgetItem[];
  scaledCategories: ScaledCategory[];
  guestCount: number;
  baseGuestCount: number;
  totalBudgetCap: number;
  variance: number;
  triageTier: PlanningTriageTier;
  persona: PersonaLens;
  t: {
    scalesWithGuests: string;
    fixedContract: string;
    unverifiedEstimate: string;
    verifiedQuote: string;
  };
  onToggleVerified: (itemId: string) => void;
  onUpdateBudgetItem?: (itemId: string, newAmount: number) => void;
  onStartVendorAuditForCategory: (category: string) => void;
  onTabChange?: (tab: TopicTabId) => void;
  onSearchChange?: (query: string) => void;
}

export const BudgetCardsGrid: FC<BudgetCardsGridProps> = ({
  sortedBudget,
  scaledCategories,
  guestCount,
  baseGuestCount,
  totalBudgetCap,
  variance,
  triageTier,
  persona,
  t,
  onToggleVerified,
  onUpdateBudgetItem,
  onStartVendorAuditForCategory,
  onTabChange,
  onSearchChange
}) => {
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editAmountValue, setEditAmountValue] = useState<string>("");

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 mb-5">
      {sortedBudget.map((item: BudgetItem) => {
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
                ? "border-2 border-rose-400 bg-rose-50/40 hover:border-rose-500"
                : "bg-white border border-slate-200 hover:border-slate-300"
            }`}
          >
            <div className="flex items-start justify-between gap-2 mb-2">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  {isCardCritical && (
                    <span className="w-2 h-2 rounded-full bg-rose-600 inline-block shrink-0" aria-hidden="true" />
                  )}
                  <span className="text-xs font-bold text-slate-900">{item.label}</span>

                  {persona === "family_host" && item.category === "catering" && (
                    <span className="utsav-badge utsav-badge-ontrack text-[10px]">
                      👑 Hospitality Focus
                    </span>
                  )}
                  {persona === "family_host" && item.category === "venue" && (
                    <span className="utsav-badge utsav-badge-vendor text-[10px]">
                      👑 Host Essential
                    </span>
                  )}
                  {persona === "wedding_coordinator" && item.isEstimate && (
                    <span className="utsav-badge utsav-badge-timeline text-[10px]">
                      ⚡ SLA Check · Unverified
                    </span>
                  )}
                  {persona === "wedding_coordinator" && !item.isEstimate && item.allocatedAmount > totalBudgetCap * 0.25 && (
                    <span className="utsav-badge utsav-badge-vendor text-[10px]">
                      ⚡ Major Contract
                    </span>
                  )}
                  {persona === "community_organizer" && item.category === "logistics" && (
                    <span className="utsav-badge utsav-badge-critical text-[10px]">
                      🛡️ Public Safety Mandate
                    </span>
                  )}
                  {persona === "community_organizer" && item.category === "venue" && (
                    <span className="utsav-badge utsav-badge-vendor text-[10px]">
                      🛡️ Municipal Ground NOC
                    </span>
                  )}
                </div>
                <span className="text-[11px] font-mono uppercase text-slate-500">
                  {item.category} · {scaledCat?.isVariable ? t.scalesWithGuests : t.fixedContract}
                </span>
              </div>

              <div className="flex items-center gap-1.5 flex-wrap">
                {item.isEstimate && (
                  <button
                    type="button"
                    onClick={() => onStartVendorAuditForCategory(item.category)}
                    className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 hover:bg-amber-100 border border-amber-300 text-amber-800 cursor-pointer flex items-center gap-1 transition-colors"
                    title={`Audit quotation for ${item.label} in Step 3`}
                  >
                    <span>📜 Audit Quote →</span>
                  </button>
                )}
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
            </div>

            {item.notes && (
              <div className="mb-2.5">
                <p className="text-[11px] text-slate-600 italic leading-snug">
                  &quot;{item.notes}&quot;
                </p>
                {item.notes.includes("[Scope Revised") && onTabChange && (
                  <div className="mt-1.5 flex items-center justify-between text-[10px] font-mono">
                    <span className="text-emerald-700 font-bold bg-emerald-50 border border-emerald-200 px-1.5 py-0.2 rounded">
                      📝 Scope Revised
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        onSearchChange?.(item.category);
                        onTabChange("vendor");
                      }}
                      className="text-indigo-600 hover:text-indigo-800 font-bold underline cursor-pointer"
                    >
                      Draft Vendor Addendum →
                    </button>
                  </div>
                )}
              </div>
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
  );
};
