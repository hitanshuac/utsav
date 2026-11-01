import { describe, it, expect, beforeEach } from "vitest";
import {
  logActivityEvent,
  logEventActivity,
  getActivityEvents,
  getActivityStats,
  closeTaskActivityLoop,
  buildEditableTemplate,
  getVendorCommunicationMetrics,
  resetActivityLogger
} from "../src/lib/services/event-logger";
import {
  evaluateEventPlan,
  generateDeterministicTradeoffs
} from "../src/lib/plannerEngine";
import { JUDGE_PRESETS } from "../src/lib/presets";

describe("Restorations & Loop Closure Suite", () => {
  beforeEach(() => {
    resetActivityLogger(false);
  });

  it("supports logging system modifications and exports logEventActivity alias", () => {
    expect(logEventActivity).toBe(logActivityEvent);

    const event = logActivityEvent({
      taskId: "sys-1",
      taskTitle: "Mid-Flight Shift (+50 Guests, -10% Budget, -14d)",
      category: "catering",
      channel: "system",
      vendorName: "Deterministic Engine",
      recipient: "Operations",
      summary: "Headcount increased by +50 pax. Catering scaled linearly."
    });

    expect(event.channel).toBe("system");
    expect(event.loopStatus).toBe("awaiting_call");

    const events = getActivityEvents();
    expect(events).toHaveLength(1);
    expect(events[0].id).toBe(event.id);
  });

  it("builds editable templates for all 4 edge-case types (standard, delay_30m, budget_surge, backup_sos)", () => {
    const task = {
      id: "m2",
      title: "Royal Caterers Food Tasting",
      category: "catering" as const,
      deadlineDaysBeforeEvent: 14,
      timeSlot: "T-14 Days",
      vendorContact: {
        name: "Rajesh Sharma",
        phone: "+91 98101 23456",
        role: "Head Caterer"
      }
    };

    const tplStandard = buildEditableTemplate(task, "whatsapp", "standard", "Sharma Wedding");
    expect(tplStandard.body).toContain("Rajesh Sharma");
    expect(tplStandard.body).toContain("Royal Caterers Food Tasting");

    const tplDelay = buildEditableTemplate(task, "whatsapp", "delay_30m", "Sharma Wedding");
    expect(tplDelay.body).toContain("+30 mins");
    expect(tplDelay.subject).toContain("[TIMING SHIFT]");

    const tplSurge = buildEditableTemplate(task, "email", "budget_surge", "Sharma Wedding");
    expect(tplSurge.subject).toContain("+15% SURGE BUFFER");

    const tplSos = buildEditableTemplate(task, "whatsapp", "backup_sos", "Sharma Wedding");
    expect(tplSos.body).toContain("URGENT SOS");
  });

  it("marks open communications as closed and computes vendor effectiveness metrics accurately", () => {
    // Log WhatsApp dispatch
    logActivityEvent({
      taskId: "task-catering",
      taskTitle: "Finalize Feast Menu",
      category: "catering",
      channel: "whatsapp",
      vendorName: "Rajesh Sharma",
      recipient: "919810123456",
      summary: "WhatsApp sent for menu lock"
    });

    let stats = getActivityStats();
    expect(stats.pendingCallCount).toBe(1);
    expect(stats.closedLoopCount).toBe(0);

    // Close the loop
    closeTaskActivityLoop({
      taskId: "task-catering",
      taskTitle: "Finalize Feast Menu",
      category: "catering",
      vendorName: "Rajesh Sharma",
      recipient: "919810123456",
      closedBy: "human_call",
      resolutionNote: "Spoke to Rajesh ji on phone call. Menu locked without price hike."
    });

    stats = getActivityStats();
    expect(stats.pendingCallCount).toBe(0);
    expect(stats.closedLoopCount).toBe(2); // WA event (now closed) + closure event

    const metrics = getVendorCommunicationMetrics("Rajesh Sharma");
    expect(metrics.vendorName).toBe("Rajesh Sharma");
    expect(metrics.effectivenessScore).toBe(100);
    expect(metrics.effectivenessLabel).toBe("High");
    expect(metrics.openLoops).toBe(0);
  });

  it("calculates deterministic before->after trade-off rebalances without modifying math invariants", () => {
    const preset = JUDGE_PRESETS.presetA;
    const initialEval = evaluateEventPlan({
      eventTitle: preset.title,
      personaLens: preset.persona,
      guestCount: preset.guestCount,
      baseGuestCount: preset.guestCount,
      totalBudgetCap: 770000, // ₹30,000 deficit vs ₹800,000 allocated
      daysRemaining: preset.daysRemaining,
      budgetItems: preset.budget,
      milestones: preset.milestones
    });

    expect(initialEval.variance).toBe(-30000);
    expect(initialEval.triageTier).toBe("CRITICAL_OVERRUN");

    const tradeoffs = generateDeterministicTradeoffs(
      Math.abs(initialEval.variance),
      initialEval.scaledCategories
    );
    expect(tradeoffs.length).toBeGreaterThan(0);

    const chosen = tradeoffs[0];
    const updatedBudget = [...preset.budget];
    for (const adj of chosen.adjustments) {
      const idx = updatedBudget.findIndex((b) => b.category === adj.category);
      if (idx >= 0) {
        updatedBudget[idx] = {
          ...updatedBudget[idx],
          allocatedAmount: Math.max(0, updatedBudget[idx].allocatedAmount + adj.delta)
        };
      }
    }

    const rebalancedEval = evaluateEventPlan({
      eventTitle: preset.title,
      personaLens: preset.persona,
      guestCount: preset.guestCount,
      baseGuestCount: preset.guestCount,
      totalBudgetCap: 770000,
      daysRemaining: preset.daysRemaining,
      budgetItems: updatedBudget,
      milestones: preset.milestones
    });

    expect(rebalancedEval.variance).toBeGreaterThanOrEqual(0);
    expect(rebalancedEval.triageTier).not.toBe("CRITICAL_OVERRUN");
  });
});
