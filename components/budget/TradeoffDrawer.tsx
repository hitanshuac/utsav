import React from "react";
import { RefreshCw, ArrowDownRight, ArrowUpRight, Check } from "lucide-react";
import { formatINR } from "../../lib/engine/budget-math";
import { CATEGORY_PASTEL } from "../../lib/pastel";
import { usePlannerStore } from "../../lib/store/usePlannerStore";

export const TradeoffDrawer: React.FC = () => {
  const tradeoffStrategies = usePlannerStore((s) => s.tradeoffStrategies);
  const isLoadingTradeoffs = usePlannerStore((s) => s.isLoadingTradeoffs);
  const highlightedTarget = usePlannerStore((s) => s.highlightedTarget);
  const fetchTradeoffStrategies = usePlannerStore((s) => s.fetchTradeoffStrategies);
  const applyTradeoff = usePlannerStore((s) => s.applyTradeoff);

  const isSectionHighlighted = highlightedTarget?.sectionId === "tradeoff-section";

  return (
    <section
      aria-labelledby="tradeoff-consultant-heading"
      className={`bg-white border rounded-xl p-5 flex flex-col gap-4 transition-all shadow-xs ${
        isSectionHighlighted
          ? "border-slate-900 ring-2 ring-slate-900/10"
          : "border-slate-200"
      }`}
    >
      <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-3">
        <div>
          <h2 id="tradeoff-consultant-heading" className="text-base font-bold text-slate-900">
            Budget Trade-Offs
          </h2>
          <p className="text-xs text-slate-500">
            AI-suggested rebalancing options to keep your celebration under cap.
          </p>
        </div>

        <button
          type="button"
          onClick={() => fetchTradeoffStrategies()}
          disabled={isLoadingTradeoffs}
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800 disabled:opacity-50 transition-colors whitespace-nowrap"
        >
          <RefreshCw
            className={`w-3.5 h-3.5 ${isLoadingTradeoffs ? "animate-spin" : ""}`}
            aria-hidden="true"
          />
          <span>{isLoadingTradeoffs ? "Analyzing..." : "Generate Options"}</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {tradeoffStrategies.map((strategy, idx) => {
          const netDelta = strategy.adjustments.reduce((acc, a) => acc + a.delta, 0);
          return (
            <article
              key={`${strategy.strategyTitle}-${idx}`}
              className="border border-slate-200 rounded-lg p-4 flex flex-col justify-between gap-3 bg-slate-50/50"
            >
              <div className="flex flex-col gap-2">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="text-sm font-bold text-slate-900">{strategy.strategyTitle}</h3>
                  <span
                    className={`font-mono text-xs font-semibold tabular-nums whitespace-nowrap ${
                      netDelta <= 0 ? "text-emerald-700" : "text-amber-700"
                    }`}
                  >
                    {netDelta > 0 ? `+${formatINR(netDelta)}` : formatINR(netDelta)}
                  </span>
                </div>

                <p className="text-xs text-slate-600">{strategy.description}</p>

                <ul className="divide-y divide-slate-200/80 border-t border-b border-slate-200/80 py-1 mt-1">
                  {strategy.adjustments.map((adj, adjIdx) => {
                    const pastel = CATEGORY_PASTEL[adj.category] || CATEGORY_PASTEL.miscellaneous;
                    return (
                      <li
                        key={`${adj.category}-${adjIdx}`}
                        className="py-1.5 flex items-center justify-between gap-2 text-xs"
                      >
                        <div className="flex items-center gap-2">
                          <span className={`inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full ${pastel.badgeBg} ${pastel.badgeText}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${pastel.dot}`} />
                            {pastel.name}
                          </span>
                          <span className="text-slate-600 truncate max-w-[180px] sm:max-w-[240px]">
                            {adj.rationale}
                          </span>
                        </div>
                        <span
                          className={`font-mono font-semibold tabular-nums whitespace-nowrap flex items-center gap-0.5 ${
                            adj.delta < 0 ? "text-emerald-700" : "text-amber-700"
                          }`}
                        >
                          {adj.delta < 0 ? (
                            <ArrowDownRight className="w-3.5 h-3.5" aria-hidden="true" />
                          ) : (
                            <ArrowUpRight className="w-3.5 h-3.5" aria-hidden="true" />
                          )}
                          {adj.delta > 0 ? `+${formatINR(adj.delta)}` : formatINR(adj.delta)}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </div>

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => {
                    applyTradeoff(strategy);
                    usePlannerStore.getState().setActiveTab("budget");
                  }}
                  className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-white bg-slate-900 rounded-md hover:bg-slate-800 transition-colors"
                >
                  <Check className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Apply to Budget</span>
                </button>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
};
