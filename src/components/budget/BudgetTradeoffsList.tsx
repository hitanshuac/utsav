/**
 * Budget Tradeoffs List Component — Displays AI and deterministic rebalancing options and top-up buttons.
 */
import type { FC } from "react";
import { Sparkles } from "lucide-react";
import { TradeoffStrategy, PersonaLens } from "../../types/planner";
import { SafeNarrative } from "../SafeNarrative";

interface BudgetTradeoffsListProps {
  variance: number;
  tradeoffs: TradeoffStrategy[];
  persona: PersonaLens;
  applyStrategyText: string;
  onApplyTradeoff: (strategy: TradeoffStrategy) => void;
  onTopUpBudget?: (amount: number) => void;
  onConsultAiTradeoffs?: () => void;
  isRebalancing?: boolean;
  aiNarrative?: string | null;
  aiProvenance?: "ai" | "fallback";
}

export const BudgetTradeoffsList: FC<BudgetTradeoffsListProps> = ({
  variance,
  tradeoffs,
  persona,
  applyStrategyText,
  onApplyTradeoff,
  onTopUpBudget,
  onConsultAiTradeoffs,
  isRebalancing = false,
  aiNarrative,
  aiProvenance = "fallback"
}) => {
  return (
    <div
      className="bg-rose-50 border border-rose-200 rounded-xl p-4 shadow-xs"
      aria-live="polite"
      aria-busy="false"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3 pb-2 border-b border-rose-200">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-rose-600 shrink-0" aria-hidden="true" />
          <div>
            <h3 className="text-xs font-bold text-rose-900 uppercase tracking-wider">
              Deficit Resolution Options: Choose Your Path
            </h3>
            <span className="text-[11px] text-rose-700">
              Current Deficit: <strong>₹{Math.abs(variance).toLocaleString("en-IN")}</strong>. Choose to allocate more budget, or rebalance category expenses.
            </span>
          </div>
        </div>
      </div>

      {/* OPTION 1: TOP-UP BUDGET */}
      {onTopUpBudget && (
        <div className="bg-white border-2 border-emerald-500 rounded-xl p-3.5 mb-3.5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-center shrink-0 mt-0.5">
              <span className="text-base font-bold text-emerald-700">₹</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <strong className="text-xs font-bold text-slate-900">
                  Option 1: Allocate More Budget (+₹{Math.abs(variance).toLocaleString("en-IN")} Top-Up)
                </strong>
                <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.2 rounded font-mono">
                  Direct Solution
                </span>
              </div>
              <p className="text-[11px] text-slate-600 mt-0.5 leading-snug">
                Self-Fund / Family Contribution. Expand the authorized budget cap to absorb the entire deficit without trimming feast menus, floral decor, or guest shuttles.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => onTopUpBudget(Math.abs(variance))}
            className="utsav-btn bg-emerald-600 hover:bg-emerald-700 text-white text-xs px-4 py-2 font-bold shrink-0 cursor-pointer shadow-xs transition-colors"
          >
            ⚡ Top-Up Budget (+₹{Math.abs(variance).toLocaleString("en-IN")})
          </button>
        </div>
      )}

      {/* OPTION 2: TRADE-OFF STRATEGIES */}
      {tradeoffs.length > 0 && (
        <div>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wide">
                Option 2: Rebalance Expenses via Category Trade-Offs
              </span>
              <span
                className={`text-[10px] px-2 py-0.5 rounded-full font-semibold border ${
                  aiProvenance === "ai"
                    ? "bg-emerald-50 text-emerald-800 border-emerald-300"
                    : "bg-slate-100 text-slate-600 border-slate-200"
                }`}
              >
                {aiProvenance === "ai"
                  ? "✨ Gemini 3.5 Live AI Proposal"
                  : "🛡️ Deterministic Heuristic"}
              </span>
            </div>

            <div className="flex items-center gap-2">
              {onConsultAiTradeoffs && (
                <button
                  type="button"
                  onClick={onConsultAiTradeoffs}
                  disabled={isRebalancing}
                  className="utsav-btn bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] px-3 py-1 font-semibold flex items-center gap-1.5 cursor-pointer disabled:opacity-60 shadow-xs"
                >
                  <Sparkles className="w-3 h-3 text-indigo-200" aria-hidden="true" />
                  <span>{isRebalancing ? "Consulting Gemini 3.5..." : "✨ Consult Gemini 3.5 AI"}</span>
                </button>
              )}
              <span className="text-[10px] text-slate-500">
                {tradeoffs.length} Strategies Available
              </span>
            </div>
          </div>

          {aiNarrative && (
            <div className="bg-indigo-50 border border-indigo-200 text-indigo-950 rounded-lg p-3 mb-2.5 shadow-xs text-xs">
              <div className="flex items-center gap-1.5 font-bold text-indigo-900 mb-1">
                <Sparkles className="w-3.5 h-3.5 text-indigo-600" aria-hidden="true" />
                <span>Gemini 3.5 Strategic Recommendation</span>
              </div>
              <SafeNarrative content={aiNarrative} className="text-xs leading-relaxed text-indigo-900" />
            </div>
          )}

          <div className="flex flex-col gap-2.5">
            {tradeoffs.map((strategy, idx) => (
              <div
                key={idx}
                className="bg-white border border-rose-200 rounded-lg p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-rose-300 transition-colors shadow-xs"
              >
                <div>
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <strong className="text-xs font-bold text-slate-900">
                      {strategy.strategyTitle}
                    </strong>

                    {idx === 0 && persona === "family_host" && (
                      <span className="utsav-badge utsav-badge-ontrack text-[10px] font-bold">
                        ★ Recommended for Family Host (Safeguards Feast &amp; Guest Comfort)
                      </span>
                    )}
                    {idx === 1 && persona === "wedding_coordinator" && (
                      <span className="utsav-badge utsav-badge-vendor text-[10px] font-bold">
                        ★ Recommended for Wedding Coordinator (Strict Contract &amp; Cost Control)
                      </span>
                    )}
                    {idx === 2 && persona === "community_organizer" && (
                      <span className="utsav-badge utsav-badge-timeline text-[10px] font-bold">
                        ★ Recommended for Community Organizer (Preserves Mass Gathering Safety)
                      </span>
                    )}
                  </div>
                  <SafeNarrative content={strategy.description} className="text-[11px] text-slate-600 mb-1" />
                  <div className="flex flex-wrap gap-1.5">
                    {strategy.adjustments.map((adj, aIdx) => (
                      <span
                        key={aIdx}
                        className="text-[10px] bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded font-mono font-semibold"
                      >
                        {adj.category}: {adj.delta < 0 ? `-₹${Math.abs(adj.delta).toLocaleString("en-IN")}` : `+₹${adj.delta.toLocaleString("en-IN")}`}
                      </span>
                    ))}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => onApplyTradeoff(strategy)}
                  className="utsav-btn utsav-btn-primary text-xs px-3.5 py-2 font-bold shrink-0 cursor-pointer shadow-xs"
                >
                  {applyStrategyText}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
