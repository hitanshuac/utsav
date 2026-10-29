import React from "react";
import { Users, ShieldCheck, ArrowRight, TrendingUp, Sparkles, AlertCircle } from "lucide-react";
import { calculateGuestBuffer } from "../../lib/engine/guest-buffer";
import { usePlannerStore } from "../../lib/store/usePlannerStore";

export function GuestBufferCalculator() {
  const floatingConfig = usePlannerStore((s) => s.floatingConfig);
  const setFloatingConfig = usePlannerStore((s) => s.setFloatingConfig);
  const syncBufferToCateringBudget = usePlannerStore((s) => s.syncBufferToCateringBudget);
  const budgetItems = usePlannerStore((s) => s.budgetItems);

  const cateringItem = budgetItems.find((b) => b.category === "catering");
  const calculation = calculateGuestBuffer(floatingConfig);

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-2xs space-y-6">
      {/* Title & Indian Wedding Context */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
            <h3 className="text-lg font-bold text-slate-900 tracking-tight">
              Floating Guest & Catering Buffer Calculator
            </h3>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Indian weddings see floating family overflow. Calculate Minimum Guarantee (MG) vs. +15% buffer to avoid punitive night-of plate penalty surcharges.
          </p>
        </div>

        <button
          type="button"
          onClick={syncBufferToCateringBudget}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold bg-slate-900 text-white hover:bg-slate-800 shadow-2xs transition-all active:scale-95"
        >
          <Sparkles className="w-3.5 h-3.5 text-amber-300" />
          Sync to Catering Budget
        </button>
      </div>

      {/* Control Inputs */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
        {/* Cards Invited */}
        <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl">
          <label className="text-[11px] font-semibold text-slate-500 block mb-1">
            Invited Cards
          </label>
          <input
            type="number"
            min={20}
            max={2000}
            step={10}
            value={floatingConfig.cardsInvited}
            onChange={(e) =>
              setFloatingConfig({ cardsInvited: Math.max(1, parseInt(e.target.value) || 1) })
            }
            className="w-full text-base font-bold text-slate-900 bg-white border border-slate-200 rounded-lg px-2.5 py-1 focus:ring-1 focus:ring-slate-800 outline-none"
          />
          <span className="text-[10px] text-slate-400 mt-1 block">Family units</span>
        </div>

        {/* Avg per Card */}
        <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl">
          <label className="text-[11px] font-semibold text-slate-500 block mb-1">
            Avg / Card
          </label>
          <input
            type="number"
            min={1}
            max={5}
            step={0.1}
            value={floatingConfig.avgPerCard}
            onChange={(e) =>
              setFloatingConfig({ avgPerCard: Math.max(1, parseFloat(e.target.value) || 1) })
            }
            className="w-full text-base font-bold text-slate-900 bg-white border border-slate-200 rounded-lg px-2.5 py-1 focus:ring-1 focus:ring-slate-800 outline-none"
          />
          <span className="text-[10px] text-slate-400 mt-1 block">~2.5 in India</span>
        </div>

        {/* MG % Floor */}
        <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl">
          <label className="text-[11px] font-semibold text-slate-500 block mb-1">
            MG Floor %
          </label>
          <select
            value={floatingConfig.mgPercent}
            onChange={(e) => setFloatingConfig({ mgPercent: parseInt(e.target.value) })}
            className="w-full text-sm font-bold text-slate-900 bg-white border border-slate-200 rounded-lg px-2 py-1.5 focus:ring-1 focus:ring-slate-800 outline-none"
          >
            <option value={75}>75% of expected</option>
            <option value={80}>80% of expected</option>
            <option value={85}>85% of expected</option>
            <option value={90}>90% of expected</option>
          </select>
          <span className="text-[10px] text-slate-400 mt-1 block">Min. guarantee</span>
        </div>

        {/* Floating Buffer % */}
        <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl">
          <label className="text-[11px] font-semibold text-slate-500 block mb-1">
            Buffer %
          </label>
          <div className="flex gap-1">
            {[10, 15, 20].map((pct) => (
              <button
                key={pct}
                type="button"
                onClick={() => setFloatingConfig({ bufferPercent: pct })}
                className={`flex-1 py-1 rounded text-xs font-bold transition-all ${
                  floatingConfig.bufferPercent === pct
                    ? "bg-slate-900 text-white"
                    : "bg-white border border-slate-200 text-slate-700 hover:bg-slate-100"
                }`}
              >
                +{pct}%
              </button>
            ))}
          </div>
          <span className="text-[10px] text-slate-400 mt-1 block">Extra plate buffer</span>
        </div>

        {/* Base Plate Rate */}
        <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl">
          <label className="text-[11px] font-semibold text-slate-500 block mb-1">
            Plate Rate (₹)
          </label>
          <input
            type="number"
            min={300}
            max={10000}
            step={50}
            value={floatingConfig.basePlateRate}
            onChange={(e) =>
              setFloatingConfig({ basePlateRate: Math.max(100, parseInt(e.target.value) || 100) })
            }
            className="w-full text-base font-bold text-slate-900 bg-white border border-slate-200 rounded-lg px-2.5 py-1 focus:ring-1 focus:ring-slate-800 outline-none"
          />
          <span className="text-[10px] text-slate-400 mt-1 block">Negotiated rate</span>
        </div>

        {/* Penalty Surcharge % */}
        <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl">
          <label className="text-[11px] font-semibold text-slate-500 block mb-1">
            Night Penalty %
          </label>
          <select
            value={floatingConfig.lastMinutePenaltyPercent}
            onChange={(e) =>
              setFloatingConfig({ lastMinutePenaltyPercent: parseInt(e.target.value) })
            }
            className="w-full text-sm font-bold text-slate-900 bg-white border border-slate-200 rounded-lg px-2 py-1.5 focus:ring-1 focus:ring-slate-800 outline-none"
          >
            <option value={20}>+20% Surcharge</option>
            <option value={30}>+30% Surcharge</option>
            <option value={40}>+40% Surcharge</option>
          </select>
          <span className="text-[10px] text-slate-400 mt-1 block">On-site add-on penalty</span>
        </div>
      </div>

      {/* Result Metrics Strip */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* MG Floor */}
        <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/70">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
            Minimum Guarantee (MG) Floor
          </span>
          <div className="flex items-baseline gap-2 mt-1.5">
            <span className="text-2xl font-black text-slate-900">
              {calculation.mgPlates} plates
            </span>
            <span className="text-xs font-medium text-slate-500">
              (₹{calculation.baseTotalCost.toLocaleString("en-IN")})
            </span>
          </div>
          <p className="text-[11px] text-slate-500 mt-2">
            Guaranteed commitment for {calculation.totalExpectedGuests} expected guests.
          </p>
        </div>

        {/* Smart Buffer Plate Target */}
        <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/60">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider">
              Recommended Contract Buffer
            </span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
              +{floatingConfig.bufferPercent}% SAFE
            </span>
          </div>
          <div className="flex items-baseline gap-2 mt-1.5">
            <span className="text-2xl font-black text-emerald-950">
              {calculation.bufferPlates} plates
            </span>
            <span className="text-xs font-medium text-emerald-800">
              (₹{calculation.bufferedTotalCost.toLocaleString("en-IN")})
            </span>
          </div>
          <p className="text-[11px] text-emerald-700 mt-2">
            Covers {calculation.additionalBufferPlates} extra floating relatives at regular ₹{floatingConfig.basePlateRate} rate.
          </p>
        </div>

        {/* Penalty Avoidance Card */}
        <div className="p-4 rounded-xl border border-amber-200 bg-amber-50/60">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-900 uppercase tracking-wider">
              Night-Of Penalty Avoided
            </span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900">
              SAVINGS
            </span>
          </div>
          <div className="flex items-baseline gap-2 mt-1.5">
            <span className="text-2xl font-black text-amber-950">
              ₹{calculation.projectedPenaltySavings.toLocaleString("en-IN")}
            </span>
          </div>
          <p className="text-[11px] text-amber-800 mt-2">
            Prevents emergency caterer surcharge (₹{Math.round(floatingConfig.basePlateRate * (1 + floatingConfig.lastMinutePenaltyPercent / 100))}/plate).
          </p>
        </div>
      </div>

      {/* Sync Status Banner */}
      {cateringItem && (
        <div className="flex items-center justify-between p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-600">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>
              Current Catering Budget Line Item: <strong>₹{cateringItem.allocatedAmount.toLocaleString("en-IN")}</strong> ({cateringItem.label}).
            </span>
          </div>
          <span className="text-[11px] font-semibold text-slate-500">
            {cateringItem.isEstimate ? "⚠️ Uncommitted Estimate" : "✓ Contracted"}
          </span>
        </div>
      )}
    </div>
  );
}
