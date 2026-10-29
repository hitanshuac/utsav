import { describe, it, expect, beforeEach } from "vitest";
import { clearDispatchLog, getDispatchLog } from "../src/lib/services/communication";
import { TMinusAlertService } from "../lib/services/tminus-alert-service";
import { MilestoneTask } from "../lib/types";

describe("TMinusAlertService with Communication Integration", () => {
  const service = TMinusAlertService.getInstance();
  const eventDateIso = "2027-02-14";

  beforeEach(() => {
    clearDispatchLog();
  });

  const sampleMilestones: MilestoneTask[] = [
    {
      id: "m1",
      title: "Lock Banquet Hall Contract",
      deadlineDaysBeforeEvent: 90,
      category: "venue",
      dependsOn: [],
      status: "completed",
      urgency: "critical"
    },
    {
      id: "m2",
      title: "Stage Soundcheck & 250 kVA Generator Test Run",
      deadlineDaysBeforeEvent: 1, // T-24h
      category: "logistics",
      dependsOn: [],
      status: "pending",
      urgency: "critical",
      tMinusStage: "t_24h",
      vendorContact: {
        name: "Mukesh Yadav",
        phone: "+91 98221 44556",
        role: "Electrical / AV Engineer",
        email: "mukesh@yadavpower.in"
      }
    },
    {
      id: "m3",
      title: "Baraat Assembly & Dhol Toli Procession",
      deadlineDaysBeforeEvent: 0, // Day of
      category: "logistics",
      dependsOn: ["m2"],
      status: "pending",
      urgency: "critical",
      timeSlot: "17:30 - Baraat Start",
      delayMinutes: 30,
      delayStatus: "delayed",
      vendorContact: {
        name: "Gurnam Singh",
        phone: "+91 98102 77889",
        role: "Band Master",
        email: "gurnam@punjabdhol.in"
      }
    },
    {
      id: "m4",
      title: "Select Wedding Favors",
      deadlineDaysBeforeEvent: 60,
      category: "miscellaneous",
      dependsOn: [],
      status: "pending",
      urgency: "low"
    }
  ];

  it("identifies high-priority tasks nearing deadline and auto-triggers 3rd-party notifications via communication.ts", () => {
    const alerts = service.checkApproachingDeadlines(sampleMilestones, eventDateIso, {
      defaultEmail: "hitanshuac@gmail.com" // Internal manager email should be ignored in favor of 3rd-party vendor email
    });

    const alertTaskIds = alerts.map((a) => a.taskId);
    expect(alertTaskIds).not.toContain("m1");
    expect(alertTaskIds).not.toContain("m4");
    expect(alertTaskIds).toContain("m2");
    expect(alertTaskIds).toContain("m3");

    const m3Alert = alerts.find((a) => a.taskId === "m3")!;
    expect(m3Alert.emailPayload.to).toBe("gurnam@punjabdhol.in");
    expect(m3Alert.dispatchResults?.whatsapp?.ok).toBe(true);
    expect(m3Alert.dispatchResults?.email?.ok).toBe(true);
    expect(m3Alert.dispatchResults?.email?.recipient).toBe("gurnam@punjabdhol.in");

    // Verify communication.ts log captured the dispatches
    const m3Logs = getDispatchLog("m3");
    expect(m3Logs.length).toBeGreaterThanOrEqual(2);
  });

  it("generates a rich email payload with mailto URL for 3rd-party vendors", () => {
    const task = sampleMilestones.find((m) => m.id === "m3")!;
    const emailPayload = service.generateEmailPayload(task, "Sharma Family Wedding");

    expect(emailPayload.to).toBe("gurnam@punjabdhol.in");
    expect(emailPayload.subject).toContain("[URGENT T-MINUS ALERT]");
    expect(emailPayload.subject).toContain("Baraat Assembly & Dhol Toli Procession");
    expect(emailPayload.body).toContain("Gurnam Singh");
    expect(emailPayload.body).toContain("Category: LOGISTICS");
    expect(emailPayload.mailtoUrl).toContain("mailto:gurnam%40punjabdhol.in");
  });

  it("generates a valid WhatsApp deep link with phone and pre-filled alert copy", () => {
    const task = sampleMilestones.find((m) => m.id === "m3")!;
    const waPayload = service.generateWhatsAppPayload(task, "Sharma Family Wedding");

    expect(waPayload.phone).toBe("919810277889");
    expect(waPayload.waUrl).toContain("https://wa.me/919810277889");
    expect(waPayload.text).toContain("Namaste Gurnam Singh ji");
    expect(waPayload.text).toContain("17:30 - Baraat Start");
  });
});
