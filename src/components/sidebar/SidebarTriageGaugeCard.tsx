/**
 * Sidebar Triage Gauge & Category Radar Card component.
 */
import type { FC } from "react";
import { Activity } from "lucide-react";
import { ScaledCategory, PlanningTriageTier } from "../../types/planner";

interface SidebarTriageGaugeCardProps {
  urgencyScore: number;
  triageTier: PlanningTriageTier;
  totalAllocated: number;
  variance: number;
  budgetCap: number;
  scaledCategories: ScaledCategory[];
}

const tierColors: Record<PlanningTriageTier, string> = {
  CRITICAL_OVERRUN: "text-rose-600 bg-rose-50 border-rose-200",
  TIMELINE_BOTTLENECK: "text-amber-700 bg-amber-50 border-amber-200",
  VENDOR_CLARIFICATION: "text-indigo-700 bg-indigo-50 border-indigo-200",
  ON_TRACK: "text-emerald-700 bg-emerald-50 border-emerald-200"
};

export const SidebarTriageGaugeCard: FC<SidebarTriageGaugeCardProps> = ({
  urgencyScore,
  triageTier,
  totalAllocated,
  variance,
  budgetCap,
  scaledCategories
}) => {
  return (
    <div className="utsav-card shadow-xs">
      <div className="utsav-card-header">
        <div>
          <h2 className="utsav-card-title flex items-center gap-2">
            <Activity className="w-4 h-4 text-indigo-600" aria-hidden="true" />
            <span>Trade-Off &amp; Bottleneck Radar</span>
          </h2>
          <span className="text-[10px] text-slate-500 block mt-0.5">
            Continuous Risk &amp; Feasibility Assessment
          </span>
        </div>
        <div className="text-right">
          <span className="text-xs font-mono font-bold text-slate-900 block">
            Risk: {urgencyScore}/100
          </span>
          <span className="text-[10px] font-mono text-emerald-600 font-semibold block">
            Optimal: 0/100
          </span>
        </div>
      </div>

      <div className="bg-slate-50 border border-slate-200 rounded-lg p-2.5 mb-3 text-[11px] text-slate-600 leading-snug">
        <div className="flex items-center justify-between mb-1">
          <strong className="text-slate-800">Understanding Triage Health:</strong>
          <span className="text-[10px] font-mono font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.2 rounded">
            0 = Best · 100 = High Risk
          </span>
        </div>
        <p>
          Unlike test scores, a <strong>lower score is optimal</strong>. <strong>0/100 (On-Track)</strong> means zero budget deficit and all milestones scheduled. Scores above 85 indicate critical overruns or blocked prerequisites requiring immediate trade-offs.
        </p>
      </div>

      {/* Urgency Progress Track */}
      <div className="mb-4">
        <div className="flex justify-between items-center text-xs mb-1.5">
          <span className="text-slate-600 font-semibold">Triage Health Status</span>
          <span className={`px-2 py-0.5 rounded text-[11px] font-bold border uppercase ${tierColors[triageTier]}`}>
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
            aria-valuetext={`Current risk score: ${urgencyScore} out of 100 (${triageTier.replace("_", " ")}). Optimal score is 0 out of 100 (On-Track).`}
          />
        </div>
        <div className="flex justify-between text-[10px] text-slate-400 font-mono mt-1">
          <span className="text-emerald-700 font-bold">0 (Optimal: On-Track)</span>
          <span>40 (Clarify)</span>
          <span>65 (Bottleneck)</span>
          <span className="text-rose-700 font-bold">100 (Critical)</span>
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

      {/* Category Breakdown */}
      <div className="flex flex-col gap-2">
        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
          Category Breakdown &amp; Variances
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
  );
};
