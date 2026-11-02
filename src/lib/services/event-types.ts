/**
 * Shared activity log types and domain event models.
 */
import { EventCategory } from "../../types/planner";

export type ActivityChannel =
  | "whatsapp"
  | "email"
  | "call"
  | "ai_followup"
  | "edge_case"
  | "loop_closed"
  | "system";

export type EdgeCaseTemplateType =
  | "standard"
  | "delay_shift"
  | "guest_surge"
  | "backup_sos"
  | "delay_30m"
  | "budget_surge";

export type LoopStatus = "awaiting_call" | "closed";

export interface ActivityLogEvent {
  id: string;
  taskId: string;
  taskTitle: string;
  category: EventCategory;
  channel: ActivityChannel;
  vendorName: string;
  recipient: string;
  summary: string;
  messageBody?: string;
  edgeCaseType?: EdgeCaseTemplateType;
  loopStatus: LoopStatus;
  closedBy?: "human_call" | "ai_assist";
  resolutionNote?: string;
  timestamp: string;
}

export interface ActivityStats {
  total: number;
  whatsappCount: number;
  emailCount: number;
  callCount: number;
  aiFollowupCount: number;
  edgeCaseCount: number;
  closedLoopCount: number;
  pendingCallCount: number;
  mostRecent: ActivityLogEvent | null;
}

export interface VendorCommunicationMetrics {
  vendorName: string;
  totalInteractions: number;
  calls: number;
  emails: number;
  messages: number;
  callPercentage: number;
  emailPercentage: number;
  messagePercentage: number;
  closedLoops: number;
  openLoops: number;
  effectivenessScore: number;
  effectivenessLabel: "High" | "Moderate" | "Needs Attention" | "Pending Initial Outreach";
  interactionVelocity: string;
  timeline: {
    timestamp: string;
    channel: ActivityChannel;
    summary: string;
    loopStatus: LoopStatus;
  }[];
}
