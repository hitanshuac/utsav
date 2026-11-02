/**
 * Flowchart delay cascade simulator component.
 */
import type { FC } from "react";
import { Clock } from "lucide-react";
import { DelayImpactSummary } from "../../lib/engine/delay-cascade";

interface FlowchartDelaySimulatorProps {
  activeDelayImpact: DelayImpactSummary | null;
  flowchartDelayCascadeText: string;
  simulate30mText: string;
  simulate60mText: string;
  onSimulateDelay: (minutes: number) => void;
}

export const FlowchartDelaySimulator: FC<FlowchartDelaySimulatorProps> = ({
  activeDelayImpact,
  flowchartDelayCascadeText,
  simulate30mText,
  simulate60mText,
  onSimulateDelay
}) => {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col justify-between shadow-xs">
      <div>
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-orange-600" aria-hidden="true" />
            <span>{flowchartDelayCascadeText}</span>
          </h4>
          <span className="text-[10px] font-mono text-slate-400">BFS Graph Traversal</span>
        </div>

        <p className="text-[11px] text-slate-500 mb-3 leading-relaxed">
          Simulate schedule delays on this milestone to forecast downstream impact on event proceedings, guest arrivals, and vendor handovers.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-3">
          <button
            type="button"
            onClick={() => onSimulateDelay(30)}
            className="utsav-btn bg-amber-50 hover:bg-amber-100 border border-amber-300 text-amber-900 text-xs px-3 py-2 font-semibold text-center whitespace-normal leading-tight shadow-xs cursor-pointer"
          >
            {simulate30mText}
          </button>
          <button
            type="button"
            onClick={() => onSimulateDelay(60)}
            className="utsav-btn bg-rose-50 hover:bg-rose-100 border border-rose-300 text-rose-900 text-xs px-3 py-2 font-semibold text-center whitespace-normal leading-tight shadow-xs cursor-pointer"
          >
            {simulate60mText}
          </button>
        </div>

        {activeDelayImpact && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs space-y-1.5">
            <div className="flex items-center justify-between">
              <strong className="text-amber-900 font-bold">
                Cascade Results (+{activeDelayImpact.delayMinutes} mins):
              </strong>
              {activeDelayImpact.criticalMuhuratAtRisk && (
                <span className="text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-300 px-1.5 py-0.2 rounded uppercase">
                  Schedule at Risk
                </span>
              )}
            </div>
            <p className="text-slate-700 leading-snug">{activeDelayImpact.riskMessage}</p>
            {activeDelayImpact.downstreamAffectedTasks.length > 0 && (
              <div className="text-[11px] text-slate-600 mt-1">
                <strong>Affected Downstream:</strong>{" "}
                {activeDelayImpact.downstreamAffectedTasks.map((t) => t.title).join(", ")}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
