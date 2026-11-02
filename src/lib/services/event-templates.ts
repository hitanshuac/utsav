/**
 * Prefilled editable message templates tailored to Indian event logistics and edge cases.
 */
import { MilestoneTask } from "../../types/planner";
import { EdgeCaseTemplateType } from "./event-types";

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

  if (edgeCase === "delay_shift" || edgeCase === "delay_30m") {
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

  if (edgeCase === "guest_surge" || edgeCase === "budget_surge") {
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
        ? `🚨 *URGENT SOS* — Namaste ${vendorName} ji, we need immediate backup verification for *${task.title}* (${timing}). Please confirm spare equipment/staff readiness right away.`
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
