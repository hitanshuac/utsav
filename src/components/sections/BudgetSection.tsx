/**
 * Budget Section Component — Assembles budget ledger, trade-off proposals, closed-loop notice, and real-time floor ops.
 */
import type { FC } from "react";
import {
  BudgetItem,
  ScaledCategory,
  TradeoffStrategy,
  PlanningTriageTier,
  PersonaLens
} from "../../types/planner";
import { TopicTabId } from "../TopicTabs";
import { TRANSLATIONS, SupportedLanguage } from "../../lib/i18n";
import { BudgetClosedLoopBanner, ClosedLoopNotice } from "../budget/BudgetClosedLoopBanner";
import { BudgetCardsGrid } from "../budget/BudgetCardsGrid";
import { BudgetTradeoffsList } from "../budget/BudgetTradeoffsList";
import { BudgetFloorEventLogger } from "../budget/BudgetFloorEventLogger";

export type { ClosedLoopNotice };

interface BudgetSectionProps {
  budgetItems: BudgetItem[];
  scaledCategories: ScaledCategory[];
  sortedBudget: BudgetItem[];
  guestCount: number;
  baseGuestCount: number;
  totalBudgetCap: number;
  totalAllocated: number;
  variance: number;
  triageTier: PlanningTriageTier;
  tradeoffs: TradeoffStrategy[];
  persona: PersonaLens;
  language: SupportedLanguage;
  closedLoopNotice?: ClosedLoopNotice | null;
  onApplyTradeoff: (strategy: TradeoffStrategy) => void;
  onToggleVerified: (itemId: string) => void;
  onUpdateBudgetItem?: (itemId: string, newAmount: number) => void;
  onTopUpBudget?: (amount: number) => void;
  onLogRealTimeEvent?: (description: string, category?: string) => void;
  onConsultAiTradeoffs?: () => void;
  isRebalancing?: boolean;
  aiNarrative?: string | null;
  aiProvenance?: "ai" | "fallback";
  onTabChange?: (tab: TopicTabId) => void;
  onSearchChange?: (query: string) => void;
  onDismissClosedLoopNotice?: () => void;
  onStartVendorAuditForCategory: (category: string) => void;
}

export const BudgetSection: FC<BudgetSectionProps> = ({
  budgetItems,
  scaledCategories,
  sortedBudget,
  guestCount,
  baseGuestCount,
  totalBudgetCap,
  totalAllocated,
  variance,
  triageTier,
  tradeoffs,
  persona,
  language,
  closedLoopNotice,
  onApplyTradeoff,
  onToggleVerified,
  onUpdateBudgetItem,
  onTopUpBudget,
  onLogRealTimeEvent,
  onConsultAiTradeoffs,
  isRebalancing = false,
  aiNarrative,
  aiProvenance = "fallback",
  onTabChange,
  onSearchChange,
  onDismissClosedLoopNotice,
  onStartVendorAuditForCategory
}) => {
  const t = TRANSLATIONS[language] || TRANSLATIONS.en;

  return (
    <section aria-labelledby="budget-ledger-title" className="utsav-card">
      <div className="utsav-card-header">
        <div>
          <h2 id="budget-ledger-title" className="utsav-card-title flex items-center gap-2">
            <span>{t.budgetLedgerTitle}</span>
            <span className="text-xs font-normal text-slate-500 font-mono">
              ({t.scalesWithGuests})
            </span>
          </h2>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-600 font-mono tabular-nums">
            Total: ₹{totalAllocated.toLocaleString("en-IN")} / ₹{totalBudgetCap.toLocaleString("en-IN")}
          </span>
          <span
            className={`utsav-badge ${
              variance >= 0 ? "utsav-badge-ontrack" : "utsav-badge-critical"
            }`}
          >
            {variance >= 0
              ? `₹${variance.toLocaleString("en-IN")} ${t.varianceSurplus}`
              : `₹${Math.abs(variance).toLocaleString("en-IN")} ${t.varianceDeficit}`}
          </span>
        </div>
      </div>

      <p className="text-xs text-slate-600 mb-4 leading-relaxed">
        Catering and logistics scale linearly with guest headcount (ratio:{" "}
        <strong>{(guestCount / baseGuestCount).toFixed(2)}x</strong>), while venue and photography remain fixed contract costs.
      </p>

      {/* CLOSED-LOOP HUMAN TRADE-OFF RESOLUTION BANNER */}
      {closedLoopNotice && (
        <BudgetClosedLoopBanner
          closedLoopNotice={closedLoopNotice}
          onTabChange={onTabChange}
          onSearchChange={onSearchChange}
          onDismissClosedLoopNotice={onDismissClosedLoopNotice}
        />
      )}

      {/* CATEGORY BUDGET ALLOCATION CARDS */}
      <BudgetCardsGrid
        sortedBudget={sortedBudget}
        scaledCategories={scaledCategories}
        guestCount={guestCount}
        baseGuestCount={baseGuestCount}
        totalBudgetCap={totalBudgetCap}
        variance={variance}
        triageTier={triageTier}
        persona={persona}
        t={t}
        onToggleVerified={onToggleVerified}
        onUpdateBudgetItem={onUpdateBudgetItem}
        onStartVendorAuditForCategory={onStartVendorAuditForCategory}
        onTabChange={onTabChange}
        onSearchChange={onSearchChange}
      />

      {/* TWO-TRACK DEFICIT RESOLUTION OPTIONS */}
      {variance < 0 && (
        <BudgetTradeoffsList
          variance={variance}
          tradeoffs={tradeoffs}
          persona={persona}
          applyStrategyText={t.applyStrategy}
          onApplyTradeoff={onApplyTradeoff}
          onTopUpBudget={onTopUpBudget}
          onConsultAiTradeoffs={onConsultAiTradeoffs}
          isRebalancing={isRebalancing}
          aiNarrative={aiNarrative}
          aiProvenance={aiProvenance}
        />
      )}

      {/* REAL-TIME OPERATIONS TRACKER */}
      <BudgetFloorEventLogger
        budgetItems={budgetItems}
        onLogRealTimeEvent={onLogRealTimeEvent}
      />
    </section>
  );
};
