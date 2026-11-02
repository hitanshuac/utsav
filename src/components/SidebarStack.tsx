/**
 * Region 4 Sidebar Stack — Mid-flight simulator, triage gauge, vendor hotline, and activity summary.
 */
import type { FC } from "react";
import { ScaledCategory, PlanningTriageTier } from "../types/planner";
import { SidebarSimulatorCard } from "./sidebar/SidebarSimulatorCard";
import { SidebarTriageGaugeCard } from "./sidebar/SidebarTriageGaugeCard";
import { SidebarVendorHotlineCard } from "./sidebar/SidebarVendorHotlineCard";
import { SidebarActivitySummaryCard } from "./sidebar/SidebarActivitySummaryCard";

interface SidebarStackProps {
  guestCount: number;
  onGuestCountChange: (count: number) => void;
  budgetCap: number;
  onBudgetCapChange: (cap: number) => void;
  daysRemaining: number;
  onDaysRemainingChange: (days: number) => void;
  scaledCategories: ScaledCategory[];
  totalAllocated: number;
  variance: number;
  triageTier: PlanningTriageTier;
  urgencyScore: number;
  vendorPhone: string;
  onSimulateMidFlightShift?: () => void;
  onOpenActivityHistory?: () => void;
}

export const SidebarStack: FC<SidebarStackProps> = ({
  guestCount,
  onGuestCountChange,
  budgetCap,
  onBudgetCapChange,
  daysRemaining,
  onDaysRemainingChange,
  scaledCategories,
  totalAllocated,
  variance,
  triageTier,
  urgencyScore,
  vendorPhone,
  onSimulateMidFlightShift,
  onOpenActivityHistory
}) => {
  return (
    <aside className="utsav-r4-sidebar" aria-label="Event Execution Sidebar">
      {/* CARD 1: MID-FLIGHT WHAT-IF SIMULATOR */}
      <SidebarSimulatorCard
        guestCount={guestCount}
        onGuestCountChange={onGuestCountChange}
        budgetCap={budgetCap}
        onBudgetCapChange={onBudgetCapChange}
        daysRemaining={daysRemaining}
        onDaysRemainingChange={onDaysRemainingChange}
        onSimulateMidFlightShift={onSimulateMidFlightShift}
      />

      {/* CARD 2: TRADE-OFF & BOTTLENECK RADAR */}
      <SidebarTriageGaugeCard
        urgencyScore={urgencyScore}
        triageTier={triageTier}
        totalAllocated={totalAllocated}
        variance={variance}
        budgetCap={budgetCap}
        scaledCategories={scaledCategories}
      />

      {/* CARD 3: VERIFIED VENDOR SHORTLIST */}
      <SidebarVendorHotlineCard vendorPhone={vendorPhone} />

      {/* CARD 4: LIVE ACTIVITY & LOOP-CLOSURE AUDIT */}
      <SidebarActivitySummaryCard onOpenActivityHistory={onOpenActivityHistory} />
    </aside>
  );
};
