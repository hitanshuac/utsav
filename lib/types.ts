import { z } from "zod";

export const EventCategorySchema = z.enum([
  "venue",
  "catering",
  "decor",
  "photography",
  "logistics",
  "miscellaneous"
]);
export type EventCategory = z.infer<typeof EventCategorySchema>;

export const BudgetItemSchema = z.object({
  id: z.string(),
  category: EventCategorySchema,
  label: z.string(),
  allocatedAmount: z.number().nonnegative(),
  actualAmount: z.number().nonnegative(),
  isEstimate: z.boolean(),
  notes: z.string().optional()
});
export type BudgetItem = z.infer<typeof BudgetItemSchema>;

export const DelayStatusSchema = z.enum(["on_time", "delayed", "blocked"]);
export type DelayStatus = z.infer<typeof DelayStatusSchema>;

export const TMinusStageSchema = z.enum(["t_30", "t_7", "t_24h", "day_of"]);
export type TMinusStage = z.infer<typeof TMinusStageSchema>;

export const MilestoneTaskSchema = z.object({
  id: z.string(),
  title: z.string(),
  deadlineDaysBeforeEvent: z.number().int().nonnegative(),
  category: EventCategorySchema,
  dependsOn: z.array(z.string()), // Prerequisite task IDs
  status: z.enum(["pending", "in_progress", "completed"]),
  urgency: z.enum(["low", "medium", "critical"]),
  delayMinutes: z.number().int().nonnegative().optional(),
  delayStatus: DelayStatusSchema.optional(),
  timeSlot: z.string().optional(), // e.g. "17:30 - Baraat Arrival"
  tMinusStage: TMinusStageSchema.optional(),
  vendorContact: z
    .object({
      name: z.string(),
      phone: z.string(),
      role: z.string(),
      email: z.string().optional()
    })
    .optional()
});
export type MilestoneTask = z.infer<typeof MilestoneTaskSchema>;

export const LifafaCategorySchema = z.enum([
  "panditji",
  "dhol_band",
  "valet_driver",
  "housekeeping",
  "vendor_staff",
  "contingency"
]);
export type LifafaCategory = z.infer<typeof LifafaCategorySchema>;

export const LifafaItemSchema = z.object({
  id: z.string(),
  recipient: z.string(),
  category: LifafaCategorySchema,
  amount: z.number().positive(),
  status: z.enum(["prepared", "handed_over"]),
  assignedFamilyMember: z.string().optional(),
  notes: z.string().optional()
});
export type LifafaItem = z.infer<typeof LifafaItemSchema>;

export const EmergencyChecklistItemSchema = z.object({
  id: z.string(),
  label: z.string(),
  category: z.enum(["rituals", "power_av", "bridal_vanity", "permits_security"]),
  isReady: z.boolean(),
  responsiblePerson: z.string(),
  contactPhone: z.string().optional()
});
export type EmergencyChecklistItem = z.infer<typeof EmergencyChecklistItemSchema>;

export const FloatingGuestConfigSchema = z.object({
  cardsInvited: z.number().int().positive(),
  avgPerCard: z.number().positive(), // Typically 2.2 to 2.8 in India
  bufferPercent: z.number().int().min(0).max(50), // 10%, 15%, 20%
  mgPercent: z.number().int().min(50).max(100), // Minimum guarantee % of expected
  basePlateRate: z.number().positive(),
  lastMinutePenaltyPercent: z.number().positive() // e.g., 25% or 40% penalty for plates added on the night
});
export type FloatingGuestConfig = z.infer<typeof FloatingGuestConfigSchema>;

export const VendorAuditResultSchema = z.object({
  vendorName: z.string(),
  quotedAmount: z.number().nonnegative(),
  detectedInclusions: z.array(z.string()),
  flaggedHiddenCosts: z.array(z.string()),
  negotiationQuestions: z.array(z.string()).max(3)
});
export type VendorAuditResult = z.infer<typeof VendorAuditResultSchema>;

export const TradeoffResolutionSchema = z.object({
  strategyTitle: z.string(),
  description: z.string(),
  adjustments: z.array(
    z.object({
      category: EventCategorySchema,
      delta: z.number(), // Positive or negative budget shift
      rationale: z.string()
    })
  )
});
export type TradeoffResolution = z.infer<typeof TradeoffResolutionSchema>;

export const TradeoffStrategiesResponseSchema = z.object({
  strategies: z.array(TradeoffResolutionSchema).min(1).max(3)
});
export type TradeoffStrategiesResponse = z.infer<typeof TradeoffStrategiesResponseSchema>;

export const PlannerApiRequestSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("audit_vendor"),
    vendorNote: z.string().min(1).max(1200),
    guestCount: z.number().int().positive()
  }),
  z.object({
    action: z.literal("suggest_tradeoffs"),
    budgetCap: z.number().nonnegative(),
    totalAllocated: z.number().nonnegative(),
    guestCount: z.number().int().positive(),
    categories: z.array(
      z.object({
        category: EventCategorySchema,
        allocatedAmount: z.number().nonnegative()
      })
    )
  }),
  z.object({
    action: z.literal("parse_task"),
    text: z.string().min(1).max(300)
  })
]);
export type PlannerApiRequest = z.infer<typeof PlannerApiRequestSchema>;
