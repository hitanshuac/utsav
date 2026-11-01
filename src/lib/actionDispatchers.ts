/**
 * UtsavAI — Native Zero-Cost Action Dispatchers
 * Implements client-side RFC 5545 iCalendar generation and sanitized WhatsApp (wa.me) dispatch links.
 * Requires 0 external API keys, 0 third-party packages, and works 100% offline.
 */

import { MilestoneTask } from "../types/planner";

/**
 * Generates a downloadable RFC 5545 .ics calendar file containing all DAG milestones
 * with calculated calendar dates relative to the event date.
 *
 * @param tasksOrMilestones - List of milestone tasks or task objects with target dates
 * @param eventDateStr - Target event ISO date string (optional if task objects provided)
 * @param eventTitle - Event title for the calendar summary
 * @returns RFC 5545 compliant iCalendar string
 */
export function generateIcsCalendar(
  milestones: MilestoneTask[],
  eventDateStr: string,
  eventTitle: string
): string;
export function generateIcsCalendar(
  tasks: Array<{ title: string; targetDate: Date }>
): string;
export function generateIcsCalendar(
  tasksOrMilestones: MilestoneTask[] | Array<{ title: string; targetDate: Date }>,
  eventDateStr?: string,
  eventTitle?: string
): string {
  const nowStr = new Date().toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";

  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//UtsavAI//Event Planner Execution Engine//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH"
  ];

  if (eventDateStr && eventTitle) {
    const eventDate = new Date(eventDateStr);
    const milestones = tasksOrMilestones as MilestoneTask[];

    for (const task of milestones) {
      const taskDate = new Date(eventDate.getTime() - task.deadlineDaysBeforeEvent * 86400000);
      const dateFormatted = taskDate.toISOString().split("T")[0].replace(/-/g, "");

      lines.push(
        "BEGIN:VEVENT",
        `UID:utsav-${task.id}-${dateFormatted}@utsavai.org`,
        `DTSTAMP:${nowStr}`,
        `DTSTART;VALUE=DATE:${dateFormatted}`,
        `SUMMARY:[${eventTitle}] ${task.title}`,
        `DESCRIPTION:UtsavAI Milestone Task\\nCategory: ${task.category}\\nUrgency: ${task.urgency}\\nStatus: ${task.status}`,
        `STATUS:${task.status === "completed" ? "CONFIRMED" : "TENTATIVE"}`,
        "END:VEVENT"
      );
    }
  } else {
    // Array<{ title: string; targetDate: Date }> overload
    const tasks = tasksOrMilestones as Array<{ title: string; targetDate: Date }>;
    for (let i = 0; i < tasks.length; i++) {
      const t = tasks[i];
      const dateFormatted = t.targetDate.toISOString().split("T")[0].replace(/-/g, "");
      lines.push(
        "BEGIN:VEVENT",
        `UID:utsav-task-${i}-${dateFormatted}@utsavai.org`,
        `DTSTAMP:${nowStr}`,
        `DTSTART;VALUE=DATE:${dateFormatted}`,
        `SUMMARY:${t.title}`,
        "STATUS:CONFIRMED",
        "END:VEVENT"
      );
    }
  }

  lines.push("END:VCALENDAR");
  return lines.join("\r\n");
}

/**
 * Generates a sanitized https://wa.me/ URL pre-populated with numbered clarification questions
 * or a customized message for the vendor.
 *
 * @param phoneNumber - Vendor phone number in international or local format
 * @param messageOrQuestions - Single message string or array of numbered negotiation questions
 * @param vendorName - Optional vendor name for contextual greeting
 * @returns Fully encoded https://wa.me URL string
 */
export function generateWhatsAppLink(
  phoneNumber: string,
  messageOrQuestions: string | string[],
  vendorName?: string
): string {
  const cleanPhone = phoneNumber.replace(/[^\d]/g, "");

  let text = "";
  if (Array.isArray(messageOrQuestions)) {
    const header = vendorName
      ? `Namaste ${vendorName}! Regarding the celebration quote, please clarify:`
      : `Namaste! Regarding the celebration quotation, please clarify the following points:`;
    const formattedQuestions = messageOrQuestions
      .map((q, idx) => `${idx + 1}. ${q.trim()}`)
      .join("\n");
    text = `${header}\n${formattedQuestions}\n\nDhanyawad!`;
  } else {
    text = messageOrQuestions.trim();
  }

  const encodedText = encodeURIComponent(text);
  return cleanPhone
    ? `https://wa.me/${cleanPhone}?text=${encodedText}`
    : `https://wa.me/?text=${encodedText}`;
}

/**
 * Generates a pre-formatted WhatsApp clarification link for a specific vendor and questions list.
 *
 * @param phone - Raw phone number string
 * @param vendor - Vendor contact or business name
 * @param questions - Array of audit clarification questions
 * @returns Encoded https://wa.me URL link
 */
export function createWhatsAppDispatchLink(
  phone: string,
  vendor: string,
  questions: string[]
): string {
  const cleanPhone = phone.replace(/[^0-9]/g, "");
  const text = `Hi ${vendor}, regarding the quotation details:\n${questions.map((q, idx) => `${idx + 1}. ${q}`).join("\n")}\n\nCould you please clarify these points? Thank you!`;
  return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`;
}
