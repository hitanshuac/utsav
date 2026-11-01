import React, { useEffect } from "react";
import { CheckCircle, AlertTriangle, ArrowRight, X, Clock, FileText } from "lucide-react";
import { PlanningTriageTier } from "../types/planner";
import { SafeNarrative } from "./SafeNarrative";

export interface ActionDiffRow {
  label: string;
  before: string;
  after: string;
  diff?: string;
  isImprovement?: boolean;
}

export interface ActionDiffData {
  title: string;
  actionName: string;
  timestamp: string;
  beforeTier: PlanningTriageTier;
  afterTier: PlanningTriageTier;
  beforeScore: number;
  afterScore: number;
  deltas: ActionDiffRow[];
  explanation: string;
  recommendedNextStep?: string;
}

interface ActionDiffModalProps {
  isOpen: boolean;
  diff: ActionDiffData | null;
  onClose: () => void;
  onViewActivityLog?: () => void;
}

const TIER_BADGE_STYLES: Record<PlanningTriageTier, string> = {
  CRITICAL_OVERRUN: "bg-rose-100 text-rose-800 border-rose-300",
  TIMELINE_BOTTLENECK: "bg-amber-100 text-amber-800 border-amber-300",
  VENDOR_CLARIFICATION: "bg-indigo-100 text-indigo-800 border-indigo-300",
  ON_TRACK: "bg-emerald-100 text-emerald-800 border-emerald-300"
};

export const ActionDiffModal: React.FC<ActionDiffModalProps> = ({
  isOpen,
  diff,
  onClose,
  onViewActivityLog
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !diff) return null;

  const scoreDiff = diff.afterScore - diff.beforeScore;
  const isScoreImproved = scoreDiff <= 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900 bg-opacity-70 animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="action-diff-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-slate-50 border-b border-slate-200 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-orange-100 text-orange-600 flex items-center justify-center">
              <FileText className="w-4 h-4" aria-hidden="true" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 id="action-diff-title" className="text-sm font-bold text-slate-900">
                  {diff.actionName}
                </h2>
                <span className="text-[10px] font-mono bg-slate-200 text-slate-700 px-1.5 py-0.5 rounded">
                  {diff.timestamp}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">{diff.title}</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
            aria-label="Close modification popup"
          >
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-5">
          {/* Triage Health Shift Banner */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-600">Triage Status Shift:</span>
              <span
                className={`text-[11px] font-bold px-2 py-0.5 rounded border uppercase font-mono ${
                  TIER_BADGE_STYLES[diff.beforeTier]
                }`}
              >
                {diff.beforeTier.replace("_", " ")} ({diff.beforeScore}/100)
              </span>
              <ArrowRight className="w-3.5 h-3.5 text-slate-400" aria-hidden="true" />
              <span
                className={`text-[11px] font-bold px-2 py-0.5 rounded border uppercase font-mono ${
                  TIER_BADGE_STYLES[diff.afterTier]
                }`}
              >
                {diff.afterTier.replace("_", " ")} ({diff.afterScore}/100)
              </span>
            </div>

            <div className="text-xs font-mono font-semibold">
              <span className={isScoreImproved ? "text-emerald-700" : "text-amber-700"}>
                Urgency {scoreDiff > 0 ? `+${scoreDiff}` : scoreDiff} pts
              </span>
            </div>
          </div>

          {/* Before -> After Diff Table */}
          <div>
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2">
              Before → After Modification Ledger
            </h3>
            <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100 text-slate-600 font-semibold border-b border-slate-200">
                    <th className="py-2.5 px-3">Metric / Item</th>
                    <th className="py-2.5 px-3">Baseline</th>
                    <th className="py-2.5 px-3">Modified Value</th>
                    <th className="py-2.5 px-3 text-right">Net Impact</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {diff.deltas.map((row, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-2 px-3 font-medium text-slate-800">{row.label}</td>
                      <td className="py-2 px-3 font-mono text-slate-500 tabular-nums">{row.before}</td>
                      <td className="py-2 px-3 font-mono font-semibold text-slate-900 tabular-nums">
                        {row.after}
                      </td>
                      <td className="py-2 px-3 text-right font-mono font-bold tabular-nums">
                        {row.diff ? (
                          <span
                            className={
                              row.isImprovement === true
                                ? "text-emerald-700"
                                : row.isImprovement === false
                                ? "text-rose-600"
                                : "text-slate-600"
                            }
                          >
                            {row.diff}
                          </span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Why This Happened Explanation */}
          <div className="bg-amber-50/50 border border-amber-200 rounded-xl p-4">
            <h4 className="text-xs font-bold text-amber-900 uppercase tracking-wider mb-1 flex items-center gap-1.5">
              <CheckCircle className="w-3.5 h-3.5 text-amber-600" aria-hidden="true" />
              <span>Deterministic Rule & Impact Rationale</span>
            </h4>
            <SafeNarrative
              content={diff.explanation}
              className="text-xs text-slate-700 leading-relaxed"
            />
            {diff.recommendedNextStep && (
              <div className="mt-2.5 pt-2 border-t border-amber-200/60 text-xs text-amber-800 font-medium">
                <strong>Recommended Next Step:</strong> {diff.recommendedNextStep}
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="bg-slate-50 border-t border-slate-200 px-6 py-3.5 flex items-center justify-between gap-3">
          {onViewActivityLog ? (
            <button
              type="button"
              onClick={() => {
                onClose();
                onViewActivityLog();
              }}
              className="text-xs font-semibold text-slate-600 hover:text-slate-900 flex items-center gap-1.5"
            >
              <Clock className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Inspect in Live Activity History Log →</span>
            </button>
          ) : (
            <div />
          )}

          <button
            type="button"
            onClick={onClose}
            className="utsav-btn utsav-btn-primary text-xs px-4 py-2 font-semibold shadow-xs"
          >
            Got It
          </button>
        </div>
      </div>
    </div>
  );
};

export default ActionDiffModal;
