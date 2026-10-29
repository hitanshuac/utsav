import { computeScheduledMilestones } from "../engine/dependency-graph";
import { DelayStatus, EventCategory, MilestoneTask } from "../types";
import {
  CommunicationResult,
  isInternalManagerEmail,
  resolveThirdPartyVendorEmail,
  triggerEmailNotification,
  triggerWhatsAppNotification
} from "./communication";
import { EdgeCaseTemplateType } from "./event-logger";

export interface TMinusAlert {
  id: string;
  taskId: string;
  taskTitle: string;
  category: EventCategory;
  urgency: "critical" | "medium" | "low";
  deadlineDaysBeforeEvent: number;
  timeSlot?: string;
  delayStatus?: DelayStatus;
  delayMinutes?: number;
  targetDate: Date;
  daysRemaining: number;
  isOverdue: boolean;
  alertLevel: "critical" | "warning" | "day_of_alert";
  message: string;
  vendorContact?: {
    name: string;
    phone: string;
    role: string;
    email?: string;
  };
  emailPayload: {
    to: string;
    subject: string;
    body: string;
    mailtoUrl: string;
  };
  whatsAppPayload: {
    phone: string;
    text: string;
    waUrl: string;
  };
  dispatchResults?: {
    whatsapp?: CommunicationResult;
    email?: CommunicationResult;
  };
}

export interface CheckAlertOptions {
  currentDate?: Date;
  thresholdDays?: number;
  eventTitle?: string;
  defaultEmail?: string;
  autoTriggerCritical?: boolean;
}

export class TMinusAlertService {
  private static instance: TMinusAlertService;

  public static getInstance(): TMinusAlertService {
    if (!TMinusAlertService.instance) {
      TMinusAlertService.instance = new TMinusAlertService();
    }
    return TMinusAlertService.instance;
  }

  /**
   * Evaluates milestone schedule state, returns high-priority tasks nearing their T-Minus deadline,
   * and triggers mock WhatsApp and 3rd-party Email notifications via communication.ts when critical.
   */
  public checkApproachingDeadlines(
    milestones: MilestoneTask[],
    eventDateIso: string,
    options: CheckAlertOptions = {}
  ): TMinusAlert[] {
    const {
      currentDate = new Date(),
      thresholdDays = 14,
      eventTitle = "Sharma Family Wedding",
      defaultEmail,
      autoTriggerCritical = true
    } = options;

    const scheduled = computeScheduledMilestones(milestones, eventDateIso);
    const alerts: TMinusAlert[] = [];

    for (const task of scheduled) {
      if (task.status === "completed") continue;

      const targetDate = task.targetDate;
      const msDiff = targetDate.getTime() - currentDate.getTime();
      const daysRemaining = Math.ceil(msDiff / (1000 * 60 * 60 * 24));
      const isOverdue = daysRemaining < 0;

      const isDayOfOr24h = task.deadlineDaysBeforeEvent <= 1 || task.tMinusStage === "day_of";
      const isDelayed = (task.delayMinutes ?? 0) > 0 || task.delayStatus === "delayed";
      const isCriticalNearing = task.urgency === "critical" && daysRemaining <= thresholdDays;

      if (!isCriticalNearing && !isDayOfOr24h && !isDelayed && !isOverdue) {
        continue;
      }

      let alertLevel: TMinusAlert["alertLevel"] = "warning";
      let message = `T-${task.deadlineDaysBeforeEvent}d task nearing deadline.`;

      if (isDayOfOr24h) {
        alertLevel = "day_of_alert";
        message = task.timeSlot
          ? `Day-Of Ceremony Alert: Scheduled at ${task.timeSlot}. Immediate standby required.`
          : `Day-Of Ceremony milestone nearing execution.`;
      } else if (isOverdue) {
        alertLevel = "critical";
        message = `OVERDUE: Task missed target date by ${Math.abs(daysRemaining)} day(s).`;
      } else if (isDelayed) {
        alertLevel = "critical";
        message = `DELAY WARNING: +${task.delayMinutes ?? 15}m delay reported. Risk of downstream Muhurat cascade.`;
      } else if (task.urgency === "critical") {
        alertLevel = "critical";
        message = `CRITICAL T-MINUS: High-priority milestone due in ${daysRemaining} day(s).`;
      }

      const thirdPartyEmail =
        defaultEmail && !isInternalManagerEmail(defaultEmail)
          ? defaultEmail
          : resolveThirdPartyVendorEmail(task.vendorContact, task.category);

      const emailPayload = this.generateEmailPayload(task, eventTitle, thirdPartyEmail, message);
      const whatsAppPayload = this.generateWhatsAppPayload(task, eventTitle, message);

      let dispatchResults: TMinusAlert["dispatchResults"] = undefined;
      if (autoTriggerCritical && (alertLevel === "critical" || alertLevel === "day_of_alert")) {
        const whatsapp = triggerWhatsAppNotification({
          taskId: task.id,
          taskTitle: task.title,
          category: task.category,
          phone: whatsAppPayload.phone,
          vendorName: task.vendorContact?.name || "3rd-Party Vendor",
          message: whatsAppPayload.text,
          waUrl: whatsAppPayload.waUrl,
          skipPersistentLog: true
        });

        const email = triggerEmailNotification({
          taskId: task.id,
          taskTitle: task.title,
          category: task.category,
          to: emailPayload.to,
          vendorName: task.vendorContact?.name || "3rd-Party Vendor",
          subject: emailPayload.subject,
          body: emailPayload.body,
          mailtoUrl: emailPayload.mailtoUrl,
          isThirdParty: true,
          skipPersistentLog: true
        });

        dispatchResults = { whatsapp, email };
      }

      alerts.push({
        id: `alert-${task.id}`,
        taskId: task.id,
        taskTitle: task.title,
        category: task.category,
        urgency: task.urgency,
        deadlineDaysBeforeEvent: task.deadlineDaysBeforeEvent,
        timeSlot: task.timeSlot,
        delayStatus: task.delayStatus,
        delayMinutes: task.delayMinutes,
        targetDate,
        daysRemaining,
        isOverdue,
        alertLevel,
        message,
        vendorContact: task.vendorContact,
        emailPayload,
        whatsAppPayload,
        dispatchResults
      });
    }

    return alerts.sort((a, b) => {
      const weight = (level: TMinusAlert["alertLevel"]) =>
        level === "day_of_alert" ? 3 : level === "critical" ? 2 : 1;
      const weightDiff = weight(b.alertLevel) - weight(a.alertLevel);
      if (weightDiff !== 0) return weightDiff;
      return a.daysRemaining - b.daysRemaining;
    });
  }

  /**
   * Triggers a mock WhatsApp notification for a specific milestone task via communication.ts
   * and persists it in the activity logger. Supports custom edited message & edge-case tags.
   */
  public triggerTaskWhatsApp(
    task: MilestoneTask,
    eventTitle: string = "Sharma Family Wedding",
    customMessage?: string,
    edgeCaseType: EdgeCaseTemplateType = "standard"
  ): CommunicationResult {
    const payload = this.generateWhatsAppPayload(task, eventTitle);
    const finalMessage = customMessage?.trim() ? customMessage.trim() : payload.text;
    const finalWaUrl = `https://wa.me/${payload.phone}?text=${encodeURIComponent(finalMessage)}`;

    return triggerWhatsAppNotification({
      taskId: task.id,
      taskTitle: task.title,
      category: task.category,
      phone: payload.phone,
      vendorName: task.vendorContact?.name || `${task.category} Vendor`,
      message: finalMessage,
      waUrl: finalWaUrl,
      edgeCaseType
    });
  }

  /**
   * Triggers a mock 3rd-party Email notification for a specific milestone task via communication.ts
   * and persists it in the activity logger. Supports custom edited subject/body & edge-case tags.
   */
  public triggerTaskEmail(
    task: MilestoneTask,
    eventTitle: string = "Sharma Family Wedding",
    overrideEmail?: string,
    customSubject?: string,
    customBody?: string,
    edgeCaseType: EdgeCaseTemplateType = "standard"
  ): CommunicationResult {
    const targetEmail =
      overrideEmail !== undefined
        ? overrideEmail
        : resolveThirdPartyVendorEmail(task.vendorContact, task.category);
    const payload = this.generateEmailPayload(task, eventTitle, targetEmail);
    const finalSubject = customSubject?.trim() ? customSubject.trim() : payload.subject;
    const finalBody = customBody?.trim() ? customBody.trim() : payload.body;
    const finalMailto = `mailto:${encodeURIComponent(payload.to)}?subject=${encodeURIComponent(
      finalSubject
    )}&body=${encodeURIComponent(finalBody)}`;

    return triggerEmailNotification({
      taskId: task.id,
      taskTitle: task.title,
      category: task.category,
      to: payload.to,
      vendorName: task.vendorContact?.name || `${task.category} Vendor`,
      subject: finalSubject,
      body: finalBody,
      mailtoUrl: finalMailto,
      edgeCaseType
    });
  }

  /**
   * Generates formatted email subject, body, and mailto URL for 3rd-party vendor coordination
   */
  public generateEmailPayload(
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

  /**
   * Generates WhatsApp formatted text and deep-link wa.me URL
   */
  public generateWhatsAppPayload(
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
}
