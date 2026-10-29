import React from "react";
import { Users, Wallet, Calendar, Plus, Minus } from "lucide-react";
import { formatINR } from "../../lib/engine/budget-math";
import { usePlannerStore } from "../../lib/store/usePlannerStore";

export const QuickAdjustmentBar: React.FC = () => {
  const guestCount = usePlannerStore((s) => s.guestCount);
  const budgetCap = usePlannerStore((s) => s.budgetCap);
  const eventDate = usePlannerStore((s) => s.eventDate);
  const setGuestCountWithScaling = usePlannerStore((s) => s.setGuestCountWithScaling);
  const setBudgetCap = usePlannerStore((s) => s.setBudgetCap);
  const setEventDate = usePlannerStore((s) => s.setEventDate);

  return (
    <section
      aria-label="Event Controls"
      className="bg-white border border-slate-200 rounded-xl p-4 grid grid-cols-1 md:grid-cols-3 gap-5 shadow-xs"
    >
      {/* Guest Count */}
      <div className="flex flex-col justify-between gap-2">
        <div className="flex items-center justify-between">
          <label
            htmlFor="guest-count-slider"
            className="flex items-center gap-1.5 text-xs font-semibold text-slate-800"
          >
            <Users className="w-3.5 h-3.5 text-slate-500" aria-hidden="true" />
            <span>Guests</span>
          </label>
          <span className="font-mono text-xs font-bold text-slate-900 tabular-nums">
            {guestCount} pax
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setGuestCountWithScaling(Math.max(20, guestCount - 20))}
            aria-label="Decrease guests"
            className="p-1 rounded-md border border-slate-200 text-slate-600 hover:bg-slate-100 transition-colors shrink-0"
          >
            <Minus className="w-3.5 h-3.5" aria-hidden="true" />
          </button>
          <input
            id="guest-count-slider"
            type="range"
            min={50}
            max={600}
            step={10}
            value={guestCount}
            onChange={(e) => setGuestCountWithScaling(Number(e.target.value))}
            className="w-full accent-slate-900 cursor-pointer"
          />
          <button
            type="button"
            onClick={() => setGuestCountWithScaling(Math.min(600, guestCount + 20))}
            aria-label="Increase guests"
            className="p-1 rounded-md border border-slate-200 text-slate-600 hover:bg-slate-100 transition-colors shrink-0"
          >
            <Plus className="w-3.5 h-3.5" aria-hidden="true" />
          </button>
        </div>
      </div>

      {/* Budget Cap */}
      <div className="flex flex-col justify-between gap-2 md:border-l md:border-slate-200 md:pl-5">
        <div className="flex items-center justify-between">
          <label
            htmlFor="budget-cap-slider"
            className="flex items-center gap-1.5 text-xs font-semibold text-slate-800"
          >
            <Wallet className="w-3.5 h-3.5 text-slate-500" aria-hidden="true" />
            <span>Budget Cap</span>
          </label>
          <span className="font-mono text-xs font-bold text-slate-900 tabular-nums">
            {formatINR(budgetCap)}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setBudgetCap(Math.max(100000, budgetCap - 50000))}
            aria-label="Decrease budget cap"
            className="p-1 rounded-md border border-slate-200 text-slate-600 hover:bg-slate-100 transition-colors shrink-0"
          >
            <Minus className="w-3.5 h-3.5" aria-hidden="true" />
          </button>
          <input
            id="budget-cap-slider"
            type="range"
            min={200000}
            max={2000000}
            step={25000}
            value={budgetCap}
            onChange={(e) => setBudgetCap(Number(e.target.value))}
            className="w-full accent-slate-900 cursor-pointer"
          />
          <button
            type="button"
            onClick={() => setBudgetCap(Math.min(2000000, budgetCap + 50000))}
            aria-label="Increase budget cap"
            className="p-1 rounded-md border border-slate-200 text-slate-600 hover:bg-slate-100 transition-colors shrink-0"
          >
            <Plus className="w-3.5 h-3.5" aria-hidden="true" />
          </button>
        </div>
      </div>

      {/* Event Target Date */}
      <div className="flex flex-col justify-between gap-2 md:border-l md:border-slate-200 md:pl-5">
        <div className="flex items-center justify-between">
          <label
            htmlFor="event-date-input"
            className="flex items-center gap-1.5 text-xs font-semibold text-slate-800"
          >
            <Calendar className="w-3.5 h-3.5 text-slate-500" aria-hidden="true" />
            <span>Target Date</span>
          </label>
          <span className="font-mono text-xs font-bold text-slate-900">
            {eventDate}
          </span>
        </div>

        <input
          id="event-date-input"
          type="date"
          value={eventDate}
          onChange={(e) => {
            if (e.target.value) setEventDate(e.target.value);
          }}
          className="w-full px-2.5 py-1 text-xs font-mono bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-900"
        />
      </div>
    </section>
  );
};
