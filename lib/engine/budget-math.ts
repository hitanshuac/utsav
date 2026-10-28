import { BudgetItem, EventCategory, TradeoffResolution } from "../types";

export interface BudgetSummary {
  totalCap: number;
  totalAllocated: number;
  totalActual: number;
  variance: number;
  isOverBudget: boolean;
  utilizationPercent: number;
  verifiedTotal: number;
  estimatedTotal: number;
}

export function calculateBudgetSummary(items: BudgetItem[], totalCap: number): BudgetSummary {
  const totalAllocated = items.reduce((acc, curr) => acc + curr.allocatedAmount, 0);
  const totalActual = items.reduce((acc, curr) => acc + curr.actualAmount, 0);
  const variance = totalCap - totalAllocated;
  const verifiedTotal = items
    .filter((i) => !i.isEstimate)
    .reduce((acc, curr) => acc + curr.allocatedAmount, 0);
  const estimatedTotal = items
    .filter((i) => i.isEstimate)
    .reduce((acc, curr) => acc + curr.allocatedAmount, 0);
  const utilizationPercent = totalCap > 0 ? Math.round((totalAllocated / totalCap) * 1000) / 10 : 0;

  return {
    totalCap,
    totalAllocated,
    totalActual,
    variance,
    isOverBudget: totalAllocated > totalCap,
    utilizationPercent,
    verifiedTotal,
    estimatedTotal
  };
}

export function applyDynamicDelta(
  items: BudgetItem[],
  guestCountChange: number,
  baseGuestCount: number
): BudgetItem[] {
  if (baseGuestCount <= 0 || guestCountChange === 0) return items;
  const ratio = (baseGuestCount + guestCountChange) / baseGuestCount;

  return items.map((item) => {
    // Catering and logistics dynamically scale with guests; venue remains fixed
    if (item.category === "catering" || item.category === "logistics") {
      return {
        ...item,
        allocatedAmount: Math.max(0, Math.round(item.allocatedAmount * ratio))
      };
    }
    return item;
  });
}

export function applyTradeoffResolution(
  items: BudgetItem[],
  resolution: TradeoffResolution
): BudgetItem[] {
  const deltaByCategory = new Map<EventCategory, number>();
  for (const adj of resolution.adjustments) {
    const current = deltaByCategory.get(adj.category) ?? 0;
    deltaByCategory.set(adj.category, current + adj.delta);
  }

  return items.map((item) => {
    const categoryDelta = deltaByCategory.get(item.category);
    if (categoryDelta === undefined || categoryDelta === 0) {
      return item;
    }
    // Distribute across the first matching item in that category deterministically
    deltaByCategory.set(item.category, 0);
    const updatedAllocated = Math.max(0, Math.round(item.allocatedAmount + categoryDelta));
    return {
      ...item,
      allocatedAmount: updatedAllocated
    };
  });
}

export function formatINR(amount: number): string {
  const abs = Math.abs(Math.round(amount));
  const formatted = abs.toLocaleString("en-IN");
  return amount < 0 ? `-₹${formatted}` : `₹${formatted}`;
}
