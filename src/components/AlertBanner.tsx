import React from "react";
import { AlertTriangle, Clock, ArrowRight } from "lucide-react";
import { PlanningTriageTier } from "../types/planner";

interface AlertBannerProps {
  urgencyScore: number;
  triageTier: PlanningTriageTier;
  deficitAmount: number;
  bottleneckCount: number;
  onResolveTradeoffs: () => void;
}

export const AlertBanner: React.FC<AlertBannerProps> = ({
  urgencyScore,
  triageTier,
  deficitAmount,
  bottleneckCount,
  onResolveTradeoffs
}) => {
  if (urgencyScore < 65) {
    return null;
  }

  const isOverrun = triageTier === "CRITICAL_OVERRUN" || deficitAmount > 0;
  const bannerType = isOverrun ? "critical" : "timeline";

  return (
    <div
      role="alert"
      aria-live="assertive"
      className={`utsav-alert-banner ${bannerType} ${isOverrun ? "critical-flash-card" : ""} flex items-center justify-between gap-4`}
    >
      <div className="flex items-center gap-2.5">
        {isOverrun && <span className="critical-pulse-dot shrink-0" aria-hidden="true" />}
        {isOverrun ? (
          <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" aria-hidden="true" />
        ) : (
          <Clock className="w-5 h-5 text-amber-600 shrink-0" aria-hidden="true" />
        )}
        <div>
          {isOverrun ? (
            <span>
              <strong>Tier 1 Critical Overrun (Urgency {urgencyScore}/100):</strong> Allocated budget
              exceeds approved cap by{" "}
              <span className="font-bold underline tabular-nums">
                ₹{deficitAmount.toLocaleString("en-IN")}
              </span>
              . Immediate trade-off rebalance required.
            </span>
          ) : (
            <span>
              <strong>Tier 2 Timeline Bottleneck (Urgency {urgencyScore}/100):</strong>{" "}
              <span className="font-bold tabular-nums">{bottleneckCount} critical milestone task(s)</span> have lead
              times exceeding days remaining to event. Prerequisite dates must be adjusted.
            </span>
          )}
        </div>
      </div>

      <button
        type="button"
        onClick={onResolveTradeoffs}
        className="utsav-btn utsav-btn-primary shrink-0 text-xs px-3 py-1.5 flex items-center gap-1.5 font-bold shadow-xs"
        aria-label="Resolve Trade-offs 1-Click Action"
      >
        <span>Resolve Trade-offs</span>
        <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
      </button>
    </div>
  );
};
