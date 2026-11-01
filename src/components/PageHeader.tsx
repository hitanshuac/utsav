import React from "react";
import { RotateCcw, Calendar, CheckCircle2, Sparkles } from "lucide-react";
import { PlanningTriageTier } from "../types/planner";

interface PageHeaderProps {
  eventTitle: string;
  eventDate: string;
  daysRemaining: number;
  guestCount: number;
  triageTier: PlanningTriageTier;
  urgencyScore: number;
  onResetPreset: () => void;
  onExportIcs: () => void;
  onOpenCustomEvent: () => void;
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  eventTitle,
  eventDate,
  daysRemaining,
  guestCount,
  triageTier,
  urgencyScore,
  onResetPreset,
  onExportIcs,
  onOpenCustomEvent
}) => {
  const tierBadges: Record<
    PlanningTriageTier,
    { label: string; className: string }
  > = {
    CRITICAL_OVERRUN: {
      label: `Tier 1: Overrun (${urgencyScore}/100)`,
      className: "utsav-badge-critical"
    },
    TIMELINE_BOTTLENECK: {
      label: `Tier 2: Bottleneck (${urgencyScore}/100)`,
      className: "utsav-badge-timeline"
    },
    VENDOR_CLARIFICATION: {
      label: `Tier 3: Clarification (${urgencyScore}/100)`,
      className: "utsav-badge-vendor"
    },
    ON_TRACK: {
      label: `Tier 4: On Track (${urgencyScore}/100)`,
      className: "utsav-badge-ontrack"
    }
  };

  const badge = tierBadges[triageTier] || tierBadges.ON_TRACK;

  return (
    <section className="utsav-r3-header" aria-label="Event Header and Actions">
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2.5 flex-wrap">
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight m-0">
            {eventTitle}
          </h1>
          <span className={`utsav-badge ${badge.className}`}>{badge.label}</span>
        </div>
        <p className="text-xs sm:text-sm text-slate-500 font-mono m-0 tabular-nums">
          Target Date: <strong className="text-slate-700">{eventDate}</strong> ·{" "}
          <strong className="text-slate-700">{daysRemaining} Days Out</strong> ·{" "}
          <strong className="text-slate-700">{guestCount} Confirmed Guests</strong>
        </p>
      </div>

      <div className="flex items-center gap-2.5 flex-wrap">
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" aria-hidden="true" />
          <span>Deterministic Engine Active</span>
        </span>

        <button
          type="button"
          id="open-custom-event-modal"
          onClick={onOpenCustomEvent}
          aria-label="Plan a custom event"
          className="utsav-btn utsav-btn-secondary text-xs px-3 py-1.5 flex items-center gap-1.5 font-semibold text-amber-800 bg-amber-50 border-amber-200 hover:bg-amber-100"
        >
          <Sparkles className="w-3.5 h-3.5 text-amber-600" aria-hidden="true" />
          <span>+ Plan Custom Event</span>
        </button>

        <button
          type="button"
          onClick={onResetPreset}
          aria-label="Reset preset to default baseline"
          className="utsav-btn utsav-btn-secondary text-xs px-3 py-1.5 flex items-center gap-1.5 font-medium"
        >
          <RotateCcw className="w-3.5 h-3.5 text-slate-500" aria-hidden="true" />
          <span>↻ Reset Preset</span>
        </button>

        <button
          type="button"
          onClick={onExportIcs}
          aria-label="Export RFC 5545 iCalendar File"
          className="utsav-btn utsav-btn-secondary text-xs px-3 py-1.5 flex items-center gap-1.5 font-semibold text-slate-800 border-slate-300"
        >
          <Calendar className="w-3.5 h-3.5 text-slate-600" aria-hidden="true" />
          <span>📅 Export .ics Calendar</span>
        </button>
      </div>
    </section>
  );
};
