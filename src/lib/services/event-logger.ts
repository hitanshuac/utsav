/**
 * In-memory activity log event dispatcher, loop closure tracking, and vendor metrics.
 */
import { EventCategory } from "../../types/planner";
import {
  ActivityChannel,
  EdgeCaseTemplateType,
  LoopStatus,
  ActivityLogEvent,
  ActivityStats,
  VendorCommunicationMetrics
} from "./event-types";
import { INITIAL_SEED_EVENTS } from "./event-seed-data";
import { buildEditableTemplate } from "./event-templates";

export type {
  ActivityChannel,
  EdgeCaseTemplateType,
  LoopStatus,
  ActivityLogEvent,
  ActivityStats,
  VendorCommunicationMetrics
};

export { buildEditableTemplate };

let memoryEvents: ActivityLogEvent[] | null = null;
const listeners = new Set<() => void>();

function loadEvents(): ActivityLogEvent[] {
  if (memoryEvents !== null) {
    return memoryEvents;
  }
  memoryEvents = [...INITIAL_SEED_EVENTS];
  return memoryEvents;
}

function saveEvents(events: ActivityLogEvent[]): void {
  memoryEvents = events;
  listeners.forEach((fn) => fn());
}

export function subscribeToEventLogger(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/**
 * Logs a new activity event in ephemeral memory.
 */
export function logActivityEvent(
  input: Omit<ActivityLogEvent, "id" | "timestamp" | "loopStatus"> & {
    loopStatus?: LoopStatus;
    timestamp?: string;
  }
): ActivityLogEvent {
  const current = loadEvents();
  const defaultLoopStatus: LoopStatus =
    input.channel === "loop_closed" || input.channel === "call"
      ? "closed"
      : "awaiting_call";

  const entry: ActivityLogEvent = {
    ...input,
    id: `evt-${input.taskId}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    loopStatus: input.loopStatus ?? defaultLoopStatus,
    timestamp: input.timestamp ?? new Date().toISOString()
  };

  const next = [entry, ...current];
  saveEvents(next);
  return entry;
}

export const logEventActivity = logActivityEvent;

/**
 * Closes the loop on a task's pending activities via human call or AI follow-up.
 */
export function closeTaskActivityLoop(params: {
  taskId: string;
  taskTitle: string;
  category: EventCategory;
  vendorName: string;
  recipient: string;
  closedBy: "human_call" | "ai_assist";
  resolutionNote?: string;
}): ActivityLogEvent {
  const current = loadEvents();

  const updated = current.map((evt) =>
    evt.taskId === params.taskId && evt.loopStatus === "awaiting_call"
      ? {
          ...evt,
          loopStatus: "closed" as LoopStatus,
          closedBy: params.closedBy,
          resolutionNote: params.resolutionNote || "Confirmed via follow-up call"
        }
      : evt
  );

  const closureEvent: ActivityLogEvent = {
    id: `evt-close-${params.taskId}-${Date.now()}`,
    taskId: params.taskId,
    taskTitle: params.taskTitle,
    category: params.category,
    channel: params.closedBy === "human_call" ? "call" : "ai_followup",
    vendorName: params.vendorName,
    recipient: params.recipient,
    summary:
      params.closedBy === "human_call"
        ? `Call completed · ${params.resolutionNote || "Vendor confirmed readiness"}`
        : `AI Follow-up verified · ${params.resolutionNote || "Auto-confirmed vendor slot"}`,
    loopStatus: "closed",
    closedBy: params.closedBy,
    resolutionNote: params.resolutionNote,
    timestamp: new Date().toISOString()
  };

  saveEvents([closureEvent, ...updated]);
  return closureEvent;
}

/**
 * Returns all persisted events (newest first), optionally filtered by taskId or channel.
 */
export function getActivityEvents(options?: {
  taskId?: string;
  channel?: ActivityChannel;
  onlyAwaitingCall?: boolean;
}): ActivityLogEvent[] {
  const all = loadEvents();
  return all.filter((e) => {
    if (options?.taskId && e.taskId !== options.taskId) return false;
    if (options?.channel && e.channel !== options.channel) return false;
    if (options?.onlyAwaitingCall && e.loopStatus !== "awaiting_call") return false;
    return true;
  });
}

/**
 * Computes aggregate counts of each activity type, pending call loops, and most recent event.
 */
export function getActivityStats(taskId?: string): ActivityStats {
  const list = getActivityEvents(taskId ? { taskId } : undefined);

  let whatsappCount = 0;
  let emailCount = 0;
  let callCount = 0;
  let aiFollowupCount = 0;
  let edgeCaseCount = 0;
  let closedLoopCount = 0;

  const pendingTaskIds = new Set<string>();

  for (const e of list) {
    if (e.channel === "whatsapp") whatsappCount++;
    if (e.channel === "email") emailCount++;
    if (e.channel === "call") callCount++;
    if (e.channel === "ai_followup") aiFollowupCount++;
    if (e.channel === "edge_case" || (e.edgeCaseType && e.edgeCaseType !== "standard")) {
      edgeCaseCount++;
    }
    if (e.loopStatus === "closed") {
      closedLoopCount++;
    } else if (e.loopStatus === "awaiting_call") {
      pendingTaskIds.add(e.taskId);
    }
  }

  return {
    total: list.length,
    whatsappCount,
    emailCount,
    callCount,
    aiFollowupCount,
    edgeCaseCount,
    closedLoopCount,
    pendingCallCount: pendingTaskIds.size,
    mostRecent: list[0] ?? null
  };
}

/**
 * Calculates frequency and effectiveness of communication interactions per vendor.
 */
export function getVendorCommunicationMetrics(
  vendorName: string,
  taskId?: string
): VendorCommunicationMetrics {
  const all = loadEvents();
  const normalizedName = vendorName.trim().toLowerCase();

  const vendorEvents = all.filter((e) => {
    const matchesVendor =
      e.vendorName.trim().toLowerCase() === normalizedName ||
      e.vendorName.trim().toLowerCase().includes(normalizedName) ||
      normalizedName.includes(e.vendorName.trim().toLowerCase());
    if (!matchesVendor) return false;
    if (taskId && e.taskId !== taskId) return false;
    return true;
  });

  let calls = 0;
  let emails = 0;
  let messages = 0;
  let closedLoops = 0;
  let openLoops = 0;

  for (const e of vendorEvents) {
    if (e.channel === "call") calls++;
    else if (e.channel === "email") emails++;
    else if (e.channel === "whatsapp") messages++;
    else if (e.channel === "loop_closed") calls++;

    if (e.loopStatus === "closed") closedLoops++;
    else if (e.loopStatus === "awaiting_call") openLoops++;
  }

  const totalInteractions = calls + emails + messages;
  const callPercentage = totalInteractions > 0 ? Math.round((calls / totalInteractions) * 100) : 0;
  const emailPercentage = totalInteractions > 0 ? Math.round((emails / totalInteractions) * 100) : 0;
  const messagePercentage = totalInteractions > 0 ? Math.round((messages / totalInteractions) * 100) : 0;

  let effectivenessScore = 0;
  let effectivenessLabel: VendorCommunicationMetrics["effectivenessLabel"] = "Pending Initial Outreach";
  let interactionVelocity = "No interactions logged";

  if (totalInteractions > 0) {
    const closureRatio = closedLoops / (closedLoops + openLoops || 1);
    effectivenessScore = Math.min(100, Math.round(closureRatio * 100));

    if (effectivenessScore >= 80) {
      effectivenessLabel = "High";
      interactionVelocity = "Smooth closure cadence";
    } else if (effectivenessScore >= 50) {
      effectivenessLabel = "Moderate";
      interactionVelocity = "Follow-up calls pending";
    } else {
      effectivenessLabel = "Needs Attention";
      interactionVelocity = "Awaiting verbal confirmation";
    }
  }

  const timeline = vendorEvents.slice(0, 5).map((e) => ({
    timestamp: e.timestamp,
    channel: e.channel,
    summary: e.summary,
    loopStatus: e.loopStatus
  }));

  return {
    vendorName,
    totalInteractions,
    calls,
    emails,
    messages,
    callPercentage,
    emailPercentage,
    messagePercentage,
    closedLoops,
    openLoops,
    effectivenessScore,
    effectivenessLabel,
    interactionVelocity,
    timeline
  };
}

export function resetActivityLogger(useSeed: boolean = false): void {
  saveEvents(useSeed ? [...INITIAL_SEED_EVENTS] : []);
}
