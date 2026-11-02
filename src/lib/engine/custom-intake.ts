/**
 * UtsavAI Custom Event Guided Intake — Deterministic Budget & DAG Generator
 * Generates custom 6-category budget allocations and sequenced milestone DAGs in <5ms.
 */
import {
  BudgetItem,
  MilestoneTask,
  EventCategory
} from "../../types/planner";

export type OccasionType =
  | "Wedding"
  | "Milestone Birthday / Anniversary"
  | "Cultural / Community Fest"
  | "Corporate / Retreat";

export type MustHavePriority =
  | "Food & Catering"
  | "Venue & Comfort"
  | "Decor & Ambience"
  | "Photography & Memories";

export type DietaryProfile =
  | "Standard Multi-Cuisine"
  | "Jain (No Onion/Garlic)"
  | "Vegan / Plant-Based"
  | "Traditional Regional";

export type GuestAccessibility =
  | "Standard Seating"
  | "Children + Senior Citizen Friendly (Ramps & Rest Zones)"
  | "Full Wheelchair & Assisted Mobility";

export interface CustomEventInput {
  eventTitle: string;
  occasionType: OccasionType;
  totalBudgetCap: number;
  guestCount: number;
  daysUntilEvent: number;
  priorityVibe: "Experience First" | "Budget Strict" | "Balanced";
  mustHavePriority: MustHavePriority;
  dietaryProfile?: DietaryProfile;
  guestAccessibility?: GuestAccessibility;
}

export type CustomEventIntakeInput = CustomEventInput;

export interface CustomEventResult {
  budget: BudgetItem[];
  budgetItems: BudgetItem[];
  milestones: MilestoneTask[];
}

/** Maps Must-Have Priority selection to the budget category that receives the +10% boost. */
const MUST_HAVE_TO_CATEGORY: Record<MustHavePriority, EventCategory> = {
  "Food & Catering": "catering",
  "Venue & Comfort": "venue",
  "Decor & Ambience": "decor",
  "Photography & Memories": "photography"
};

/** Baseline allocation ratios for each occasion type (must sum to 1.0). */
const OCCASION_RATIOS: Record<OccasionType, Record<EventCategory, number>> = {
  Wedding: { venue: 0.30, catering: 0.30, decor: 0.15, photography: 0.12, logistics: 0.08, miscellaneous: 0.05 },
  "Milestone Birthday / Anniversary": { venue: 0.25, catering: 0.30, decor: 0.15, photography: 0.15, logistics: 0.08, miscellaneous: 0.07 },
  "Cultural / Community Fest": { venue: 0.20, catering: 0.35, decor: 0.12, photography: 0.08, logistics: 0.18, miscellaneous: 0.07 },
  "Corporate / Retreat": { venue: 0.30, catering: 0.25, decor: 0.10, photography: 0.10, logistics: 0.18, miscellaneous: 0.07 }
};

/** Maps occasion type to relevant milestone templates. */
const OCCASION_MILESTONES: Record<OccasionType, Array<{ suffix: string; category: EventCategory; deadlineRatio: number; urgency: "low" | "medium" | "critical" }>> = {
  Wedding: [
    { suffix: "Lock Venue & Sign Agreement", category: "venue", deadlineRatio: 0.75, urgency: "critical" },
    { suffix: "Finalize Caterer & Menu Tasting", category: "catering", deadlineRatio: 0.50, urgency: "critical" },
    { suffix: "Approve Decor & Floral Design", category: "decor", deadlineRatio: 0.38, urgency: "medium" },
    { suffix: "Confirm Photography & Cinema Crew", category: "photography", deadlineRatio: 0.25, urgency: "medium" },
    { suffix: "Dispatch Guest Transport Roster", category: "logistics", deadlineRatio: 0.12, urgency: "medium" },
    { suffix: "Final Headcount & Handover Briefing", category: "catering", deadlineRatio: 0.05, urgency: "critical" }
  ],
  "Milestone Birthday / Anniversary": [
    { suffix: "Book Venue & Reserve Date", category: "venue", deadlineRatio: 0.70, urgency: "critical" },
    { suffix: "Confirm Multi-Course Menu", category: "catering", deadlineRatio: 0.45, urgency: "critical" },
    { suffix: "Design Nostalgia Photo Wall", category: "decor", deadlineRatio: 0.35, urgency: "medium" },
    { suffix: "Schedule Portrait & Film Session", category: "photography", deadlineRatio: 0.25, urgency: "medium" },
    { suffix: "Arrange Guest Welcome & Sound", category: "logistics", deadlineRatio: 0.12, urgency: "low" },
    { suffix: "Final Guest RSVP & Favors Prep", category: "miscellaneous", deadlineRatio: 0.05, urgency: "medium" }
  ],
  "Cultural / Community Fest": [
    { suffix: "Obtain Municipal Permit & NOC", category: "venue", deadlineRatio: 0.80, urgency: "critical" },
    { suffix: "Lock Bulk Caterer Contract", category: "catering", deadlineRatio: 0.50, urgency: "critical" },
    { suffix: "Erect Stage & PA Sound Rig", category: "decor", deadlineRatio: 0.35, urgency: "critical" },
    { suffix: "Inspect Generator & Power Grid", category: "logistics", deadlineRatio: 0.20, urgency: "critical" },
    { suffix: "Assign Volunteer Crew Roster", category: "logistics", deadlineRatio: 0.12, urgency: "medium" },
    { suffix: "Final Community Headcount Check", category: "catering", deadlineRatio: 0.04, urgency: "critical" }
  ],
  "Corporate / Retreat": [
    { suffix: "Reserve Conference Venue", category: "venue", deadlineRatio: 0.70, urgency: "critical" },
    { suffix: "Confirm Catering & Dietary Menus", category: "catering", deadlineRatio: 0.45, urgency: "critical" },
    { suffix: "Setup AV & Projection Equipment", category: "decor", deadlineRatio: 0.30, urgency: "medium" },
    { suffix: "Book Event Photographer", category: "photography", deadlineRatio: 0.20, urgency: "low" },
    { suffix: "Arrange Team Transport & Parking", category: "logistics", deadlineRatio: 0.12, urgency: "medium" },
    { suffix: "Distribute Agenda & Name Badges", category: "miscellaneous", deadlineRatio: 0.05, urgency: "low" }
  ]
};

/**
 * Custom Event Guided Intake — Deterministic Budget & DAG Generator.
 * Generates a customized 6-category budget allocation and 6-step milestone DAG
 * based on user inputs, boosting the selected Must-Have category by +10%
 * and embedding dietary profile and guest accessibility requirements.
 *
 * @param input - Custom event intake parameters including occasion, budget, pax, and needs
 * @returns Complete custom budget items and sequenced milestone DAG
 */
export function generateCustomEventPlan(input: CustomEventInput): CustomEventResult {
  const baseRatios = { ...OCCASION_RATIOS[input.occasionType] };
  const boostCategory = MUST_HAVE_TO_CATEGORY[input.mustHavePriority];

  // Apply +10% boost to the must-have category, proportionally reduce others
  const boostAmount = 0.10;
  const originalBoostRatio = baseRatios[boostCategory];
  const newBoostRatio = Math.min(0.60, originalBoostRatio + boostAmount);
  const actualBoost = newBoostRatio - originalBoostRatio;

  // Proportionally reduce remaining categories
  const otherCategories = (Object.keys(baseRatios) as EventCategory[]).filter(c => c !== boostCategory);
  const otherSum = otherCategories.reduce((s, c) => s + baseRatios[c], 0);

  const adjustedRatios: Record<EventCategory, number> = { ...baseRatios };
  adjustedRatios[boostCategory] = newBoostRatio;
  for (const cat of otherCategories) {
    adjustedRatios[cat] = baseRatios[cat] - (baseRatios[cat] / otherSum) * actualBoost;
  }

  // Generate budget items
  const categories: EventCategory[] = ["venue", "catering", "decor", "photography", "logistics", "miscellaneous"];
  const categoryLabels: Record<EventCategory, string> = {
    venue: "Event Venue & Space",
    catering: `Feast & Dining (${input.guestCount} pax)`,
    decor: "Stage, Decor & Ambience",
    photography: "Photography & Memories",
    logistics: "Logistics & Transport",
    miscellaneous: "Emergency Buffer & Extras"
  };

  const budgetItems: BudgetItem[] = categories.map((cat, idx) => {
    const allocatedAmount = Math.round(input.totalBudgetCap * adjustedRatios[cat]);
    let notes = cat === boostCategory ? `+10% Must-Have boost applied (${input.mustHavePriority})` : "AI-generated estimate";
    if (cat === "catering" && input.dietaryProfile) {
      notes += ` · Dietary: ${input.dietaryProfile}`;
    }
    if (cat === "logistics" && input.guestAccessibility) {
      notes += ` · Accessibility: ${input.guestAccessibility}`;
    }
    return {
      id: `custom-${idx + 1}`,
      category: cat,
      label: categoryLabels[cat],
      allocatedAmount,
      actualAmount: 0,
      isEstimate: true,
      notes
    };
  });

  // Guarantee exact penny matching with zero rounding drift
  const currentSum = budgetItems.reduce((acc, curr) => acc + curr.allocatedAmount, 0);
  const diff = input.totalBudgetCap - currentSum;
  if (diff !== 0 && budgetItems.length > 0) {
    budgetItems[0].allocatedAmount += diff;
  }

  // Generate milestone DAG
  const milestoneTemplates = OCCASION_MILESTONES[input.occasionType];
  const milestones: MilestoneTask[] = milestoneTemplates.map((tmpl, idx) => {
    const deadlineDays = Math.max(1, Math.round(input.daysUntilEvent * tmpl.deadlineRatio));
    return {
      id: `cm-${idx + 1}`,
      title: tmpl.suffix,
      deadlineDaysBeforeEvent: deadlineDays,
      category: tmpl.category,
      dependsOn: idx === 0 ? [] : [`cm-${idx}`],
      status: "pending" as const,
      urgency: tmpl.urgency,
      leadTimeDays: deadlineDays
    };
  });

  return { budget: budgetItems, budgetItems, milestones };
}
