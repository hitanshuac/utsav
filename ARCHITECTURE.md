# Architecture & Data Flow (`UtsavAI`)

🌐 **Live Production App:** [https://utsav-wine.vercel.app](https://utsav-wine.vercel.app)  
⚡ **Live Diagnostics & AI Provenance:** [https://utsav-wine.vercel.app/api/health](https://utsav-wine.vercel.app/api/health)

## 1. High-Level System Design

`UtsavAI` is a hybrid deterministic + AI-assisted celebration and event execution engine designed for high-stakes Indian weddings and community events.

```text
[React 19 + Tailwind CSS v4 SPA]
       │
       ├──► Deterministic Engine (Client-Side TypeScript: src/lib/plannerEngine.ts)
       │      ├── Budget Arithmetic & Per-Guest Plate Scaling (evaluateEventPlan)
       │      ├── Kahn's Topological Sort & Cycle Detection (sortMilestonesTopologically)
       │      ├── Milestone T-Minus Dependency Cascade & Critical Path Bottlenecks
       │      ├── Custom Event Guided Intake Generator (generateCustomEventPlan)
       │      ├── RFC 5545 iCalendar Generator (generateIcsCalendar)
       │      └── Ephemeral Event Logger (src/lib/services/event-logger.ts -> 100% In-Memory)
       │
       └──► HTTP POST /api/rebalance, /api/audit-vendor, /api/planner (Express Server on :3000)
              │
              └──► SecureLLMClient (src/lib/services/secure-llm-client.ts)
                     ├── 1. Pre-flight OWASP LLM01 Input Sanitization (strip HTML, max 800 chars)
                     ├── 2. Google Gemini (@google/genai: gemini-3.5-flash -> fallback gemini-3.5-flash-lite)
                     ├── 3. Post-flight OWASP LLM06 Credential Leak Inspection (blocks AIza... / sk-...)
                     ├── 4. Strict Zod Schema Runtime Validation (src/types/schemas.ts)
                     └── 5. Automatic Deterministic Shield Fallback on missing key or API failure
```

---

## 2. State Management & Scenarios

Application state is held in ephemeral in-memory React 19 state with zero persistent client storage (zero browser web storage, indexed database, or cookies), upholding a strict Zero-PII security guarantee.

- **Deterministic Evaluation Engine (`src/lib/plannerEngine.ts`)**:
  Calculates all budget totals, guest scaling, milestone DAG orders, and triage tiers synchronously in `<5ms`.
- **Three Evaluator Presets (`src/lib/presets.ts`)**:
  - `presetA` — **Sharma Family Wedding**: 350 guests, ₹18,00,000 budget cap, 8 milestones (Tier 1 Overrun).
  - `presetB` — **50th Milestone Anniversary**: 120 guests, ₹6,50,000 budget cap, 6 milestones (Tier 2 Bottleneck).
  - `presetC` — **Neighborhood Cultural Utsav**: 600 guests, ₹12,00,000 budget cap, 8 milestones (Tier 3 Clarification).
- **Custom Event Guided Intake (`+ Plan Custom Event`)**:
  Allows users/judges to input custom title, occasion, budget cap, guest count, days remaining, vibe, and must-have priorities, generating a balanced 6-category plan and 6-step DAG dynamically in `<5ms`.
- **Topic Navigation Tabs**:
  - `"overview"`: Executive dashboard, triage alert banner, high-level metrics, and quick actions.
  - `"budget"`: 6-category allocation cards, dynamic per-plate scaling, verified vs estimate toggles, and 1-click trade-off rebalancing.
  - `"milestones"`: Topological dependency list, critical path bottleneck alerts, status cycling, and RFC 5545 `.ics` export.
  - `"vendor"`: Plain-text vendor quote auditor, hidden fee detection, negotiation questions, and 1-click WhatsApp dispatch.

---

## 3. Unified Codebase Architecture (`src/` Single Source of Truth)

All active source code strictly resides inside `src/` and `server.ts`. Legacy root directories (`lib/`, `components/`, `app/`) have been eliminated:
- `src/lib/plannerEngine.ts`: Single source of truth for all mathematical and DAG logic.
- `src/lib/presets.ts`: Evaluator scenario presets.
- `src/lib/services/secure-llm-client.ts`: Server-side Gemini LLM client with guardrails.
- `src/lib/services/event-logger.ts`: 100% ephemeral in-memory communication activity logger.
- `src/lib/services/planner-route.ts`: API route execution handler.
- `src/types/schemas.ts`: Strict Zod runtime validation schemas.
- `src/types/planner.ts`: Core TypeScript domain contracts.

---

## 4. Topological Dependency Graph & Kahn's Algorithm

- Implemented in `src/lib/plannerEngine.ts` via `sortMilestonesTopologically()`.
- Uses **Kahn's Algorithm** (in-degree tracking + queue traversal) to order milestones.
- Detects circular dependencies (`hasCircularDependency`) before rendering.
- Computes:
  - **Blocked status**: A milestone is blocked if any prerequisite in `task.dependsOn` is not marked `"completed"`.
  - **Critical path bottlenecks**: Pending tasks that block 1 or more downstream tasks and have tight deadlines (< 7 days).
