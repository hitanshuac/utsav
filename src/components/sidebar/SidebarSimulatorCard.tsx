/**
 * Sidebar Mid-Flight What-If Simulator Card component.
 */
import type { FC } from "react";
import { Sliders } from "lucide-react";

interface SidebarSimulatorCardProps {
  guestCount: number;
  onGuestCountChange: (count: number) => void;
  budgetCap: number;
  onBudgetCapChange: (cap: number) => void;
  daysRemaining: number;
  onDaysRemainingChange: (days: number) => void;
  onSimulateMidFlightShift?: () => void;
}

export const SidebarSimulatorCard: FC<SidebarSimulatorCardProps> = ({
  guestCount,
  onGuestCountChange,
  budgetCap,
  onBudgetCapChange,
  daysRemaining,
  onDaysRemainingChange,
  onSimulateMidFlightShift
}) => {
  return (
    <div className="utsav-card shadow-xs">
      <div className="utsav-card-header">
        <h2 className="utsav-card-title flex items-center gap-2">
          <Sliders className="w-4 h-4 text-orange-600" aria-hidden="true" />
          <span>Mid-Flight What-If Simulator</span>
        </h2>
        <span className="utsav-badge utsav-badge-ontrack text-[10px]">Realtime</span>
      </div>

      <p className="text-xs text-slate-500 mb-4">
        Adjust inputs dynamically to stress-test budget capacity and timeline feasibility.
      </p>

      {/* SLIDER 1: GUEST COUNT */}
      <div className="utsav-slider-container">
        <div className="utsav-slider-label">
          <span>Guest Count (Headcount)</span>
          <strong className="text-slate-900 font-mono tabular-nums">{guestCount} Pax</strong>
        </div>
        <input
          type="range"
          min="20"
          max="500"
          step="5"
          value={guestCount}
          onChange={(e) => onGuestCountChange(parseInt(e.target.value, 10))}
          className="utsav-slider"
          aria-label="Guest Count"
          aria-valuemin={20}
          aria-valuemax={500}
          aria-valuenow={guestCount}
        />
        <div className="flex justify-between text-[10px] text-slate-400 font-mono">
          <span>20 Pax</span>
          <span>250 Pax</span>
          <span>500 Pax</span>
        </div>
      </div>

      {/* SLIDER 2: TOTAL BUDGET CAP */}
      <div className="utsav-slider-container">
        <div className="utsav-slider-label">
          <span>Total Budget Cap</span>
          <strong className="text-slate-900 font-mono tabular-nums">
            ₹{budgetCap.toLocaleString("en-IN")}
          </strong>
        </div>
        <input
          type="range"
          min="50000"
          max="2500000"
          step="10000"
          value={budgetCap}
          onChange={(e) => onBudgetCapChange(parseInt(e.target.value, 10))}
          className="utsav-slider"
          aria-label="Total Budget Cap"
          aria-valuemin={50000}
          aria-valuemax={2500000}
          aria-valuenow={budgetCap}
        />
        <div className="flex justify-between text-[10px] text-slate-400 font-mono">
          <span>₹50K</span>
          <span>₹12.5L</span>
          <span>₹25L</span>
        </div>
      </div>

      {/* SLIDER 3: DAYS TO EVENT */}
      <div className="utsav-slider-container mb-0">
        <div className="utsav-slider-label">
          <span>Days to Event</span>
          <strong className="text-slate-900 font-mono tabular-nums">{daysRemaining} Days</strong>
        </div>
        <input
          type="range"
          min="7"
          max="365"
          step="1"
          value={daysRemaining}
          onChange={(e) => onDaysRemainingChange(parseInt(e.target.value, 10))}
          className="utsav-slider"
          aria-label="Days to Event"
          aria-valuemin={7}
          aria-valuemax={365}
          aria-valuenow={daysRemaining}
        />
        <div className="flex justify-between text-[10px] text-slate-400 font-mono">
          <span>7 Days</span>
          <span>180 Days</span>
          <span>365 Days</span>
        </div>
      </div>

      {/* 1-Click Mid-Flight Shift Simulator */}
      <div className="mt-4 pt-3 border-t border-slate-200">
        <button
          type="button"
          onClick={() => {
            if (onSimulateMidFlightShift) {
              onSimulateMidFlightShift();
            } else {
              onGuestCountChange(guestCount + 50);
              onBudgetCapChange(Math.round(budgetCap * 0.9));
              onDaysRemainingChange(Math.max(7, daysRemaining - 14));
            }
          }}
          style={{
            padding: "12px 16px",
            width: "100%",
            whiteSpace: "normal",
            textAlign: "center",
            lineHeight: 1.3
          }}
          className="utsav-btn bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold rounded-lg shadow-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
          aria-label="Run Stress Test (+50 Pax, -14d)"
        >
          <span>⚡ Run Stress Test (+50 Pax, -14d)</span>
        </button>
      </div>
    </div>
  );
};
