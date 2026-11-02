/**
 * UtsavAI Main Panel Component — Top-level tab orchestrator for Flowchart, Budget, Auditor & Activity History.
 */
import type { FC } from "react";
import { useMemo } from "react";
import {
  BudgetItem,
  MilestoneTask,
  ScaledCategory,
  TradeoffStrategy,
  PlanningTriageTier,
  PersonaLens
} from "../types/planner";
import { ActionDiffRow } from "./ActionDiffModal";
import { TopicTabId } from "./TopicTabs";
import { VisualDependencyFlowchart } from "./VisualDependencyFlowchart";
import { ActivityHistoryPanel } from "./ActivityHistoryPanel";
import { SupportedLanguage } from "../lib/i18n";
import { PersonaLensHeader } from "./sections/PersonaLensHeader";
import { OverviewSection } from "./sections/OverviewSection";
import { BudgetSection, ClosedLoopNotice } from "./sections/BudgetSection";
import { VendorAuditSection } from "./sections/VendorAuditSection";
import { useVendorAuditor } from "../hooks/useVendorAuditor";

export type { ClosedLoopNotice };

interface MainPanelProps {
  activeTab: TopicTabId;
  budgetItems: BudgetItem[];
  scaledCategories: ScaledCategory[];
  milestones: MilestoneTask[];
  topologicalOrder: string[];
  bottlenecks: string[];
  guestCount: number;
  baseGuestCount: number;
  totalBudgetCap: number;
  totalAllocated: number;
  variance: number;
  triageTier: PlanningTriageTier;
  tradeoffs: TradeoffStrategy[];
  onApplyTradeoff: (strategy: TradeoffStrategy) => void;
  onToggleVerified: (itemId: string) => void;
  onCycleTaskStatus: (taskId: string) => void;
  onUpdateTaskStatus?: (taskId: string, status: "pending" | "in_progress" | "completed") => void;
  onUpdateBudgetItem?: (itemId: string, newAmount: number) => void;
  onTopUpBudget?: (amount: number) => void;
  onLogRealTimeEvent?: (description: string, category?: string) => void;
  vendorPhone: string;
  sampleVendorNote: string;
  filterQuery: string;
  onClearFilter?: () => void;
  onSearchChange?: (query: string) => void;
  daysRemaining?: number;
  eventTitle?: string;
  onActionTriggered?: (actionName: string, explanation: string, deltas?: ActionDiffRow[]) => void;
  persona?: PersonaLens;
  language?: SupportedLanguage;
  onTabChange?: (tab: TopicTabId) => void;
  onConsultAiTradeoffs?: () => void;
  isRebalancing?: boolean;
  aiNarrative?: string | null;
  aiProvenance?: "ai" | "fallback";
  closedLoopNotice?: ClosedLoopNotice | null;
  onDismissClosedLoopNotice?: () => void;
}

export const MainPanel: FC<MainPanelProps> = ({
  activeTab,
  budgetItems,
  scaledCategories,
  milestones,
  topologicalOrder,
  bottlenecks,
  guestCount,
  baseGuestCount,
  totalBudgetCap,
  totalAllocated,
  variance,
  triageTier,
  tradeoffs,
  onApplyTradeoff,
  onToggleVerified,
  onCycleTaskStatus,
  onUpdateTaskStatus,
  onUpdateBudgetItem,
  onTopUpBudget,
  onLogRealTimeEvent,
  vendorPhone,
  sampleVendorNote,
  filterQuery,
  onClearFilter,
  onSearchChange,
  daysRemaining = 30,
  eventTitle = "Celebration",
  onActionTriggered,
  persona = "family_host",
  language = "en",
  onTabChange,
  onConsultAiTradeoffs,
  isRebalancing = false,
  aiNarrative,
  aiProvenance = "fallback",
  closedLoopNotice,
  onDismissClosedLoopNotice
}) => {
  const {
    vendorNote,
    setVendorNote,
    vendorAudit,
    isAuditing,
    auditProvenance,
    handleAudit,
    activeTargetItem,
    setSelectedTargetItemId,
    syncFeedback,
    handleSyncVendorQuoteToBudget,
    handleStartVendorAuditForCategory
  } = useVendorAuditor({
    sampleVendorNote,
    budgetItems,
    milestones,
    onUpdateBudgetItem,
    onUpdateTaskStatus,
    onActionTriggered,
    onTabChange
  });

  const query = (filterQuery || "").trim().toLowerCase();
  const filteredBudget = budgetItems.filter(
    (b) =>
      b.label.toLowerCase().includes(query) ||
      b.category.toLowerCase().includes(query) ||
      (b.notes && b.notes.toLowerCase().includes(query))
  );

  const filteredMilestones = milestones.filter(
    (m) =>
      m.title.toLowerCase().includes(query) ||
      m.category.toLowerCase().includes(query) ||
      (m.vendorContact?.name && m.vendorContact.name.toLowerCase().includes(query)) ||
      m.id.toLowerCase().includes(query)
  );

  const sortedBudget = useMemo(() => {
    const items = [...filteredBudget];
    if (persona === "family_host") {
      const priority: Record<string, number> = { catering: 1, venue: 2, decor: 3, photography: 4, logistics: 5, miscellaneous: 6 };
      return items.sort((a, b) => (priority[a.category] || 99) - (priority[b.category] || 99));
    } else if (persona === "wedding_coordinator") {
      return items.sort((a, b) => {
        if (a.isEstimate !== b.isEstimate) return a.isEstimate ? -1 : 1;
        return b.allocatedAmount - a.allocatedAmount;
      });
    }
    return items;
  }, [filteredBudget, persona]);

  const cateringItem = budgetItems.find((b) => b.category === "catering");
  const cateringPerPlate = guestCount > 0 && cateringItem ? Math.round(cateringItem.allocatedAmount / guestCount) : 0;

  const showOverview = activeTab === "overview";
  const showBudget = activeTab === "budget" || activeTab === "overview";
  const showDag = activeTab === "dag" || activeTab === "overview";
  const showVendor = activeTab === "vendor";
  const showActivity = activeTab === "activity";

  return (
    <div className="flex-1 min-w-0 space-y-4">
      <PersonaLensHeader
        persona={persona}
        guestCount={guestCount}
        cateringPerPlate={cateringPerPlate}
        query={query}
        onSearchChange={onSearchChange}
        onClearFilter={onClearFilter}
        onTabChange={onTabChange}
      />

      {(showOverview || showDag) && (
        <div className="space-y-4">
          <VisualDependencyFlowchart
            milestones={filteredMilestones}
            topologicalOrder={topologicalOrder}
            bottlenecks={bottlenecks}
            daysRemaining={daysRemaining}
            eventTitle={eventTitle}
            onCycleTaskStatus={onCycleTaskStatus}
            onUpdateTaskStatus={onUpdateTaskStatus}
            onActionTriggered={onActionTriggered}
            language={language}
            persona={persona}
          />

          {showOverview && (
            <OverviewSection
              persona={persona}
              guestCount={guestCount}
              baseGuestCount={baseGuestCount}
              cateringPerPlate={cateringPerPlate}
              milestones={milestones}
              totalBudgetCap={totalBudgetCap}
              budgetItems={budgetItems}
              bottlenecks={bottlenecks}
              daysRemaining={daysRemaining}
              onTabChange={onTabChange}
            />
          )}
        </div>
      )}

      {showBudget && (
        <BudgetSection
          budgetItems={budgetItems}
          scaledCategories={scaledCategories}
          sortedBudget={sortedBudget}
          guestCount={guestCount}
          baseGuestCount={baseGuestCount}
          totalBudgetCap={totalBudgetCap}
          totalAllocated={totalAllocated}
          variance={variance}
          triageTier={triageTier}
          tradeoffs={tradeoffs}
          persona={persona}
          language={language}
          closedLoopNotice={closedLoopNotice}
          onApplyTradeoff={onApplyTradeoff}
          onToggleVerified={onToggleVerified}
          onUpdateBudgetItem={onUpdateBudgetItem}
          onTopUpBudget={onTopUpBudget}
          onLogRealTimeEvent={onLogRealTimeEvent}
          onConsultAiTradeoffs={onConsultAiTradeoffs}
          isRebalancing={isRebalancing}
          aiNarrative={aiNarrative}
          aiProvenance={aiProvenance}
          onTabChange={onTabChange}
          onSearchChange={onSearchChange}
          onDismissClosedLoopNotice={onDismissClosedLoopNotice}
          onStartVendorAuditForCategory={handleStartVendorAuditForCategory}
        />
      )}

      {showVendor && (
        <VendorAuditSection
          vendorNote={vendorNote}
          setVendorNote={setVendorNote}
          vendorAudit={vendorAudit}
          isAuditing={isAuditing}
          auditProvenance={auditProvenance}
          handleAudit={handleAudit}
          budgetItems={budgetItems}
          activeTargetItem={activeTargetItem}
          setSelectedTargetItemId={setSelectedTargetItemId}
          syncFeedback={syncFeedback}
          handleSyncVendorQuoteToBudget={handleSyncVendorQuoteToBudget}
          vendorPhone={vendorPhone}
          onTabChange={onTabChange}
        />
      )}

      {showActivity && (
        <ActivityHistoryPanel isEmbedded={true} />
      )}
    </div>
  );
};

export default MainPanel;
