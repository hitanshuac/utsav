import React from "react";
import { RotateCcw, Calendar, Sparkles, Info } from "lucide-react";
import { PlanningTriageTier } from "../types/planner";
import { SupportedLanguage, TRANSLATIONS } from "../lib/i18n";

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
  language?: SupportedLanguage;
  aiStatus?: {
    configured: boolean;
    model: string;
    source: "gemini-live" | "deterministic-shield";
  };
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
  onOpenCustomEvent,
  language = "en",
  aiStatus
}) => {
  const t = TRANSLATIONS[language] || TRANSLATIONS.en;

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
    <section className="utsav-r3-header flex-col items-start gap-3" aria-label="Event Header and Actions">
      <div className="w-full flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight m-0">
              {eventTitle}
            </h1>
            <span className={`utsav-badge ${badge.className}`}>{badge.label}</span>
            {aiStatus && (
              <span
                className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
                  aiStatus.configured && aiStatus.source === "gemini-live"
                    ? "bg-emerald-50 text-emerald-800 border-emerald-300"
                    : "bg-slate-100 text-slate-700 border-slate-300"
                }`}
                title={
                  aiStatus.configured
                    ? `Live Gemini inference active (${aiStatus.model}). Deterministic engine guarantees financial math.`
                    : "Offline Deterministic Shield active."
                }
              >
                <span
                  className={`w-2 h-2 rounded-full ${
                    aiStatus.configured && aiStatus.source === "gemini-live"
                      ? "bg-emerald-600 animate-pulse"
                      : "bg-slate-400"
                  }`}
                  aria-hidden="true"
                />
                <span>
                  {aiStatus.configured && aiStatus.source === "gemini-live"
                    ? "Gemini 3.5 (Live AI)"
                    : "Deterministic Shield (Offline)"}
                </span>
              </span>
            )}
          </div>
          <p className="text-xs sm:text-sm text-slate-500 font-mono m-0 tabular-nums">
            Target Date: <strong className="text-slate-700">{eventDate}</strong> ·{" "}
            <strong className="text-slate-700">{daysRemaining} {t.daysOut}</strong> ·{" "}
            <strong className="text-slate-700">{guestCount} {t.confirmedGuests}</strong>
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            id="open-custom-event-modal"
            onClick={onOpenCustomEvent}
            aria-label="Plan a custom event"
            className="utsav-btn utsav-btn-secondary text-xs px-3 py-1.5 flex items-center gap-1.5 font-semibold text-amber-800 bg-amber-50 border-amber-200 hover:bg-amber-100 cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-600" aria-hidden="true" />
            <span>{t.planCustomEvent}</span>
          </button>

          <button
            type="button"
            onClick={onResetPreset}
            aria-label="Reset preset to default baseline"
            className="utsav-btn utsav-btn-secondary text-xs px-3 py-1.5 flex items-center gap-1.5 font-medium cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5 text-slate-500" aria-hidden="true" />
            <span>{t.resetPreset}</span>
          </button>

          <button
            type="button"
            onClick={onExportIcs}
            aria-label="Export RFC 5545 iCalendar File"
            className="utsav-btn utsav-btn-secondary text-xs px-3 py-1.5 flex items-center gap-1.5 font-semibold text-slate-800 border-slate-300 cursor-pointer"
          >
            <Calendar className="w-3.5 h-3.5 text-slate-600" aria-hidden="true" />
            <span>{t.exportCalendar}</span>
          </button>
        </div>
      </div>

      {/* Layman-friendly Scenario Explainer Banner */}
      <div className="w-full bg-blue-50 border border-blue-200 text-blue-900 rounded-lg px-3 py-2 text-xs flex items-center gap-2 shadow-xs">
        <Info className="w-4 h-4 text-blue-600 shrink-0" aria-hidden="true" />
        <span className="leading-snug">
          {t.templateExplainer}
        </span>
      </div>
    </section>
  );
};
