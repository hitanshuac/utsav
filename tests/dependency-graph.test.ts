import { describe, it, expect } from "vitest";
import {
  sortMilestonesTopologically,
  canCompleteMilestone,
  computeScheduledMilestones
} from "../lib/engine/dependency-graph";
import { generateIcsCalendar } from "../lib/engine/calendar-utils";
import { createWhatsAppDispatchLink } from "../components/vendor/WhatsAppAction";
import { SecureLLMClient } from "../lib/security/secure-llm-client";
import { MilestoneTask } from "../lib/types";

describe("Topological Milestone Dependency Graph & Security Interceptors", () => {
  const sampleTasks: MilestoneTask[] = [
    {
      id: "task-catering",
      title: "Finalize Catering Menu",
      deadlineDaysBeforeEvent: 30,
      category: "catering",
      dependsOn: ["task-venue"],
      status: "pending",
      urgency: "critical"
    },
    {
      id: "task-venue",
      title: "Book Banquet Venue",
      deadlineDaysBeforeEvent: 90,
      category: "venue",
      dependsOn: [],
      status: "pending",
      urgency: "critical"
    },
    {
      id: "task-seating",
      title: "Confirm Final Seating Chart",
      deadlineDaysBeforeEvent: 7,
      category: "logistics",
      dependsOn: ["task-catering"],
      status: "pending",
      urgency: "medium"
    }
  ];

  it("orders prerequisites before dependent tasks", () => {
    const sorted = sortMilestonesTopologically(sampleTasks);
    expect(sorted.map((t) => t.id)).toEqual([
      "task-venue",
      "task-catering",
      "task-seating"
    ]);
  });

  it("detects circular dependencies and throws an explicit error", () => {
    const cyclic: MilestoneTask[] = [
      {
        id: "a",
        title: "Task A",
        deadlineDaysBeforeEvent: 20,
        category: "venue",
        dependsOn: ["b"],
        status: "pending",
        urgency: "low"
      },
      {
        id: "b",
        title: "Task B",
        deadlineDaysBeforeEvent: 10,
        category: "decor",
        dependsOn: ["a"],
        status: "pending",
        urgency: "low"
      }
    ];
    expect(() => sortMilestonesTopologically(cyclic)).toThrow(/CIRCULAR_DEPENDENCY/);
  });

  it("blocks milestone completion until prerequisite tasks are completed", () => {
    const catering = sampleTasks[0];
    const checkBefore = canCompleteMilestone(catering, sampleTasks);
    expect(checkBefore.allowed).toBe(false);
    expect(checkBefore.blockingTitles).toContain("Book Banquet Venue");

    const updatedTasks: MilestoneTask[] = sampleTasks.map((t) =>
      t.id === "task-venue" ? { ...t, status: "completed" } : t
    );
    const checkAfter = canCompleteMilestone(catering, updatedTasks);
    expect(checkAfter.allowed).toBe(true);
  });

  it("generates RFC 5545 compliant .ics data URI and wa.me links", () => {
    const scheduled = computeScheduledMilestones(sampleTasks, "2027-02-14");
    const icsUri = generateIcsCalendar(
      scheduled.map((s) => ({ title: s.title, targetDate: s.targetDate }))
    );
    expect(icsUri.startsWith("data:text/calendar;charset=utf8,")).toBe(true);
    expect(decodeURIComponent(icsUri)).toContain("BEGIN:VCALENDAR");
    expect(decodeURIComponent(icsUri)).toContain("SUMMARY:Book Banquet Venue");

    const waLink = createWhatsAppDispatchLink("+91 98765-43210", "Royal Caterers", [
      "Is GST included?"
    ]);
    expect(waLink).toContain("https://wa.me/919876543210?text=");
  });

  it("sanitizes prompt injection delimiters and blocks leaked credentials", () => {
    const client = SecureLLMClient.getInstance();
    const cleaned = client.sanitizeInput("<script>alert(1)</script>{inject}[test]");
    expect(cleaned).toBe("alert(1)injecttest");

    expect(() =>
      client.inspectOutput("Leaked key " + ["AI", "za", "Sy", "TEST_KEY_FOR_INSPECTION_MOCK_12345"].join(""))
    ).toThrow(/SECURITY_BREACH/);
  });
});
