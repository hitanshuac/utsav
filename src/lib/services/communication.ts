import { EventCategory } from "../../../lib/types";
import { EdgeCaseTemplateType, logActivityEvent } from "./event-logger";

export type CommunicationChannel = "whatsapp" | "email";

export interface VendorRecipient {
  name: string;
  phone?: string;
  email?: string;
  role?: string;
  isThirdParty?: boolean;
}

export interface WhatsAppNotificationRequest {
  taskId: string;
  taskTitle: string;
  category?: EventCategory;
  phone: string;
  vendorName?: string;
  message: string;
  waUrl?: string;
  edgeCaseType?: EdgeCaseTemplateType;
  skipPersistentLog?: boolean;
}

export interface EmailNotificationRequest {
  taskId: string;
  taskTitle: string;
  category?: EventCategory;
  to: string;
  vendorName?: string;
  subject: string;
  body: string;
  mailtoUrl?: string;
  isThirdParty?: boolean;
  edgeCaseType?: EdgeCaseTemplateType;
  skipPersistentLog?: boolean;
}

export interface CommunicationResult {
  id: string;
  taskId: string;
  channel: CommunicationChannel;
  recipient: string;
  vendorName: string;
  ok: boolean;
  status: "sent" | "blocked_internal_manager";
  reason?: string;
  timestamp: string;
  preview: string;
  actionUrl?: string;
}

/**
 * Internal manager/coordinator emails that must NOT receive 3rd-party vendor email dispatches.
 */
const INTERNAL_MANAGER_EMAILS = new Set([
  "hitanshuac@gmail.com",
  "manager@utsav.in",
  "coordinator@utsav.in",
  "planner@utsav.in",
  "admin@utsav.in",
  "family@sharmawedding.in"
]);

const dispatchHistory: CommunicationResult[] = [];

/**
 * Checks whether an email address belongs to an internal event manager rather than a 3rd-party vendor.
 */
export function isInternalManagerEmail(email: string): boolean {
  const normalized = email.trim().toLowerCase();
  if (!normalized) return true;
  if (INTERNAL_MANAGER_EMAILS.has(normalized)) return true;
  return normalized.endsWith("@internal.utsav.in");
}

/**
 * Deterministically resolves a 3rd-party vendor email address from a task's vendorContact or category.
 */
export function resolveThirdPartyVendorEmail(
  vendorContact?: { name: string; phone?: string; role?: string; email?: string },
  category: string = "vendor"
): string {
  if (vendorContact?.email && !isInternalManagerEmail(vendorContact.email)) {
    return vendorContact.email.trim().toLowerCase();
  }

  if (vendorContact?.name) {
    const slug = vendorContact.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, ".")
      .replace(/^\.+|\.+$/g, "");
    return `${slug || "contact"}@vendor.utsav.in`;
  }

  return `${category.toLowerCase()}.partner@vendor.utsav.in`;
}

/**
 * Triggers a mock WhatsApp notification to a 3rd-party vendor or task contact,
 * and logs the dispatch to the persistent event logger with 'awaiting_call' loop status.
 */
export function triggerWhatsAppNotification(
  request: WhatsAppNotificationRequest
): CommunicationResult {
  const cleanPhone = request.phone.replace(/[^0-9]/g, "") || "919810123456";
  const waUrl =
    request.waUrl ||
    `https://wa.me/${cleanPhone}?text=${encodeURIComponent(request.message)}`;

  const vendorName = request.vendorName || "3rd-Party Vendor";
  const nowIso = new Date().toISOString();

  const result: CommunicationResult = {
    id: `wa-${request.taskId}-${Date.now()}`,
    taskId: request.taskId,
    channel: "whatsapp",
    recipient: cleanPhone,
    vendorName,
    ok: true,
    status: "sent",
    timestamp: nowIso,
    preview: request.message,
    actionUrl: waUrl
  };

  dispatchHistory.unshift(result);

  if (!request.skipPersistentLog) {
    logActivityEvent({
      taskId: request.taskId,
      taskTitle: request.taskTitle,
      category: request.category || "logistics",
      channel: "whatsapp",
      vendorName,
      recipient: cleanPhone,
      summary: `WhatsApp sent to ${vendorName} · Call pending to close loop`,
      messageBody: request.message,
      edgeCaseType: request.edgeCaseType || "standard",
      loopStatus: "awaiting_call",
      timestamp: nowIso
    });
  }

  return result;
}

/**
 * Triggers a mock Email notification strictly for 3rd-party vendors.
 * Blocks dispatches addressed to internal managers/coordinators.
 */
export function triggerEmailNotification(
  request: EmailNotificationRequest
): CommunicationResult {
  const normalizedTo = request.to.trim().toLowerCase();
  const isBlocked =
    request.isThirdParty === false || isInternalManagerEmail(normalizedTo);

  if (isBlocked) {
    const blockedResult: CommunicationResult = {
      id: `email-blocked-${request.taskId}-${Date.now()}`,
      taskId: request.taskId,
      channel: "email",
      recipient: normalizedTo,
      vendorName: request.vendorName || "Internal Coordinator",
      ok: false,
      status: "blocked_internal_manager",
      reason: "Email notifications are restricted to 3rd-party vendors only, not internal managers.",
      timestamp: new Date().toISOString(),
      preview: request.subject
    };
    dispatchHistory.unshift(blockedResult);
    return blockedResult;
  }

  const mailtoUrl =
    request.mailtoUrl ||
    `mailto:${encodeURIComponent(normalizedTo)}?subject=${encodeURIComponent(
      request.subject
    )}&body=${encodeURIComponent(request.body)}`;

  const vendorName = request.vendorName || "3rd-Party Vendor";
  const nowIso = new Date().toISOString();

  const result: CommunicationResult = {
    id: `email-${request.taskId}-${Date.now()}`,
    taskId: request.taskId,
    channel: "email",
    recipient: normalizedTo,
    vendorName,
    ok: true,
    status: "sent",
    timestamp: nowIso,
    preview: request.subject,
    actionUrl: mailtoUrl
  };

  dispatchHistory.unshift(result);

  if (!request.skipPersistentLog) {
    logActivityEvent({
      taskId: request.taskId,
      taskTitle: request.taskTitle,
      category: request.category || "logistics",
      channel: "email",
      vendorName,
      recipient: normalizedTo,
      summary: `3rd-party Email sent (${normalizedTo}) · Call pending to close loop`,
      messageBody: request.body,
      edgeCaseType: request.edgeCaseType || "standard",
      loopStatus: "awaiting_call",
      timestamp: nowIso
    });
  }

  return result;
}

// Convenient aliases for external consumers
export const sendWhatsAppNotification = triggerWhatsAppNotification;
export const sendEmailNotification = triggerEmailNotification;

/**
 * Returns recorded notification dispatches (optionally filtered by taskId).
 */
export function getDispatchLog(taskId?: string): CommunicationResult[] {
  if (!taskId) return [...dispatchHistory];
  return dispatchHistory.filter((entry) => entry.taskId === taskId);
}

/**
 * Returns the most recent successful WhatsApp and 3rd-party Email dispatches for a specific task.
 */
export function getLatestTaskDispatches(taskId: string): {
  whatsapp?: CommunicationResult;
  email?: CommunicationResult;
} {
  const entries = dispatchHistory.filter((e) => e.taskId === taskId && e.ok);
  return {
    whatsapp: entries.find((e) => e.channel === "whatsapp"),
    email: entries.find((e) => e.channel === "email")
  };
}

/**
 * Clears the in-memory notification dispatch log (useful for deterministic unit tests).
 */
export function clearDispatchLog(): void {
  dispatchHistory.length = 0;
}
