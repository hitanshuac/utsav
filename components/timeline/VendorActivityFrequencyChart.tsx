import React from "react";
import { PhoneCall, Mail, MessageCircle, Activity, CheckCircle2, Clock } from "lucide-react";
import { getVendorCommunicationMetrics } from "../../lib/services/event-logger";

interface Props {
  vendorName: string;
  taskId?: string;
  compact?: boolean;
}

export const VendorActivityFrequencyChart: React.FC<Props> = ({
  vendorName,
  taskId,
  compact = false
}) => {
  const metrics = getVendorCommunicationMetrics(vendorName, taskId);

  if (metrics.totalInteractions === 0) {
    return (
      <div className="py-2.5 px-3 rounded-lg bg-slate-50/70 border border-slate-200/80 text-[11px] text-slate-500 flex items-center justify-between gap-2">
        <span className="flex items-center gap-1.5">
          <Activity className="w-3.5 h-3.5 text-slate-400" />
          <span>No outreach interactions recorded for <strong>{vendorName}</strong> yet.</span>
        </span>
        <span className="font-mono text-[10px] text-slate-400">0 Touchpoints</span>
      </div>
    );
  }

  // Effectiveness indicator styling
  const effectivenessColor =
    metrics.effectivenessLabel === "High"
      ? "text-emerald-700 bg-emerald-50 border-emerald-200"
      : metrics.effectivenessLabel === "Moderate"
      ? "text-amber-800 bg-amber-50 border-amber-200"
      : "text-rose-800 bg-rose-50 border-rose-200";

  return (
    <div
      aria-label={`Communication effectiveness for ${vendorName}`}
      className="rounded-lg bg-slate-50/80 border border-slate-200/80 p-2.5 flex flex-col gap-2 text-xs"
    >
      {/* Header Row: Vendor Name, Interaction Total, and Effectiveness Rating */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <Activity className="w-3.5 h-3.5 text-slate-700" />
          <span className="font-bold text-slate-900">
            {vendorName}
          </span>
          <span className="text-slate-400">·</span>
          <span className="text-[11px] text-slate-600 font-mono tabular-nums">
            {metrics.totalInteractions} {metrics.totalInteractions === 1 ? "interaction" : "interactions"}
          </span>
        </div>

        <div className="flex items-center gap-1.5 text-[11px]">
          <span className={`px-2 py-0.5 rounded border font-medium ${effectivenessColor}`}>
            {metrics.effectivenessScore}% Effectiveness ({metrics.effectivenessLabel})
          </span>
        </div>
      </div>

      {/* Visual Proportional Frequency Distribution Bar */}
      <div className="flex flex-col gap-1">
        <div
          className="w-full h-2 rounded-full overflow-hidden flex bg-slate-200"
          role="progressbar"
          aria-valuenow={metrics.effectivenessScore}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          {metrics.messages > 0 && (
            <div
              style={{ width: `${metrics.messagePercentage}%` }}
              title={`WhatsApp: ${metrics.messages} (${metrics.messagePercentage}%)`}
              className="bg-emerald-600 transition-all duration-300"
            />
          )}
          {metrics.emails > 0 && (
            <div
              style={{ width: `${metrics.emailPercentage}%` }}
              title={`Emails: ${metrics.emails} (${metrics.emailPercentage}%)`}
              className="bg-sky-600 transition-all duration-300"
            />
          )}
          {metrics.calls > 0 && (
            <div
              style={{ width: `${metrics.callPercentage}%` }}
              title={`Calls: ${metrics.calls} (${metrics.callPercentage}%)`}
              className="bg-slate-800 transition-all duration-300"
            />
          )}
        </div>

        {/* 3-Column Frequency Breakdown with tabular counts and percentages */}
        <div className="grid grid-cols-3 gap-1 pt-1 text-[11px] font-mono tabular-nums">
          <div className="flex items-center gap-1 text-slate-700">
            <span className="w-2 h-2 rounded-full bg-emerald-600 shrink-0" />
            <MessageCircle className="w-3 h-3 text-emerald-700 shrink-0" />
            <span>WA: <strong>{metrics.messages}</strong> ({metrics.messagePercentage}%)</span>
          </div>

          <div className="flex items-center gap-1 text-slate-700">
            <span className="w-2 h-2 rounded-full bg-sky-600 shrink-0" />
            <Mail className="w-3 h-3 text-sky-700 shrink-0" />
            <span>Email: <strong>{metrics.emails}</strong> ({metrics.emailPercentage}%)</span>
          </div>

          <div className="flex items-center gap-1 text-slate-700">
            <span className="w-2 h-2 rounded-full bg-slate-800 shrink-0" />
            <PhoneCall className="w-3 h-3 text-slate-800 shrink-0" />
            <span>Calls: <strong>{metrics.calls}</strong> ({metrics.callPercentage}%)</span>
          </div>
        </div>
      </div>

      {/* Detail Cadence Summary & Recent Timeline */}
      {!compact && (
        <div className="pt-1.5 border-t border-slate-200/70 flex flex-wrap items-center justify-between gap-2 text-[11px]">
          <span className="text-slate-600">
            Cadence: <strong className="text-slate-800">{metrics.interactionVelocity}</strong> · {metrics.closedLoops} resolved loop{metrics.closedLoops === 1 ? "" : "s"}
          </span>

          {metrics.openLoops > 0 ? (
            <span className="inline-flex items-center gap-1 text-amber-800 font-medium">
              <Clock className="w-3 h-3" />
              <span>{metrics.openLoops} call pending to close loop</span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-emerald-700 font-medium">
              <CheckCircle2 className="w-3 h-3" />
              <span>All loops closed</span>
            </span>
          )}
        </div>
      )}
    </div>
  );
};
