/**
 * UtsavAI — Deterministic & Resilience Test Harness (RES-1 to RES-14)
 * Comprehensive automated verification for:
 * - Budget summation arithmetic & exact variance detection
 * - Variable guest scaling (ADR-2) vs step-fixed invariants
 * - Kahn's DAG topological ordering & cyclic dependency resilience
 * - Deterministic vendor quote pre-audit for 5 Indian event clauses
 * - HTTP endpoint resilience (offline fallback, malformed payloads)
 * - RFC 5545 iCalendar & WhatsApp wa.me link generation
 * - 100-event synthetic stress benchmark (<50ms)
 */

import http from "http";
import { AddressInfo } from "net";
import {
  scaleBudgetCategories,
  resolveMilestoneDAG,
  evaluateEventPlan,
  auditVendorQuoteOffline,
  generateIcsCalendar,
  generateWhatsAppLink
} from "../src/lib/plannerEngine";
import { BudgetItem, MilestoneTask, EventPlanInput } from "../src/types/planner";
import { createApp } from "../server";
import { SecureLLMClient } from "../src/lib/services/secure-llm-client";

interface TestResult {
  id: string;
  name: string;
  passed: boolean;
  durationMs: number;
  error?: string;
  details?: string;
}

const results: TestResult[] = [];

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(message);
  }
}

const sampleBudget: BudgetItem[] = [
  { id: "b1", category: "venue", label: "Heritage Banquet Hall", allocatedAmount: 250000, actualAmount: 250000, isEstimate: false },
  { id: "b2", category: "catering", label: "Royal Feast Buffet (200 pax)", allocatedAmount: 300000, actualAmount: 300000, isEstimate: false },
  { id: "b3", category: "decor", label: "Mandap & Floral Entrance", allocatedAmount: 120000, actualAmount: 120000, isEstimate: false },
  { id: "b4", category: "photography", label: "Traditional & Cinematic Crew", allocatedAmount: 80000, actualAmount: 80000, isEstimate: false },
  { id: "b5", category: "logistics", label: "Guest Shuttles & Valet", allocatedAmount: 30000, actualAmount: 30000, isEstimate: false },
  { id: "b6", category: "miscellaneous", label: "Puja Samagri & Contingency", allocatedAmount: 20000, actualAmount: 20000, isEstimate: true }
];

const sampleMilestones: MilestoneTask[] = [
  { id: "m1", title: "Lock Banquet Venue", deadlineDaysBeforeEvent: 45, category: "venue", dependsOn: [], status: "completed", urgency: "critical", leadTimeDays: 45 },
  { id: "m2", title: "Finalize Caterer Menu", deadlineDaysBeforeEvent: 30, category: "catering", dependsOn: ["m1"], status: "in_progress", urgency: "critical", leadTimeDays: 30 },
  { id: "m3", title: "Send Wedding Invitations", deadlineDaysBeforeEvent: 20, category: "decor", dependsOn: ["m2"], status: "pending", urgency: "medium", leadTimeDays: 20 },
  { id: "m4", title: "Final Sangeet Sound Check", deadlineDaysBeforeEvent: 2, category: "miscellaneous", dependsOn: ["m1"], status: "pending", urgency: "low", leadTimeDays: 2 }
];

async function runScenario(id: string, name: string, fn: () => void | Promise<void>) {
  const start = performance.now();
  try {
    await fn();
    const durationMs = performance.now() - start;
    results.push({ id, name, passed: true, durationMs });
    console.log(`  \x1b[32m✔\x1b[0m \x1b[1m${id}\x1b[0m: ${name} (\x1b[36m${durationMs.toFixed(2)}ms\x1b[0m)`);
  } catch (err: any) {
    const durationMs = performance.now() - start;
    results.push({ id, name, passed: false, durationMs, error: err.message });
    console.error(`  \x1b[31m✖\x1b[0m \x1b[1m${id}\x1b[0m: ${name} (\x1b[31mFAILED\x1b[0m in ${durationMs.toFixed(2)}ms)`);
    console.error(`    \x1b[31m${err.message}\x1b[0m`);
  }
}

export async function runTestHarness() {
  console.log("\n\x1b[1m\x1b[35m======================================================================\x1b[0m");
  console.log("\x1b[1m  UtsavAI Planner Resilience & Deterministic Test Harness (RES-1 to RES-14)\x1b[0m");
  console.log("\x1b[1m\x1b[35m======================================================================\x1b[0m\n");

  // Spin up lightweight Express test server for HTTP scenarios
  process.env.NODE_ENV = "test";
  const app = createApp();
  const server = await new Promise<http.Server>((resolve) => {
    const s = app.listen(0, "127.0.0.1", () => resolve(s));
  });
  const port = (server.address() as AddressInfo).port;
  const baseUrl = `http://127.0.0.1:${port}`;

  // Warmup pings (heats up V8 JIT, route matching, and Node HTTP agent connection pool)
  try {
    await fetch(`${baseUrl}/api/health`);
    await fetch(`${baseUrl}/api/rebalance`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        totalBudgetCap: 100000,
        budgetItems: []
      })
    });
  } catch {
    // Ignore warmup error
  }

  try {
    // RES-1: Balanced budget baseline -> ON_TRACK (0 deficit)
    await runScenario("RES-1", "Balanced budget baseline -> ON_TRACK (0 deficit)", () => {
      const input: EventPlanInput = {
        eventTitle: "Verma Wedding",
        personaLens: "family_host",
        guestCount: 200,
        baseGuestCount: 200,
        totalBudgetCap: 800000,
        daysRemaining: 40,
        budgetItems: sampleBudget.map((b) => ({ ...b, isEstimate: false })),
        milestones: sampleMilestones
      };
      const res = evaluateEventPlan(input);
      assert(res.totalAllocated === 800000, `Expected totalAllocated 800000, got ${res.totalAllocated}`);
      assert(res.variance === 0, `Expected variance 0, got ${res.variance}`);
      assert(res.overrunAmount === 0, `Expected overrunAmount 0, got ${res.overrunAmount}`);
      assert(res.triageTier === "ON_TRACK", `Expected ON_TRACK tier, got ${res.triageTier}`);
    });

    // RES-2: 20% budget overrun -> CRITICAL_OVERRUN with exact INR deficit calculation
    await runScenario("RES-2", "20% budget overrun -> CRITICAL_OVERRUN with exact INR deficit calculation", () => {
      const overrunBudget: BudgetItem[] = [
        ...sampleBudget,
        { id: "b7", category: "decor", label: "Exotic Orchid Wall", allocatedAmount: 160000, actualAmount: 160000, isEstimate: false }
      ];
      const input: EventPlanInput = {
        eventTitle: "Verma Wedding",
        personaLens: "family_host",
        guestCount: 200,
        baseGuestCount: 200,
        totalBudgetCap: 800000,
        daysRemaining: 40,
        budgetItems: overrunBudget,
        milestones: sampleMilestones
      };
      const res = evaluateEventPlan(input);
      assert(res.totalAllocated === 960000, `Expected totalAllocated 960000, got ${res.totalAllocated}`);
      assert(res.overrunAmount === 160000, `Expected overrunAmount 160000, got ${res.overrunAmount}`);
      assert(res.variance === -160000, `Expected variance -160000, got ${res.variance}`);
      assert(res.triageTier === "CRITICAL_OVERRUN", `Expected CRITICAL_OVERRUN, got ${res.triageTier}`);
    });

    // RES-3: Guest count surge (+50 guests) scales catering/logistics linearly
    await runScenario("RES-3", "Guest count surge (+50 guests) scales catering/logistics linearly", () => {
      const scaled = scaleBudgetCategories(sampleBudget, 250, 200);
      const catering = scaled.find((c) => c.category === "catering");
      const logistics = scaled.find((c) => c.category === "logistics");
      // 300,000 * (250 / 200) = 375,000
      assert(catering?.allocatedAmount === 375000, `Expected catering 375000, got ${catering?.allocatedAmount}`);
      // 30,000 * (250 / 200) = 37,500
      assert(logistics?.allocatedAmount === 37500, `Expected logistics 37500, got ${logistics?.allocatedAmount}`);
    });

    // RES-4: Guest count surge leaves fixed venue and photography allocations unchanged
    await runScenario("RES-4", "Guest count surge leaves fixed venue and photography allocations unchanged", () => {
      const scaled = scaleBudgetCategories(sampleBudget, 350, 200);
      const venue = scaled.find((c) => c.category === "venue");
      const photo = scaled.find((c) => c.category === "photography");
      assert(venue?.allocatedAmount === 250000, `Expected venue unchanged at 250000, got ${venue?.allocatedAmount}`);
      assert(photo?.allocatedAmount === 80000, `Expected photography unchanged at 80000, got ${photo?.allocatedAmount}`);
    });

    // RES-5: Event date pulled inside 21 days triggers TIMELINE_BOTTLENECK on venue/catering prerequisites
    await runScenario("RES-5", "Event date pulled inside 21 days triggers TIMELINE_BOTTLENECK on venue/catering prerequisites", () => {
      const dag = resolveMilestoneDAG(sampleMilestones, 15);
      assert(dag.bottlenecks.includes("m2"), "Expected m2 (Finalize Caterer Menu, leadTime 30d) in bottlenecks");

      const input: EventPlanInput = {
        eventTitle: "Verma Wedding",
        personaLens: "wedding_coordinator",
        guestCount: 200,
        baseGuestCount: 200,
        totalBudgetCap: 800000,
        daysRemaining: 15,
        budgetItems: sampleBudget.map((b) => ({ ...b, isEstimate: false })),
        milestones: sampleMilestones
      };
      const res = evaluateEventPlan(input);
      assert(res.triageTier === "TIMELINE_BOTTLENECK", `Expected TIMELINE_BOTTLENECK, got ${res.triageTier}`);
    });

    // RES-6: Topological DAG sort places parent tasks strictly before dependent child tasks
    await runScenario("RES-6", "Topological DAG sort places parent tasks strictly before dependent child tasks", () => {
      const dag = resolveMilestoneDAG(sampleMilestones, 40);
      const idxM1 = dag.topologicalOrder.indexOf("m1"); // Lock Banquet Venue
      const idxM2 = dag.topologicalOrder.indexOf("m2"); // Finalize Caterer Menu (depends on m1)
      const idxM3 = dag.topologicalOrder.indexOf("m3"); // Send Wedding Invitations (depends on m2)

      assert(idxM1 < idxM2, `Parent m1 (${idxM1}) must precede dependent child m2 (${idxM2})`);
      assert(idxM2 < idxM3, `Parent m2 (${idxM2}) must precede dependent child m3 (${idxM3})`);
    });

    // RES-7: Cyclic dependency graph input recovers gracefully without infinite loops
    await runScenario("RES-7", "Cyclic dependency graph input recovers gracefully without infinite loops", () => {
      const cyclicMilestones: MilestoneTask[] = [
        { id: "c1", title: "Task 1", deadlineDaysBeforeEvent: 30, category: "decor", dependsOn: ["c2"], status: "pending", urgency: "medium" },
        { id: "c2", title: "Task 2", deadlineDaysBeforeEvent: 20, category: "decor", dependsOn: ["c1"], status: "pending", urgency: "medium" }
      ];
      const dag = resolveMilestoneDAG(cyclicMilestones, 40);
      assert(dag.isCyclic === true, "Expected isCyclic to be true");
      assert(dag.topologicalOrder.length === 2, `Expected 2 tasks in recovery order, got ${dag.topologicalOrder.length}`);
      assert(dag.topologicalOrder.includes("c1") && dag.topologicalOrder.includes("c2"), "Order must contain both cyclic tasks");
    });

    // RES-8: Vendor note missing 'GST' and 'Generator' flags hiddenCostRisks deterministically
    await runScenario("RES-8", "Vendor note missing 'GST' and 'Generator' flags hiddenCostRisks deterministically", () => {
      const roughNote = "Catering service for 200 pax at Rs. 1,80,000/- with live chaat and main buffet.";
      const audit = auditVendorQuoteOffline(roughNote);

      assert(audit.quotedAmount === 180000, `Expected quotedAmount 180000, got ${audit.quotedAmount}`);
      assert(audit.detectedInclusions.includes("Feast & Menu Service"), "Expected Feast & Menu Service inclusion");
      assert(audit.flaggedHiddenCosts.some((c) => c.toLowerCase().includes("gst")), "Expected GST hidden cost flag");
      assert(audit.flaggedHiddenCosts.some((c) => c.toLowerCase().includes("generator")), "Expected Generator hidden cost flag");
      assert(audit.negotiationQuestions.length === 3, `Expected exactly 3 negotiation questions, got ${audit.negotiationQuestions.length}`);
    });

    // RES-9: Unconfirmed budget items retain isEstimate: true until locked
    await runScenario("RES-9", "Unconfirmed budget items retain isEstimate: true until locked", () => {
      const input: EventPlanInput = {
        eventTitle: "Verma Wedding",
        personaLens: "family_host",
        guestCount: 200,
        baseGuestCount: 200,
        totalBudgetCap: 850000,
        daysRemaining: 40,
        budgetItems: sampleBudget, // item b6 has isEstimate: true
        milestones: sampleMilestones
      };
      const res = evaluateEventPlan(input);
      assert(sampleBudget.find((b) => b.id === "b6")?.isEstimate === true, "b6 should retain isEstimate: true");
      assert(res.triageTier === "VENDOR_CLARIFICATION", `Expected VENDOR_CLARIFICATION, got ${res.triageTier}`);

      // Lock item b6 (isEstimate: false)
      const lockedBudget = sampleBudget.map((b) => ({ ...b, isEstimate: false }));
      const lockedRes = evaluateEventPlan({ ...input, budgetItems: lockedBudget });
      assert(lockedRes.triageTier === "ON_TRACK", `Expected ON_TRACK after locking estimate, got ${lockedRes.triageTier}`);
    });

    // RES-10: Missing GEMINI_API_KEY returns HTTP 200 with deterministic fallback (provenance: 'fallback') in <10ms
    await runScenario("RES-10", "Missing GEMINI_API_KEY returns HTTP 200 with deterministic fallback (provenance: 'fallback') in <10ms", async () => {
      // Force unconfigured Gemini status
      const originalKey = process.env.GEMINI_API_KEY;
      process.env.GEMINI_API_KEY = "YOUR_GEMINI_API_KEY_HERE";
      SecureLLMClient.getInstance().initClient();

      const overrunPayload: EventPlanInput = {
        eventTitle: "Verma Sangeet",
        personaLens: "family_host",
        guestCount: 200,
        baseGuestCount: 200,
        totalBudgetCap: 800000,
        daysRemaining: 40,
        budgetItems: [
          ...sampleBudget,
          { id: "b7", category: "decor", label: "Extra Floral Arch", allocatedAmount: 160000, actualAmount: 160000, isEstimate: false }
        ],
        milestones: sampleMilestones,
        priorityVibe: "Balanced"
      };

      const bodyStr = JSON.stringify(overrunPayload);

      // Pre-warm keepalive connection for exact engine processing latency
      await fetch(`${baseUrl}/api/rebalance`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: bodyStr
      });

      const start = performance.now();
      const res = await fetch(`${baseUrl}/api/rebalance`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: bodyStr
      });
      const durationMs = performance.now() - start;
      const data = await res.json();

      // Restore key
      if (originalKey !== undefined) {
        process.env.GEMINI_API_KEY = originalKey;
      }

      assert(res.status === 200, `Expected HTTP 200, got ${res.status}`);
      assert(data.provenance === "fallback", `Expected provenance 'fallback', got ${data.provenance}`);
      assert(Array.isArray(data.strategies) && data.strategies.length >= 2, "Expected structured trade-off strategies");
      assert(data.deficit === 160000, `Expected deficit 160000, got ${data.deficit}`);
      assert(durationMs < 10, `Expected HTTP execution <10ms, took ${durationMs.toFixed(2)}ms`);
    });

    // RES-11: Malformed API payload (negative budget cap) returns HTTP 400 ValidationError
    await runScenario("RES-11", "Malformed API payload (negative budget cap) returns HTTP 400 ValidationError", async () => {
      const res = await fetch(`${baseUrl}/api/rebalance`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          totalBudgetCap: -50000,
          budgetItems: []
        })
      });
      const data = await res.json();
      assert(res.status === 400, `Expected HTTP 400, got ${res.status}`);
      assert(data.error === "ValidationError", `Expected ValidationError, got ${data.error}`);

      // Malformed body (non-array budgetItems)
      const res2 = await fetch(`${baseUrl}/api/rebalance`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          totalBudgetCap: 500000,
          budgetItems: "not-an-array"
        })
      });
      const data2 = await res2.json();
      assert(res2.status === 400, `Expected HTTP 400, got ${res2.status}`);
      assert(data2.error === "ValidationError", `Expected ValidationError, got ${data2.error}`);
    });

    // RES-12: RFC 5545 .ics export string contains valid BEGIN:VCALENDAR and VEVENT blocks
    await runScenario("RES-12", "RFC 5545 .ics export string contains valid BEGIN:VCALENDAR and VEVENT blocks", () => {
      const ics = generateIcsCalendar(sampleMilestones, "2026-11-20T00:00:00Z", "Grand Wedding");
      assert(ics.includes("BEGIN:VCALENDAR"), "Must contain BEGIN:VCALENDAR");
      assert(ics.includes("VERSION:2.0"), "Must contain VERSION:2.0");
      assert(ics.includes("PRODID:-//UtsavAI"), "Must contain PRODID:-//UtsavAI");
      assert(ics.includes("BEGIN:VEVENT"), "Must contain BEGIN:VEVENT");
      assert(ics.includes("SUMMARY:[Grand Wedding] Lock Banquet Venue"), "Must contain task summary with event title");
      assert(ics.includes("END:VEVENT"), "Must contain END:VEVENT");
      assert(ics.includes("END:VCALENDAR"), "Must contain END:VCALENDAR");
    });

    // RES-13: WhatsApp wa.me generator properly URL-encodes negotiation questions and strips unsafe characters
    await runScenario("RES-13", "WhatsApp wa.me generator properly URL-encodes negotiation questions and strips unsafe characters", () => {
      const waLink = generateWhatsAppLink(
        "+91 98765-43210",
        ["Does this quote include 18% GST?", "Are generator fuel charges included? & cleaning?"],
        "Sharmaji Caterers"
      );
      assert(waLink.startsWith("https://wa.me/919876543210?text="), `Must strip non-digits from phone, got ${waLink}`);
      assert(waLink.includes("%25"), "Must URL-encode % to %25");
      assert(waLink.includes("%26"), "Must URL-encode & to %26");
      const decoded = decodeURIComponent(waLink);
      assert(decoded.includes("Namaste Sharmaji Caterers!"), "Must format greeting with vendor name");
      assert(decoded.includes("1. Does this quote include 18% GST?"), "Must number negotiation questions");
      assert(decoded.includes("2. Are generator fuel charges included?"), "Must include question 2");
    });

    // RES-14: 100-event synthetic stress benchmark completes in <50ms with 0 exceptions
    await runScenario("RES-14", "100-event synthetic stress benchmark completes in <50ms with 0 exceptions", () => {
      const start = performance.now();
      for (let i = 0; i < 100; i++) {
        const input: EventPlanInput = {
          eventTitle: `Synthetic Benchmark Event #${i}`,
          personaLens: i % 3 === 0 ? "family_host" : i % 3 === 1 ? "wedding_coordinator" : "community_organizer",
          guestCount: 100 + (i % 350),
          baseGuestCount: 200,
          totalBudgetCap: 500000 + (i * 15000),
          daysRemaining: 5 + (i % 90),
          budgetItems: sampleBudget,
          milestones: sampleMilestones
        };
        const res = evaluateEventPlan(input);
        assert(res.triageTier !== undefined, `triageTier must be defined for event #${i}`);
        assert(res.totalAllocated > 0, `totalAllocated must be > 0 for event #${i}`);
        assert(res.urgencyScore >= 0 && res.urgencyScore <= 100, `urgencyScore must be 0-100 for event #${i}`);
      }
      const elapsed = performance.now() - start;
      assert(elapsed < 50, `Expected 100 event calculations in <50ms, took ${elapsed.toFixed(2)}ms`);
    });

  } finally {
    server.close();
  }

  // Summary Report
  const passedCount = results.filter((r) => r.passed).length;
  const totalDuration = results.reduce((acc, r) => acc + r.durationMs, 0);

  console.log("\n\x1b[1m\x1b[35m======================================================================\x1b[0m");
  console.log(`\x1b[1m  RESILIENCE TEST SUMMARY: \x1b[32m${passedCount} / ${results.length} PASSED\x1b[0m (\x1b[36m${totalDuration.toFixed(2)}ms\x1b[0m)\x1b[0m`);
  console.log("\x1b[1m\x1b[35m======================================================================\x1b[0m\n");

  if (passedCount < results.length) {
    console.error(`\x1b[31m[FAILED] ${results.length - passedCount} scenario(s) failed.\x1b[0m`);
    process.exit(1);
  } else {
    console.log("\x1b[32m[PASS] All 14 Deterministic & Resilience Scenarios Verified Successfully.\x1b[0m\n");
    process.exit(0);
  }
}

// Auto-execute if run directly
const isDirectRun = Boolean(
  process.argv[1] &&
  (process.argv[1].endsWith("testHarness.ts") || process.argv[1].includes("testHarness"))
);

if (isDirectRun) {
  runTestHarness().catch((err) => {
    console.error("Test Harness Fatal Error:", err);
    process.exit(1);
  });
}
