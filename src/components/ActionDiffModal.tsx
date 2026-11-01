import React, { useEffect, useState } from "react";
import { CheckCircle, X, FileText } from "lucide-react";
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
  const [isHovered, setIsHovered] = useState(false);

  // Auto-dismiss after 8 seconds unless hovered
  useEffect(() => {
    if (!isOpen || !diff || isHovered) return;
    const timer = setTimeout(() => {
      onClose();
    }, 8000);
    return () => clearTimeout(timer);
  }, [isOpen, diff, isHovered, onClose]);

  // Escape key support
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
      className="fixed bottom-5 right-5 z-50 max-w-md w-[calc(100vw-2.5rem)] bg-white border-2 border-slate-900 rounded-2xl shadow-2xl overflow-hidden flex flex-col"
      role="status"
      aria-live="polite"
      aria-labelledby="action-diff-title"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Header */}
      <div className="bg-slate-100 border-b border-slate-200 px-4 py-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-7 h-7 rounded-lg bg-orange-100 text-orange-600 flex items-center justify-center shrink-0">
            <FileText className="w-4 h-4" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <h3 id="action-diff-title" className="text-xs font-bold text-slate-900 truncate">
              {diff.actionName}
            </h3>
            <p className="text-[11px] text-slate-500 truncate">{diff.title}</p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span
            className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase font-mono ${
              isScoreImproved
                ? "bg-emerald-100 text-emerald-800 border-emerald-300"
                : "bg-amber-100 text-amber-800 border-amber-300"
            }`}
          >
            Urgency {scoreDiff > 0 ? `+${scoreDiff}` : scoreDiff} pts
          </span>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 p-1 rounded-md hover:bg-slate-200 transition-colors"
            aria-label="Close notification"
          >
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="p-3.5 space-y-2.5 max-h-[60vh] overflow-y-auto">
        {/* Triage Tier Badge Shift if changed */}
        {diff.beforeTier !== diff.afterTier && (
          <div className="flex items-center gap-1.5 text-[11px]">
            <span className="text-slate-500 font-medium">Status:</span>
            <span
              className={`px-1.5 py-0.5 rounded font-mono font-bold text-[10px] border uppercase ${
                TIER_BADGE_STYLES[diff.beforeTier]
              }`}
            >
              {diff.beforeTier.replace("_", " ")}
            </span>
            <span className="text-slate-400">→</span>
            <span
              className={`px-1.5 py-0.5 rounded font-mono font-bold text-[10px] border uppercase ${
                TIER_BADGE_STYLES[diff.afterTier]
              }`}
            >
              {diff.afterTier.replace("_", " ")}
            </span>
          </div>
        )}

        {/* Compact Before -> After Summary Lines */}
        {diff.deltas.length > 0 && (
          <div className="space-y-1 bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs">
            {diff.deltas.slice(0, 4).map((row, idx) => (
              <div key={idx} className="flex items-center justify-between gap-2">
                <span className="font-medium text-slate-700 truncate">{row.label}:</span>
                <div className="flex items-center gap-1.5 shrink-0 font-mono text-[11px]">
                  <span className="text-slate-400 line-through">{row.before}</span>
                  <span className="text-slate-400">→</span>
                  <span className="font-bold text-slate-900">{row.after}</span>
                  {row.diff && (
                    <span
                      className={`px-1.5 py-0.5 rounded font-semibold text-[10px] ${
                        row.isImprovement === true
                          ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                          : row.isImprovement === false
                          ? "bg-rose-100 text-rose-800 border border-rose-200"
                          : "bg-slate-200 text-slate-700"
                      }`}
                    >
                      {row.diff}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Plain-English Explanation */}
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-2.5 text-xs">
          <div className="flex items-start gap-1.5">
            <CheckCircle className="w-3.5 h-3.5 text-amber-700 mt-0.5 shrink-0" aria-hidden="true" />
            <div className="text-slate-700 leading-snug">
              <SafeNarrative content={diff.explanation} />
              {diff.recommendedNextStep && (
                <div className="mt-1.5 pt-1 border-t border-amber-200 text-[11px] text-amber-900 font-medium">
                  <strong>Next Step:</strong> {diff.recommendedNextStep}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Footer Actions */}
      <div className="bg-slate-50 border-t border-slate-200 px-3.5 py-2 flex items-center justify-between gap-2">
        {onViewActivityLog ? (
          <button
            type="button"
            onClick={() => {
              onClose();
              onViewActivityLog();
            }}
            className="text-xs font-semibold text-slate-700 hover:text-orange-600 flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <span>📜 View History</span>
          </button>
        ) : (
          <span className="text-[10px] text-slate-400 font-mono">
            {isHovered ? "Auto-dismiss paused" : "Auto-closing in 8s"}
          </span>
        )}

        <div className="flex items-center gap-2">
          {onViewActivityLog && (
            <span className="text-[10px] text-slate-400 font-mono hidden sm:inline">
              {isHovered ? "Paused" : "8s"}
            </span>
          )}
          <button
            type="button"
            onClick={onClose}
            className="utsav-btn utsav-btn-secondary text-xs px-3 py-1 font-semibold cursor-pointer"
            aria-label="Dismiss modification diff"
          >
            ✕ Dismiss
          </button>
        </div>
      </div>
    </div>
  );
};

export default ActionDiffModal;
