/**
 * UtsavAI — Core Types & Contracts
 * Strict types for deterministic budget calculation, DAG scheduling, and AI rebalance payloads.
 */

export type PlanningTriageTier =
  | "CRITICAL_OVERRUN"
  | "TIMELINE_BOTTLENECK"
  | "VENDOR_CLARIFICATION"
  | "ON_TRACK";

export type PersonaLens =
  | "family_host"
  | "wedding_coordinator"
  | "community_organizer";

export type PriorityVibe =
  | "Experience First"
  | "Budget Strict"
  | "Balanced";

export type EventCategory =
  | "venue"
  | "catering"
  | "decor"
  | "photography"
  | "logistics"
  | "miscellaneous";

export interface BudgetCategoryItem {
  id: string;
  category: EventCategory;
  label: string;
  allocatedAmount: number;
  actualAmount: number;
  isEstimate: boolean;
  notes?: string;
}

export type BudgetItem = BudgetCategoryItem;

export interface MilestoneTask {
  id: string;
  title: string;
  deadlineDaysBeforeEvent: number;
  category: EventCategory;
  dependsOn: string[];
  status: "pending" | "in_progress" | "completed";
  urgency: "low" | "medium" | "critical";
  leadTimeDays?: number;
}

export interface EventPlanInput {
  eventTitle: string;
  personaLens: PersonaLens;
  guestCount: number;
  baseGuestCount: number;
  totalBudgetCap: number;
  daysRemaining: number;
  budgetItems: BudgetItem[];
  milestones: MilestoneTask[];
  priorityVibe?: PriorityVibe;
}

export interface ScaledCategory {
  category: EventCategory;
  allocatedAmount: number;
  isVariable: boolean;
}

export interface PlannerEvaluationResult {
  triageTier: PlanningTriageTier;
  totalAllocated: number;
  budgetCap: number;
  variance: number;
  overrunAmount: number;
  scaledCategories: ScaledCategory[];
  criticalPathBottlenecks: string[];
  topologicalOrder: string[];
  isCyclic: boolean;
  evaluationTimestamp: string;
  urgencyScore: number;
}

export interface VendorAuditResult {
  vendorName: string;
  quotedAmount: number;
  detectedInclusions: string[];
  inclusions: string[];
  flaggedHiddenCosts: string[];
  hiddenCostRisks: string[];
  negotiationQuestions: string[];
  provenance: "live_ai" | "ai" | "fallback";
}

export interface TradeoffAdjustment {
  category: EventCategory;
  delta: number;
  rationale: string;
}

export interface TradeoffOption {
  strategyTitle: string;
  description: string;
  adjustments: TradeoffAdjustment[];
}

export type TradeoffStrategy = TradeoffOption;

export interface RebalanceApiResponse {
  triageTier: PlanningTriageTier;
  deficit: number;
  strategies: TradeoffOption[];
  narrative: string;
  provenance: "live_ai" | "ai" | "fallback";
}
