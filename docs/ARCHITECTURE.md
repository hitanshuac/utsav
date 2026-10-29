# Architecture & Data Flow (`UtsavLedger`)

## 1. High-Level System Design

`UtsavLedger` is a hybrid deterministic + AI-assisted command center designed for high-stakes Indian weddings and community celebrations.

```text
[React 19 + Tailwind v4 SPA]
       │
       ├──► Deterministic Engines (Client-Side TypeScript)
       │      ├── Budget & Per-Guest Scaling (lib/engine/budget-math.ts)
       │      ├── Kahn's Topological Sort (lib/engine/dependency-graph.ts)
       │      ├── T-Minus Delay Cascade (lib/engine/delay-cascade.ts)
       │      └── Persistent Event Logger (lib/services/event-logger.ts -> localStorage)
       │
       └──► HTTP POST /api/planner (Express Server on :3000)
              │
              └──► SecureLLMClient (lib/security/secure-llm-client.ts)
                     ├── 1. Pre-flight OWASP LLM01 Input Sanitization
                     ├── 2. @google/genai (gemini-3.8-flash -> fallback gemini-2.5-flash)
                     ├── 3. Post-flight OWASP LLM06 Credential Leak Inspection
                     ├── 4. Strict Zod Schema Validation (lib/types.ts)
                     └── 5. Automatic Deterministic Shield Fallback on timeout/missing key
```

---

## 2. State Management (`lib/store/usePlannerStore.ts`)

Global application state is managed via **Zustand**:

- **Scenario Presets**:
  - `sharma-wedding`: 350 guests, ₹18,00,000 cap, 8 interconnected milestones.
  - `community-sangeet`: 200 guests, ₹7,50,000 cap.
  - `intimate-roka`: 80 guests, ₹2,50,000 cap.
- **Navigation Tabs (`WorkspaceTab`)**:
  - `"overview"`: Executive summary, `PendingTaskStrip`, `TaskDependencyGraph`, and `ActivityLoopLogger`.
  - `"budget"`: Category ledger, Verified vs Estimate toggles, and `GuestBufferCalculator`.
  - `"vendor"`: `VendorAuditor` (plain-text quote normalization + WhatsApp negotiation).
  - `"tradeoffs"`: Strategic budget rebalancing (`TradeoffDrawer`).
  - `"milestones"`: Full topological task list, `TMinusCascadeHub`, and RFC 5545 `.ics` export.
  - `"sos"`: Emergency Day-Of Cash & Lifafa reconciliation (`SosCashLedger`).

---

## 3. Dual Path Convention (`lib/` vs `src/lib/`)

To ensure compatibility across both root-level imports (`../lib/...`) and Vite `src/` imports (`./lib/services/...`), the following service modules are mirrored:
- `lib/services/event-logger.ts` ↔ `src/lib/services/event-logger.ts`
- `lib/services/communication.ts` ↔ `src/lib/services/communication.ts`

When modifying `communication.ts` or `event-logger.ts`, ensure both paths stay synchronized (or re-export from `lib/services/*`).

---

## 4. Topological Dependency Graph (`lib/engine/dependency-graph.ts`)

- Uses **Kahn's Algorithm** (in-degree tracking + queue traversal) to topologically sort tasks.
- Detects circular dependencies (`CycleDetectedError`) before rendering.
- Computes:
  - **Blocked status**: A task is blocked if any ID in `task.dependsOn` has `status !== "completed"`.
  - **Downstream impact count**: Number of transitive tasks that depend on a given node.
- Visualized in `components/timeline/TaskDependencyGraph.tsx` as a horizontal left-to-right flow grouped into T-Minus columns (`T-30d+`, `T-7d`, `T-1d`, `Day-Of`).
