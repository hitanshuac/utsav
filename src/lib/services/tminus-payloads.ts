/**
 * Formatted email and WhatsApp communication payloads for T-Minus milestone alerts.
 */
import { MilestoneTask } from "../../types/planner";
import { resolveThirdPartyVendorEmail } from "./communication";

export function generateEmailPayload(
  task: MilestoneTask,
  eventTitle: string,
  recipientEmail?: string,
  alertMessage?: string
): {
  to: string;
  subject: string;
  body: string;
  mailtoUrl: string;
} {
  const resolvedEmail =
    recipientEmail || resolveThirdPartyVendorEmail(task.vendorContact, task.category);
  const timeContext = task.timeSlot ? ` [${task.timeSlot}]` : ` (T-${task.deadlineDaysBeforeEvent} Days)`;
  const subject = `[URGENT T-MINUS ALERT] ${eventTitle}: ${task.title}${timeContext}`;

  const vendorInfo = task.vendorContact
    ? `\nAssigned Vendor: ${task.vendorContact.name} (${task.vendorContact.role})\nContact Phone: ${task.vendorContact.phone}`
    : "\nAssigned Vendor: External Category Partner";

  const body =
    `URGENT T-MINUS MILESTONE NOTIFICATION\n` +
    `======================================\n\n` +
    `Event: ${eventTitle}\n` +
    `Milestone: ${task.title}\n` +
    `Category: ${task.category.toUpperCase()}\n` +
    `Priority: ${task.urgency.toUpperCase()}\n` +
    `Timing: ${task.timeSlot || `T-${task.deadlineDaysBeforeEvent} Days before event`}\n` +
    `Status: ${task.status.toUpperCase()}\n` +
    `${vendorInfo}\n\n` +
    `Alert Brief:\n` +
    `${alertMessage || "This milestone is nearing its deadline. Please confirm readiness to prevent cascade delays."}\n\n` +
    `--\nUtsav Celebration Operations`;

  const mailtoUrl = `mailto:${encodeURIComponent(resolvedEmail)}?subject=${encodeURIComponent(
    subject
  )}&body=${encodeURIComponent(body)}`;

  return {
    to: resolvedEmail,
    subject,
    body,
    mailtoUrl
  };
}

export function generateWhatsAppPayload(
  task: MilestoneTask,
  eventTitle: string,
  alertMessage?: string
): {
  phone: string;
  text: string;
  waUrl: string;
} {
  const rawPhone = task.vendorContact?.phone || "+919810123456";
  const cleanPhone = rawPhone.replace(/[^0-9]/g, "");

  const timeContext = task.timeSlot ? ` (${task.timeSlot})` : ` (T-${task.deadlineDaysBeforeEvent}d)`;
  const vendorGreeting = task.vendorContact
    ? `Namaste ${task.vendorContact.name} ji`
    : `Namaste Partner`;

  const message =
    `*🚨 URGENT T-MINUS ALERT | ${eventTitle}*\n\n` +
    `${vendorGreeting},\n\n` +
    `*Milestone:* ${task.title}${timeContext}\n` +
    `*Category:* ${task.category.toUpperCase()} | *Priority:* ${task.urgency.toUpperCase()}\n\n` +
    `*Status Note:* ${alertMessage || "Deadline approaching. Immediate confirmation required."}\n\n` +
    `Please reply with your status. Dhanyawad!`;

  const waUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;

  return {
    phone: cleanPhone,
    text: message,
    waUrl
  };
}
