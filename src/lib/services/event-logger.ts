import { EventCategory, MilestoneTask } from "../../../lib/types";

export type ActivityChannel =
  | "whatsapp"
  | "email"
  | "call"
  | "ai_followup"
  | "edge_case"
  | "loop_closed";

export type EdgeCaseTemplateType =
  | "standard"
  | "delay_shift"
  | "guest_surge"
  | "backup_sos";

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

const STORAGE_KEY = "utsav_persistent_event_log_v1";

const INITIAL_SEED_EVENTS: ActivityLogEvent[] = [
  {
    id: "evt-seed-1",
    taskId: "m1",
    taskTitle: "Lock Heritage Banquet Hall & Sign Deposit Contract",
    category: "venue",
    channel: "loop_closed",
    vendorName: "Sunil Verma",
    recipient: "+91 98101 11223",
    summary: "Call completed · Hall deposit & 250 kVA backup clause confirmed",
    edgeCaseType: "standard",
    loopStatus: "closed",
    closedBy: "human_call",
    resolutionNote: "Signed contract & locked generator diesel rate.",
    timestamp: new Date(Date.now() - 1000 * 60 * 140).toISOString()
  },
  {
    id: "evt-seed-2",
    taskId: "m2",
    taskTitle: "Finalize Royal Caterers Tasting & Minimum Guarantee",
    category: "catering",
    channel: "whatsapp",
    vendorName: "Rajesh Sharma",
    recipient: "919810123456",
    summary: "WhatsApp sent · +15% floating crowd buffer & MG plate check",
    messageBody:
      "Namaste Rajesh Sharma ji, confirming 180 MG plates + 15% floating buffer for Sharma Wedding. Please confirm call time.",
    edgeCaseType: "guest_surge",
    loopStatus: "awaiting_call",
    timestamp: new Date(Date.now() - 1000 * 60 * 45).toISOString()
  },
  {
    id: "evt-seed-3",
    taskId: "m7",
    taskTitle: "Stage Soundcheck & 250 kVA Generator Test Run",
    category: "logistics",
    channel: "email",
    vendorName: "Mukesh Yadav",
    recipient: "mukesh@yadavpower.in",
    summary: "3rd-party Email sent · Generator load & rain backup check",
    messageBody:
      "Urgent T-24h check: Please verify 250 kVA diesel generator load test before Baraat assembly.",
    edgeCaseType: "backup_sos",
    loopStatus: "awaiting_call",
    timestamp: new Date(Date.now() - 1000 * 60 * 18).toISOString()
  }
];

let memoryEvents: ActivityLogEvent[] | null = null;
const listeners = new Set<() => void>();

function loadEvents(): ActivityLogEvent[] {
  if (memoryEvents !== null) {
    return memoryEvents;
  }
  if (typeof window !== "undefined" && window.localStorage) {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          memoryEvents = parsed;
          return memoryEvents;
        }
      }
    } catch {
      // Fallback to in-memory seed
    }
  }
  memoryEvents = [...INITIAL_SEED_EVENTS];
  saveEvents(memoryEvents);
  return memoryEvents;
}

function saveEvents(events: ActivityLogEvent[]): void {
  memoryEvents = events;
  if (typeof window !== "undefined" && window.localStorage) {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(events));
    } catch {
      // Ignore quota errors in restricted sandboxes
    }
  }
  listeners.forEach((fn) => fn());
}

export function subscribeToEventLogger(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/**
 * Logs a new activity event and persists it to localStorage.
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

  // Mark all existing open events for this task as closed
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
 * Generates prefilled, editable message templates tailored to Indian wedding edge cases.
 */
export function buildEditableTemplate(
  task: Pick<
    MilestoneTask,
    "id" | "title" | "category" | "deadlineDaysBeforeEvent" | "timeSlot" | "vendorContact"
  >,
  channel: "whatsapp" | "email",
  edgeCase: EdgeCaseTemplateType = "standard",
  eventTitle: string = "Sharma Family Wedding"
): { subject: string; body: string; summary: string } {
  const vendorName = task.vendorContact?.name || "Partner";
  const timing = task.timeSlot || `T-${task.deadlineDaysBeforeEvent}d`;

  if (edgeCase === "delay_shift") {
    const subject = `[TIMING SHIFT] ${eventTitle}: ${task.title} (${timing})`;
    const body =
      channel === "whatsapp"
        ? `Namaste ${vendorName} ji, schedule update for *${task.title}* (${timing}): upstream ceremony is running +30 mins behind. Please hold crew standby and confirm on a quick call.`
        : `Hello ${vendorName},\n\nWe have a +30 minute timing adjustment affecting "${task.title}" (${timing}).\nPlease keep your team on standby and confirm revised readiness via phone call.\n\n-- ${eventTitle} Operations`;
    return {
      subject,
      body,
      summary: `Timing shift (+30m) template sent to ${vendorName}`
    };
  }

  if (edgeCase === "guest_surge") {
    const subject = `[+15% SURGE BUFFER] ${eventTitle}: ${task.title}`;
    const body =
      channel === "whatsapp"
        ? `Namaste ${vendorName} ji, we are seeing extra floating guests arriving for *${task.title}*. Please activate the +15% buffer arrangement immediately. Calling you in 5 mins to confirm.`
        : `Hello ${vendorName},\n\nDue to additional floating guest arrivals, please activate the +15% contingency buffer for "${task.title}" (${timing}).\nWe will follow up via phone call shortly to lock final numbers.\n\n-- ${eventTitle} Operations`;
    return {
      subject,
      body,
      summary: `+15% guest surge buffer template sent to ${vendorName}`
    };
  }

  if (edgeCase === "backup_sos") {
    const subject = `[URGENT BACKUP SOS] ${eventTitle}: ${task.title}`;
    const body =
      channel === "whatsapp"
        ? `🚨 *URGENT SOS* — Namaste ${vendorName} ji, we need immediate backup verification for *${task.title}* (${timing}). Please confirmspare equipment/staff readiness right away.`
        : `URGENT BACKUP CHECK — ${vendorName},\n\nPlease verify emergency backup readiness for "${task.title}" (${timing}) immediately.\nCalling your mobile number now to close the loop.\n\n-- ${eventTitle} Operations`;
    return {
      subject,
      body,
      summary: `Backup SOS template sent to ${vendorName}`
    };
  }

  // Standard confirmation
  const subject = `[CONFIRMATION NEEDED] ${eventTitle}: ${task.title} (${timing})`;
  const body =
    channel === "whatsapp"
      ? `Namaste ${vendorName} ji, checking in on *${task.title}* (${timing}) for ${eventTitle}. Please reply or confirm on our follow-up call.`
      : `Hello ${vendorName},\n\nThis is a T-Minus check-in for "${task.title}" (${timing}) at ${eventTitle}.\nPlease confirm your team's readiness. We will follow up with a brief call to close the loop.\n\n-- ${eventTitle} Operations`;

  return {
    subject,
    body,
    summary: `Confirmation request sent to ${vendorName}`
  };
}

/**
 * Calculates frequency and effectiveness of communication interactions (calls, emails, messages) per vendor.
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
    // If all outreach loops have been closed, effectiveness is high
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

/**
 * Resets event log to empty or seed state (used in unit tests).
 */
export function resetActivityLogger(useSeed: boolean = false): void {
  saveEvents(useSeed ? [...INITIAL_SEED_EVENTS] : []);
}
