import type { FC } from "react";
import { Sliders, Activity, PhoneCall, ExternalLink } from "lucide-react";
import { ScaledCategory, PlanningTriageTier } from "../types/planner";
import { generateWhatsAppLink } from "../lib/plannerEngine";

interface SidebarStackProps {
  guestCount: number;
  onGuestCountChange: (count: number) => void;
  budgetCap: number;
  onBudgetCapChange: (cap: number) => void;
  daysRemaining: number;
  onDaysRemainingChange: (days: number) => void;
  scaledCategories: ScaledCategory[];
  totalAllocated: number;
  variance: number;
  triageTier: PlanningTriageTier;
  urgencyScore: number;
  vendorPhone: string;
}

export const SidebarStack: FC<SidebarStackProps> = ({
  guestCount,
  onGuestCountChange,
  budgetCap,
  onBudgetCapChange,
  daysRemaining,
  onDaysRemainingChange,
  scaledCategories,
  totalAllocated,
  variance,
  triageTier,
  urgencyScore,
  vendorPhone
}) => {
  const verifiedVendors = [
    {
      role: "Royal Banquet Manager",
      name: "Sunil Verma",
      phone: "+91 98101 11223",
      tag: "Venue Locked"
    },
    {
      role: "Head Caterer",
      name: "Rajesh Sharma",
      phone: vendorPhone || "+91 98101 23456",
      tag: "Live Tasting"
    },
    {
      role: "Floral & Stage Lead",
      name: "Deepak Saini",
      phone: "+91 98101 55667",
      tag: "Blueprint Approved"
    }
  ];

  const tierColors: Record<PlanningTriageTier, string> = {
    CRITICAL_OVERRUN: "text-rose-600 bg-rose-50 border-rose-200",
    TIMELINE_BOTTLENECK: "text-amber-700 bg-amber-50 border-amber-200",
    VENDOR_CLARIFICATION: "text-indigo-700 bg-indigo-50 border-indigo-200",
    ON_TRACK: "text-emerald-700 bg-emerald-50 border-emerald-200"
  };

  return (
    <aside className="utsav-r4-sidebar" aria-label="Event Execution Sidebar">
      {/* CARD 1: MID-FLIGHT WHAT-IF SIMULATOR */}
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

        {/* SLIDER 1: GUEST COUNT (20 to 500) */}
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

        {/* SLIDER 2: TOTAL BUDGET CAP (₹50,000 to ₹25,00,000) */}
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

        {/* SLIDER 3: DAYS TO EVENT (7 to 365) */}
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
      </div>

      {/* CARD 2: TRADE-OFF & BOTTLENECK RADAR */}
      <div className="utsav-card shadow-xs">
        <div className="utsav-card-header">
          <h2 className="utsav-card-title flex items-center gap-2">
            <Activity className="w-4 h-4 text-indigo-600" aria-hidden="true" />
            <span>Trade-Off & Bottleneck Radar</span>
          </h2>
          <span className="text-xs font-mono font-bold text-slate-800">
            Score: {urgencyScore}/100
          </span>
        </div>

        {/* Urgency Progress Track */}
        <div className="mb-4">
          <div className="flex justify-between items-center text-xs mb-1.5">
            <span className="text-slate-500 font-medium">Triage Health Status</span>
            <span
              className={`px-2 py-0.5 rounded text-[11px] font-bold border uppercase ${tierColors[triageTier]}`}
            >
              {triageTier.replace("_", " ")}
            </span>
          </div>
          <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden flex">
            <div
              className={`h-full transition-all duration-300 ${
                urgencyScore >= 85
                  ? "bg-rose-600"
                  : urgencyScore >= 65
                  ? "bg-amber-500"
                  : urgencyScore >= 40
                  ? "bg-indigo-600"
                  : "bg-emerald-600"
              }`}
              style={{ width: `${Math.max(5, Math.min(100, urgencyScore))}%` }}
              role="progressbar"
              aria-valuenow={urgencyScore}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label="Urgency Score Meter"
            />
          </div>
        </div>

        {/* Total Allocated & Net Variance */}
        <div className="flex justify-between items-center text-xs py-2 px-3 bg-slate-50 rounded-lg border border-slate-100 mb-3 font-mono">
          <span className="text-slate-600">Total / Variance</span>
          <div className="flex items-center gap-1.5">
            <span className="text-slate-800 font-semibold">₹{totalAllocated.toLocaleString("en-IN")}</span>
            <span className={variance < 0 ? "text-rose-600 font-bold" : "text-emerald-600 font-bold"}>
              ({variance < 0 ? `-₹${Math.abs(variance).toLocaleString("en-IN")}` : `+₹${variance.toLocaleString("en-IN")}`})
            </span>
          </div>
        </div>

        {/* Active Category Financial Variances */}
        <div className="flex flex-col gap-2">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            Category Breakdown & Variances
          </span>
          {scaledCategories.map((cat) => {
            const pct = budgetCap > 0 ? Math.round((cat.allocatedAmount / budgetCap) * 100) : 0;
            return (
              <div
                key={cat.category}
                className="flex items-center justify-between text-xs py-1 border-b border-slate-100 last:border-b-0"
              >
                <div className="flex items-center gap-1.5">
                  <span className="capitalize font-medium text-slate-700">{cat.category}</span>
                  {cat.isVariable && (
                    <span className="text-[9px] bg-slate-100 text-slate-500 px-1 rounded font-mono">
                      var
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 font-mono">
                  <span className="text-slate-400 text-[11px]">{pct}%</span>
                  <strong className="text-slate-900 tabular-nums">
                    ₹{cat.allocatedAmount.toLocaleString("en-IN")}
                  </strong>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* CARD 3: VERIFIED VENDOR SHORTLIST */}
      <div className="utsav-card shadow-xs">
        <div className="utsav-card-header">
          <h2 className="utsav-card-title flex items-center gap-2">
            <PhoneCall className="w-4 h-4 text-emerald-600" aria-hidden="true" />
            <span>Verified Vendor Shortlist</span>
          </h2>
          <span className="utsav-badge utsav-badge-ontrack text-[10px]">Active</span>
        </div>

        <p className="text-xs text-slate-500 mb-3">
          Direct 1-click WhatsApp channels to locked venue, catering, and decor captains.
        </p>

        <div className="flex flex-col gap-2.5">
          {verifiedVendors.map((vendor, idx) => {
            const waLink = generateWhatsAppLink(
              vendor.phone,
              `Namaste ${vendor.name}! Checking in regarding milestone updates for our celebration.`
            );
            return (
              <div
                key={idx}
                className="bg-white border border-slate-200 rounded-lg p-2.5 flex items-center justify-between gap-2 hover:border-slate-300 transition-colors"
              >
                <div>
                  <div className="flex items-center gap-1.5">
                    <strong className="text-xs text-slate-900">{vendor.name}</strong>
                    <span className="text-[10px] bg-slate-100 text-slate-600 px-1 rounded font-mono">
                      {vendor.tag}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-500">{vendor.role}</div>
                </div>

                <a
                  href={waLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="utsav-btn bg-emerald-600 text-white hover:bg-emerald-700 text-[11px] px-2.5 py-1 font-semibold flex items-center gap-1 shrink-0"
                  aria-label={`WhatsApp ${vendor.name}`}
                >
                  <span>Chat</span>
                  <ExternalLink className="w-3 h-3" aria-hidden="true" />
                </a>
              </div>
            );
          })}
        </div>
      </div>
    </aside>
  );
};
