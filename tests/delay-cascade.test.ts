import { describe, it, expect } from "vitest";
import { computeDelayCascade, buildWhatsAppReminderUrl } from "../lib/engine/delay-cascade";
import { MilestoneTask } from "../lib/types";

describe("T-Minus Delay Cascade Engine", () => {
  const sampleTasks: MilestoneTask[] = [
    {
      id: "t1",
      title: "Baraat Assembly & Dhol Procession",
      deadlineDaysBeforeEvent: 0,
      category: "logistics",
      dependsOn: [],
      status: "pending",
      urgency: "critical"
    },
    {
      id: "t2",
      title: "Milni Ceremony & Varmala Stage Entry",
      deadlineDaysBeforeEvent: 0,
      category: "decor",
      dependsOn: ["t1"],
      status: "pending",
      urgency: "critical"
    },
    {
      id: "t3",
      title: "Auspicious Lagna Pheras (Muhurat Window)",
      deadlineDaysBeforeEvent: 0,
      category: "venue",
      dependsOn: ["t2"],
      status: "pending",
      urgency: "critical"
    },
    {
      id: "t4",
      title: "Grand Royal Dinner Buffet Open",
      deadlineDaysBeforeEvent: 0,
      category: "catering",
      dependsOn: ["t2"],
      status: "pending",
      urgency: "medium"
    }
  ];

  it("returns zero impact if delayMinutes is 0", () => {
    const result = computeDelayCascade(sampleTasks, "t1", 0);
    expect(result.delayMinutes).toBe(0);
    expect(result.downstreamAffectedTasks).toHaveLength(0);
    expect(result.criticalMuhuratAtRisk).toBe(false);
  });

  it("correctly identifies all downstream tasks when Baraat is delayed by 45 minutes", () => {
    const result = computeDelayCascade(sampleTasks, "t1", 45);
    expect(result.delayMinutes).toBe(45);
    expect(result.directlyAffectedTaskIds).toContain("t2");

    const downstreamIds = result.downstreamAffectedTasks.map((t) => t.id);
    expect(downstreamIds).toContain("t2");
    expect(downstreamIds).toContain("t3");
    expect(downstreamIds).toContain("t4");

    // Muhurat window must be flagged
    expect(result.criticalMuhuratAtRisk).toBe(true);
    expect(result.riskMessage).toContain("threatens key milestones");
  });

  it("generates a clean, polite WhatsApp dispatch URL with proper encodings", () => {
    const url = buildWhatsAppReminderUrl(
      "+91 98101 23456",
      "Rajesh Sharma",
      "Grand Royal Dinner Buffet Open",
      "20:15 - Dinner Open",
      "delayed"
    );

    expect(url).toContain("https://wa.me/919810123456");
    expect(url).toContain("text=");
    expect(decodeURIComponent(url)).toContain("Namaste Rajesh Sharma");
    expect(decodeURIComponent(url)).toContain("Grand Royal Dinner Buffet Open");
  });
});
