import { describe, it, expect, beforeEach } from "vitest";
import {
  buildEditableTemplate,
  closeTaskActivityLoop,
  getActivityEvents,
  getActivityStats,
  getVendorCommunicationMetrics,
  resetActivityLogger
} from "../src/lib/services/event-logger";
import {
  clearDispatchLog,
  triggerEmailNotification,
  triggerWhatsAppNotification
} from "../src/lib/services/communication";

describe("Persistent Event Logger & Loop Closure (src/lib/services/event-logger.ts)", () => {
  beforeEach(() => {
    resetActivityLogger(false);
    clearDispatchLog();
  });

  it("logs WhatsApp and 3rd-party Email dispatches as awaiting_call and computes activity counts + mostRecent", () => {
    triggerWhatsAppNotification({
      taskId: "m6",
      taskTitle: "Final Headcount & Floating Buffet Buffer Handover",
      category: "catering",
      phone: "+91 98101 23456",
      vendorName: "Rajesh Sharma",
      message: "Confirming 200 pax + 15% floating buffer",
      edgeCaseType: "guest_surge"
    });

    triggerEmailNotification({
      taskId: "m6",
      taskTitle: "Final Headcount & Floating Buffet Buffer Handover",
      category: "catering",
      to: "rajesh@royalcaterers.in",
      vendorName: "Rajesh Sharma",
      subject: "[+15% SURGE BUFFER] Final Headcount",
      body: "Please activate +15% buffer plates.",
      edgeCaseType: "guest_surge"
    });

    const stats = getActivityStats("m6");
    expect(stats.whatsappCount).toBe(1);
    expect(stats.emailCount).toBe(1);
    expect(stats.pendingCallCount).toBe(1);
    expect(stats.mostRecent).not.toBeNull();
    expect(stats.mostRecent?.channel).toBe("email");
    expect(stats.mostRecent?.loopStatus).toBe("awaiting_call");
  });

  it("closes the loop via human call or AI follow-up and updates pendingCallCount to 0", () => {
    triggerWhatsAppNotification({
      taskId: "m8",
      taskTitle: "Baraat Assembly & Dhol Toli Procession Start",
      category: "logistics",
      phone: "+91 98102 77889",
      vendorName: "Gurnam Singh",
      message: "Baraat delayed by 30m",
      edgeCaseType: "delay_shift"
    });

    expect(getActivityStats("m8").pendingCallCount).toBe(1);

    closeTaskActivityLoop({
      taskId: "m8",
      taskTitle: "Baraat Assembly & Dhol Toli Procession Start",
      category: "logistics",
      vendorName: "Gurnam Singh",
      recipient: "+91 98102 77889",
      closedBy: "human_call",
      resolutionNote: "Spoke to Gurnam ji, Dhol team holding at gate until 18:00"
    });

    const afterStats = getActivityStats("m8");
    expect(afterStats.pendingCallCount).toBe(0);
    expect(afterStats.callCount).toBe(1);
    expect(afterStats.closedLoopCount).toBe(2); // original WA + call closure event
    expect(afterStats.mostRecent?.summary).toContain("Spoke to Gurnam ji");

    const openEvents = getActivityEvents({ taskId: "m8", onlyAwaitingCall: true });
    expect(openEvents).toHaveLength(0);
  });

  it("generates prefilled editable templates for edge cases (delay_shift, guest_surge, backup_sos)", () => {
    const sampleTask = {
      id: "m7",
      title: "Stage Soundcheck & 250 kVA Generator Test Run",
      category: "logistics" as const,
      deadlineDaysBeforeEvent: 1,
      timeSlot: "T-24 Hours",
      vendorContact: {
        name: "Mukesh Yadav",
        phone: "+91 98221 44556",
        role: "Electrical Engineer",
        email: "mukesh@yadavpower.in"
      }
    };

    const delayTpl = buildEditableTemplate(sampleTask, "whatsapp", "delay_shift");
    expect(delayTpl.body).toContain("+30 mins");
    expect(delayTpl.body).toContain("Mukesh Yadav");

    const surgeTpl = buildEditableTemplate(sampleTask, "email", "guest_surge");
    expect(surgeTpl.subject).toContain("+15% SURGE BUFFER");

    const sosTpl = buildEditableTemplate(sampleTask, "whatsapp", "backup_sos");
    expect(sosTpl.body).toContain("URGENT SOS");
  });

  it("calculates frequency distribution (calls, emails, messages) and effectiveness per vendor", () => {
    // Log multiple interactions for Rajesh Sharma across catering milestones
    triggerWhatsAppNotification({
      taskId: "m2",
      taskTitle: "Finalize Royal Caterers Tasting",
      category: "catering",
      phone: "+91 98101 23456",
      vendorName: "Rajesh Sharma",
      message: "Tasting menu check"
    });

    triggerEmailNotification({
      taskId: "m2",
      taskTitle: "Finalize Royal Caterers Tasting",
      category: "catering",
      to: "rajesh@royalcaterers.in",
      vendorName: "Rajesh Sharma",
      subject: "Tasting schedule",
      body: "Please confirm tasting slot"
    });

    // Close the loop via call
    closeTaskActivityLoop({
      taskId: "m2",
      taskTitle: "Finalize Royal Caterers Tasting",
      category: "catering",
      vendorName: "Rajesh Sharma",
      recipient: "+91 98101 23456",
      closedBy: "human_call",
      resolutionNote: "Tasting approved and locked"
    });

    const metrics = getVendorCommunicationMetrics("Rajesh Sharma");
    expect(metrics.vendorName).toBe("Rajesh Sharma");
    expect(metrics.totalInteractions).toBe(3); // 1 WA + 1 Email + 1 Call closure
    expect(metrics.messages).toBe(1);
    expect(metrics.emails).toBe(1);
    expect(metrics.calls).toBe(1);
    expect(metrics.messagePercentage).toBe(33);
    expect(metrics.emailPercentage).toBe(33);
    expect(metrics.callPercentage).toBe(33);
    expect(metrics.closedLoops).toBe(3); // All events closed
    expect(metrics.openLoops).toBe(0);
    expect(metrics.effectivenessScore).toBe(100);
    expect(metrics.effectivenessLabel).toBe("High");
  });
});
