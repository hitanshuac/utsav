import { describe, it, expect, beforeAll, afterAll } from "vitest";
import http from "http";
import { AddressInfo } from "net";
import { createApp, sanitizeObjectKeys } from "../server";
import { evaluateEventPlan } from "../src/lib/plannerEngine";
import { JUDGE_PRESETS } from "../src/lib/presets";
import { EventPlanInput } from "../src/types/planner";

describe("Server Security Headers, Media Boundaries & Mid-Flight Revision", () => {
  let server: http.Server;
  let baseUrl: string;

  beforeAll(async () => {
    process.env.NODE_ENV = "test";
    const app = createApp();
    server = await new Promise<http.Server>((resolve) => {
      const s = app.listen(0, "127.0.0.1", () => resolve(s));
    });
    const port = (server.address() as AddressInfo).port;
    baseUrl = `http://127.0.0.1:${port}`;
  });

  afterAll(async () => {
    await new Promise<void>((resolve, reject) => {
      server.close((err) => (err ? reject(err) : resolve()));
    });
  });

  it("verifies GET /api/health returns 200 OK and includes all OWASP ASVS security headers", async () => {
    const res = await fetch(`${baseUrl}/api/health`);
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.status).toBe("ok");
    expect(data.llm).toBeDefined();

    // Verify OWASP ASVS Headers
    expect(res.headers.get("strict-transport-security")).toContain("max-age=63072000");
    expect(res.headers.get("cross-origin-opener-policy")).toBe("same-origin");
    expect(res.headers.get("cross-origin-resource-policy")).toBe("same-origin");
    expect(res.headers.get("x-frame-options")).toBe("DENY");
    expect(res.headers.get("x-content-type-options")).toBe("nosniff");
    expect(res.headers.get("x-permitted-cross-domain-policies")).toBe("none");
    expect(res.headers.get("referrer-policy")).toBe("strict-origin-when-cross-origin");
  });

  it("verifies POST /api/rebalance with text/plain returns HTTP 415 Unsupported Media Type", async () => {
    const res = await fetch(`${baseUrl}/api/rebalance`, {
      method: "POST",
      headers: { "Content-Type": "text/plain" },
      body: "plain text payload"
    });

    expect(res.status).toBe(415);
    const data = await res.json();
    expect(data.error).toBe("UnsupportedMediaType");
    expect(data.message).toContain("Expected application/json payload");
  });

  it("verifies POST /api/rebalance with invalid schema returns HTTP 400 ValidationError", async () => {
    const res = await fetch(`${baseUrl}/api/rebalance`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        totalBudgetCap: -10000,
        budgetItems: "not-an-array"
      })
    });

    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe("ValidationError");
  });

  it("verifies recursive prototype-key sanitization strips __proto__, constructor, and prototype", () => {
    const maliciousPayload: Record<string, any> = {
      eventTitle: "Safe Title",
      totalBudgetCap: 500000,
      __proto__: { isAdmin: true },
      constructor: { evil: "hack" },
      nested: {
        prototype: "corrupt",
        safeValue: 42
      },
      list: [
        { normal: "ok" },
        { constructor: "attack", valid: true }
      ]
    };

    const sanitized = sanitizeObjectKeys(maliciousPayload) as any;

    expect(sanitized.eventTitle).toBe("Safe Title");
    expect(sanitized.totalBudgetCap).toBe(500000);
    expect(Object.prototype.hasOwnProperty.call(sanitized, "__proto__")).toBe(false);
    expect(Object.prototype.hasOwnProperty.call(sanitized, "constructor")).toBe(false);
    expect(sanitized.nested.safeValue).toBe(42);
    expect(Object.prototype.hasOwnProperty.call(sanitized.nested, "prototype")).toBe(false);
    expect(sanitized.list[1].valid).toBe(true);
    expect(Object.prototype.hasOwnProperty.call(sanitized.list[1], "constructor")).toBe(false);
  });

  it("verifies mid-flight revision (+50 guests, -10% budget cap, -14 days) on presetA recalculates variable costs while preserving fixed costs", () => {
    const preset = JUDGE_PRESETS.presetA;

    // Baseline evaluation
    const baselineInput: EventPlanInput = {
      eventTitle: preset.title,
      personaLens: preset.persona,
      guestCount: preset.guestCount,
      baseGuestCount: preset.guestCount,
      totalBudgetCap: preset.budgetCap,
      daysRemaining: preset.daysRemaining,
      budgetItems: preset.budget,
      milestones: preset.milestones
    };
    const baseline = evaluateEventPlan(baselineInput);
    expect(baseline.triageTier).toBe("ON_TRACK");
    expect(baseline.totalAllocated).toBe(800000);
    expect(baseline.variance).toBe(0);

    // Apply Mid-Flight Revision Shift (+50 Guests, -10% Budget, -14 Days)
    const revisedGuestCount = preset.guestCount + 50; // 250
    const revisedBudgetCap = Math.round(preset.budgetCap * 0.9); // 720,000
    const revisedDaysRemaining = Math.max(7, preset.daysRemaining - 14); // 106

    const revisedInput: EventPlanInput = {
      ...baselineInput,
      guestCount: revisedGuestCount,
      totalBudgetCap: revisedBudgetCap,
      daysRemaining: revisedDaysRemaining
    };
    const revised = evaluateEventPlan(revisedInput);

    // 1. Catering scales from 260,000 by 1.25 -> 325,000
    const catering = revised.scaledCategories.find((c) => c.category === "catering")?.allocatedAmount;
    expect(catering).toBe(325000);

    // 2. Logistics scales from 25,000 by 1.25 -> 31,250
    const logistics = revised.scaledCategories.find((c) => c.category === "logistics")?.allocatedAmount;
    expect(logistics).toBe(31250);

    // 3. Venue and Photography remain strictly invariant
    const venue = revised.scaledCategories.find((c) => c.category === "venue")?.allocatedAmount;
    const photo = revised.scaledCategories.find((c) => c.category === "photography")?.allocatedAmount;
    expect(venue).toBe(300000);
    expect(photo).toBe(80000);

    // 4. Overrun calculation: 871,250 allocated vs 720,000 budget cap = 151,250 deficit
    expect(revised.totalAllocated).toBe(871250);
    expect(revised.variance).toBe(-151250);
    expect(revised.overrunAmount).toBe(151250);
    expect(revised.triageTier).toBe("CRITICAL_OVERRUN");
    expect(revised.urgencyScore).toBeGreaterThanOrEqual(85);
  });
});
