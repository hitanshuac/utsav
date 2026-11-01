# HANDOVER — UtsavAI (उत्सव AI) Functional Restoration, Visual Flowchart, Modification Diffs & Activity History

> **Project:** UtsavAI — Celebration & Event Execution Engine  
> **Objective:** Restore the interactive Visual Dependency Flowchart, Step-by-Step Guided Walkthrough, Flashing Crimson Red Critical Alerts, Action Modification Diff Popup, and Live Activity History Log (`event-logger.ts`), plus Vercel Serverless Deployment.  
> **Active Branch:** `main`

---

## 1. SYSTEM INSTRUCTIONS & GUARDRAILS FOR ANTIGRAVITY IDE

```text
You are the Principal Full-Stack Architect maintaining "UtsavAI".

Strict Operational Directives:
1. RESTORE DISCONNECTED WORKFLOWS: Reconnect `src/lib/services/event-logger.ts`, `src/lib/services/communication.ts`, `src/lib/engine/delay-cascade.ts`, and `src/lib/engine/dependency-graph.ts` directly into the React UI so every button click produces visible feedback, a Before->After modification explanation popup, and a permanent entry in the in-memory Activity History Log.
2. UNIFIED DIRECTORY LOCK: Keep all frontend and shared code inside `src/` and `server.ts` (plus `api/index.ts` and `vercel.json` for Vercel). NEVER create root-level `app/`, `lib/`, or `components/` directories.
3. DETERMINISTIC ENGINE: All math, guest scaling, and Kahn's DAG sorting run in `src/lib/plannerEngine.ts`.
4. ZERO-PII & ZERO STORAGE: Keep state 100% in-memory (`event-logger.ts` and React state). Never use browser Web Storage APIs, IndexedDB, or cookies.
5. SAFE DOM & SOLID-SURFACE CSS: Render dynamic text via `<SafeNarrative />`. In `src/styles/*.css`, use ONLY opaque hex colors (`#DC2626`, `#FEF2F2`, `#FCA5A5`, etc.) and CSS variables (`var(--c-...)`). Never use `backdrop-filter`, `blur(`, or `rgba(`. Solid-color `@keyframes` animations for flashing red critical alerts are mandatory and 100% compliant.
```

---

## 2. THE 5 CORE PRODUCT RESTORATIONS REQUIRED

### Restoration 1: Step-by-Step Guided Walkthrough Bar & Inline Wizard (`src/components/GuidedWalkthroughBar.tsx`)

Users and judges must never have to guess what to click next. Add an interactive 4-Step Guided Walkthrough Strip directly above the main workspace that highlights the current step, explains what input is needed, and provides a "Complete & Go to Next Step →" button:

- **Step 1: Event Intake & Constraints** — Inline guided inputs for Event Title, Budget Cap (₹), Guest Count, Days Left, Dietary Profile (Jain, Vegan, Multi-Cuisine), and Guest Accessibility (Children + Seniors, Wheelchair), plus 1-click Presets.
- **Step 2: Budget & Overrun Resolution** — Highlights any flashing red overrun category, explains the per-plate math, and guides the user to click "⚡ Generate & Apply Trade-Off" to eliminate the deficit.
- **Step 3: Visual Dependency Flowchart & Delay Cascade** — Guides the user through the interactive SVG/Node Flowchart, showing which tasks are blocked in flashing red, allowing them to simulate a "+30m Ceremony Delay Cascade" or "-14d Date Pull-In" and dispatch vendor notifications using the 4 editable templates (`standard`, `delay_30m`, `budget_surge`, `backup_sos`).
- **Step 4: Vendor Quote Audit & Loop Closure History** — Guides the user to audit a vendor quote, dispatch a WhatsApp/Email clarification, and click "✓ Close Loop" in the Activity History Log.

---

### Restoration 2: Interactive Visual Dependency Flow Diagram (`src/components/VisualDependencyFlowchart.tsx`)

Replace the flat milestone list with an Interactive Visual Node-and-Arrow Flowchart (with a toggle to view the table):

1. **Stage-by-Stage Topological Layout:**
   - Group milestones into topological tiers (Stage 1: Foundation/Venue → Stage 2: Catering/Decor/AV → Stage 3: Crew/Logistics → Stage 4: Final Handover) connected by SVG directional arrows (`<svg>` with solid hex strokes `#94A3B8` for normal edges and `#DC2626` dashed/thick strokes for critical blocked paths).
2. **Interactive Node Inspection & Delay Cascade (`src/lib/engine/delay-cascade.ts`):**
   - Clicking any node in the flowchart opens an interactive Task Execution & Vendor Outreach Panel right below the diagram where the user can:
     - Mark the prerequisite task as `pending` → `in_progress` → `completed` (which immediately unlocks downstream nodes in the flowchart).
     - Trigger a "+30m / +60m Delay Cascade" to see how a delay on that node shifts all dependent downstream tasks.
     - Select from the 4 Editable Edge-Case Templates (`standard`, `delay_30m`, `budget_surge`, `backup_sos`), edit the message text, and dispatch via WhatsApp or 3rd-Party Vendor Email (`src/lib/services/communication.ts`).

---

### Restoration 3: Flashing Crimson Red Critical Highlights (`src/styles/components.css`)

Critical items MUST visually flash/pulse in red so the user immediately sees every problem:

1. Add solid-hex `@keyframes` rules in `src/styles/components.css` (strictly using opaque hex colors `#DC2626`, `#FEF2F2`, `#FCA5A5`, `#991B1B` — ZERO `rgba(` or `blur()`):
   ```css
   @keyframes criticalBorderFlash {
     0%, 100% {
       border-color: #DC2626;
       background-color: #FEF2F2;
     }
     50% {
       border-color: #F87171;
       background-color: #FEE2E2;
     }
   }

   @keyframes criticalBeaconPulse {
     0%, 100% {
       transform: scale(1);
       background-color: #DC2626;
     }
     50% {
       transform: scale(1.35);
       background-color: #991B1B;
     }
   }

   .critical-flash-card {
     border: 2px solid #DC2626 !important;
     background-color: #FEF2F2 !important;
     animation: criticalBorderFlash 1.6s infinite ease-in-out;
   }

   .critical-pulse-dot {
     display: inline-block;
     width: 10px;
     height: 10px;
     border-radius: 9999px;
     background-color: #DC2626;
     animation: criticalBeaconPulse 1.2s infinite ease-in-out;
   }
   ```
2. Apply `.critical-flash-card` and `.critical-pulse-dot` automatically to:
   - Any Flowchart Node that is a critical-path bottleneck (`leadTimeDays > daysRemaining` or `urgency === 'critical'` while uncompleted).
   - Any Budget Category Card that causes a budget overrun or is an unverified high-risk estimate during Tier 1 CRITICAL_OVERRUN.
   - Any Flagged Hidden Cost Clause (e.g., omitted 18% GST, generator surcharge) in the Vendor Quote Auditor.
   - The Tier 1 / Tier 2 Alert Banner at the top of the workspace.

---

### Restoration 4: "What Changed?" Modification & Impact Popup (`src/components/ActionDiffModal.tsx`)

Whenever a user clicks an action button, DO NOT silently change numbers in the background. Immediately display a clear Modification Summary Popup / Modal (`role="dialog"`, dismissible via "Got It" or Escape, with an option to "View in Activity Log"):

1. **Trigger Events:**
   - Applying a Budget Trade-Off Strategy
   - Clicking "⚡ Simulate Mid-Flight Shift (+50 Guests, -10% Budget, -14d)"
   - Triggering a Delay Cascade (+30m) or changing a Milestone Task's status (`completed` / `pending`)
   - Locking/Verifying a Vendor Quote or Applying Vendor Audit findings
   - Switching Judge Scenario Presets (Preset A, Preset B, Preset C) or creating a Custom Event
2. **Popup Contents:**
   - Header: Action Name + Timestamp + Triage Status Shift (e.g., Tier 1: CRITICAL_OVERRUN (92/100) → Tier 4: ON_TRACK (35/100)).
   - Before → After Diff Table:
     - TotalAllocated: ₹3,55,000 → ₹3,00,000 (-₹55,000 saved)
     - Budget Variance: -₹55,000 Deficit → ₹0 Balanced
     - Category/Task Specific Deltas (e.g., Catering: +₹65,000 due to +50 guests, Task m2 unlocked Task m5).
   - Why This Happened (Plain-English Explanation): Clear 2-sentence explanation of the deterministic rule that executed and the recommended next step.

---

### Restoration 5: Live Activity & Loop-Closure History Log (`src/components/ActivityHistoryPanel.tsx` + `src/lib/services/event-logger.ts`)

Wire `src/lib/services/event-logger.ts` across the entire app so every single modification and communication is logged and inspectable:

1. **Automatic Logging on Every Action:**
   - Every trade-off applied, slider change, preset switch, task status toggle, delay cascade, vendor quote audit, WhatsApp dispatch, and Email dispatch MUST call `logEventActivity(...)` in `src/lib/services/event-logger.ts` with the exact before -> after details.
2. **Visible Activity History Drawer & Sidebar/Tab View:**
   - Add a prominent "📜 Activity Log & History (N)" button with a live badge counter in the Top App Bar (`AppBar.tsx`) AND a dedicated section in the right sidebar / workspace so anyone can inspect the chronological history at any time.
   - Each log entry displays:
     - Timestamp (e.g., 14:32:08)
     - Channel / Action Badge (SYSTEM MODIFICATION, WHATSAPP SENT, EMAIL SENT, CALL LOGGED, ✓ LOOP CLOSED)
     - Summary & Exact Modifications (e.g., "Applied Trade-Off 'Prudent Aesthetic Trim': Decor -₹35,000, Misc -₹20,000 -> Deficit ₹0").
     - 1-Click "✓ Close Loop (Mark Confirmed)" Button on any open vendor communication entry, which logs a loop_closed confirmation and updates the vendor's Effectiveness Score (0–100%) and Cadence Status (Loop Closed / Balanced Cadence / Needs Call Follow-up)!

---

## 3. VERCEL SERVERLESS DEPLOYMENT & SRE HARDENING

1. **`server.ts` Export & Listener Guard:**
   ```typescript
   if (process.env.VERCEL !== '1' && process.env.NODE_ENV !== 'test') {
     app.listen(PORT, '0.0.0.0', () => {
       console.log(`UtsavAI server listening on http://localhost:${PORT}`);
     });
   }
   export { app };
   export default app;
   ```
2. **`api/index.ts`:**
   ```typescript
   import app from '../server';
   export default app;
   ```
3. **`vercel.json`:**
   ```json
   {
     "version": 2,
     "buildCommand": "npm run build",
     "outputDirectory": "dist",
     "rewrites": [
       { "source": "/api/(.*)", "destination": "/api/index" },
       { "source": "/(.*)", "destination": "/index.html" }
     ]
   }
   ```
4. **OWASP ASVS Headers & Accessibility Polish:**
   - Include `Strict-Transport-Security`, `Cross-Origin-Opener-Policy: same-origin`, `Cross-Origin-Resource-Policy: same-origin`, `express.json({ limit: '16kb' })`, and 415 Unsupported Media Type guard in `server.ts`.
   - Include `.skip-link`, keyboard roving on `TopicTabs.tsx`, and `@media (prefers-reduced-motion: reduce)`, `@media (forced-colors: active)`, and `@media print` in `src/styles/components.css`.

---

## 4. MANDATORY VERIFICATION GATES (RUN AFTER ALL EDITS)

All 5 commands MUST exit 0:
- `npm run lint` -> **PASSED (Exit 0)**
- `npm run build` -> **PASSED (Exit 0, 100.73 kB gzip JS, 8.62 kB gzip CSS)**
- `npm run test:planner` -> **PASSED (Exit 0, 14/14 RES scenarios passed in ~23ms)**
- `npm run test:compliance` -> **PASSED (Exit 0, 6/6 Scans passed)**
- `npm test` -> **PASSED (Exit 0, 63/63 tests passed across 13 test suites)**

---

## 5. BROWSER VERIFICATION & INTERACTION EVIDENCE

An end-to-end browser verification session was executed across all 5 restored capabilities at `http://localhost:3000`:
- **Restoration 1: Step-by-Step Guided Walkthrough Bar**
  - Advanced across Step 1 (Intake & Baseline) -> Step 2 (Budget Fix) -> Step 3 (Flowchart & Delays) -> Step 4 (Audit & History).
  - Verified active step guidance, bidirectional navigation, and inline intake inputs (Dietary Profile, Multi-generational constraints).
- **Restoration 2: Interactive Visual Dependency Flowchart**
  - Rendered 4 topological stages (Foundation, Core Experience, Crew & Logistics, Execution).
  - Inspected task node (`AM2 Finalize Caterer Menu Tasting & Headcount`) with pulsing crimson dot indicator.
  - Verified `+30m Delay Cascade` downstream simulation and WhatsApp negotiation dispatch drawer.
- **Restoration 3 & 4: Flashing Crimson Highlights & Mid-Flight Action Diff Modal**
  - Triggered `⚡ Simulate Mid-Flight Shift (+50 Guests, -10% Budget, -14d)`.
  - Verified `ActionDiffModal` opened with before -> after table (Guest count 200 -> 250, Budget ₹8L -> ₹7.2L, Days 120 -> 106, Urgency +63 pts).
  - Verified solid hex flashing red highlights (`#DC2626`, `#FEF2F2`) with 0 `rgba(` and 0 `blur()`.
- **Restoration 5: Live Activity & Loop-Closure History Log**
  - Verified in-memory audit log entries (`SHIFT`, `TRADEOFF`, `LOOP CLOSED`).
  - Tested 1-click `✓ Close Loop (Mark Confirmed)`, increasing loop closure cadence to 100% and updating vendor effectiveness.
- **Custom Event Intake Modal**
  - Opened `+ Plan Custom Event`, selected Jain Pure Veg / Senior Accessibility, and generated plan in <10ms.
- **1-Click Exports**
  - Validated RFC 5545 `.ics` export and WhatsApp wa.me links.

