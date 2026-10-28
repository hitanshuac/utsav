import test from "node:test";
import assert from "node:assert/strict";
import {
  calculateBudgetSummary,
  applyDynamicDelta,
  applyTradeoffResolution
} from "./budget-math";
import {
  sortMilestonesTopologically,
  canCompleteMilestone
} from "./dependency-graph";
import { generateIcsCalendar } from "./calendar-utils";
import { SecureLLMClient } from "../security/secure-llm-client";
import { BudgetItem, MilestoneTask } from "../types";

test("calculateBudgetSummary computes deterministic totals and overrun state", () => {
  const sampleItems: BudgetItem[] = [
    {
      id: "1",
      category: "venue",
      label: "Hall",
      allocatedAmount: 100000,
      actualAmount: 100000,
      isEstimate: false
    },
    {
      id: "2",
      category: "catering",
      label: "Food",
      allocatedAmount: 50000,
      actualAmount: 50000,
      isEstimate: false
    }
  ];

  const summary = calculateBudgetSummary(sampleItems, 120000);
  assert.equal(summary.totalAllocated, 150000);
  assert.equal(summary.variance, -30000);
  assert.equal(summary.isOverBudget, true);
});

test("applyDynamicDelta scales catering and logistics while holding venue fixed", () => {
  const sampleItems: BudgetItem[] = [
    {
      id: "1",
      category: "venue",
      label: "Hall",
      allocatedAmount: 100000,
      actualAmount: 100000,
      isEstimate: false
    },
    {
      id: "2",
      category: "catering",
      label: "Food",
      allocatedAmount: 50000,
      actualAmount: 50000,
      isEstimate: false
    }
  ];

  const updated = applyDynamicDelta(sampleItems, 50, 100);
  assert.equal(updated.find((i) => i.category === "catering")?.allocatedAmount, 75000);
  assert.equal(updated.find((i) => i.category === "venue")?.allocatedAmount, 100000);
});

test("sortMilestonesTopologically orders tasks by dependencies and detects cycles", () => {
  const tasks: MilestoneTask[] = [
    {
      id: "m2",
      title: "Catering Tasting",
      deadlineDaysBeforeEvent: 45,
      category: "catering",
      dependsOn: ["m1"],
      status: "pending",
      urgency: "critical"
    },
    {
      id: "m1",
      title: "Book Venue",
      deadlineDaysBeforeEvent: 90,
      category: "venue",
      dependsOn: [],
      status: "pending",
      urgency: "critical"
    }
  ];

  const ordered = sortMilestonesTopologically(tasks);
  assert.deepEqual(ordered.map((t) => t.id), ["m1", "m2"]);

  const gate = canCompleteMilestone(tasks[0], tasks);
  assert.equal(gate.allowed, false);
});

test("generateIcsCalendar and SecureLLMClient sanitization work deterministically", () => {
  const ics = generateIcsCalendar([
    { title: "Venue Deposit", targetDate: new Date("2027-01-15T10:00:00Z") }
  ]);
  assert.equal(ics.startsWith("data:text/calendar;charset=utf8,"), true);

  const client = SecureLLMClient.getInstance();
  assert.equal(client.sanitizeInput("<b>Royal</b> {Caterers}"), "Royal Caterers");
  assert.throws(() => {
    client.inspectOutput("Secret: sk-1234567890abcdef1234567890abcdef1234");
  }, /SECURITY_BREACH/);
});
