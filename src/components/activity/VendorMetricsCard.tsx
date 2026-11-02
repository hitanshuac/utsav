/**
 * Vendor communication metrics card component.
 */
import type { FC } from "react";
import { TrendingUp } from "lucide-react";
import { VendorCommunicationMetrics } from "../../lib/services/event-types";

interface VendorMetricsCardProps {
  metrics: VendorCommunicationMetrics;
  vendorNames: string[];
  selectedVendor: string | null;
  onSelectVendor: (name: string) => void;
}

export const VendorMetricsCard: FC<VendorMetricsCardProps> = ({
  metrics,
  vendorNames,
  selectedVendor,
  onSelectVendor
}) => {
  return (
    <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 mb-3">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-2 mb-2.5">
        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
          <TrendingUp className="w-3.5 h-3.5 text-indigo-600" aria-hidden="true" />
          <span>Vendor Communication Effectiveness &amp; Loop Health</span>
        </div>
        {vendorNames.length > 1 && (
          <div className="flex items-center gap-1 overflow-x-auto text-[11px]">
            {vendorNames.map((name) => (
              <button
                key={name}
                type="button"
                onClick={() => onSelectVendor(name)}
                className={`px-2 py-0.5 rounded font-medium transition-colors cursor-pointer ${
                  (selectedVendor || vendorNames[0]) === name
                    ? "bg-indigo-600 text-white font-bold"
                    : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-100"
                }`}
              >
                {name}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs mb-1">
        <div>
          <span className="text-slate-500 text-[11px] block">Vendor Partner</span>
          <strong className="text-slate-900 font-semibold">{metrics.vendorName}</strong>
        </div>
        <div>
          <span className="text-slate-500 text-[11px] block">Effectiveness Score</span>
          <div className="flex items-center gap-1.5 font-mono">
            <strong className="text-slate-900 text-sm font-bold">
              {metrics.effectivenessScore}%
            </strong>
            <span
              className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${
                metrics.effectivenessScore >= 80
                  ? "bg-emerald-100 text-emerald-800"
                  : metrics.effectivenessScore >= 50
                  ? "bg-amber-100 text-amber-800"
                  : "bg-rose-100 text-rose-800"
              }`}
            >
              {metrics.effectivenessLabel}
            </span>
          </div>
        </div>
        <div>
          <span className="text-slate-500 text-[11px] block">Outreach Breakdown</span>
          <span className="font-mono text-slate-800 text-[11px]">
            {metrics.calls} Calls · {metrics.messages} WA · {metrics.emails} Email
          </span>
        </div>
        <div>
          <span className="text-slate-500 text-[11px] block">Loop Closure Cadence</span>
          <span className="font-semibold text-slate-800 text-[11px]">
            {metrics.openLoops === 0
              ? "✓ Loop Closed"
              : `${metrics.openLoops} Open Follow-up(s)`}
          </span>
        </div>
      </div>
    </div>
  );
};
