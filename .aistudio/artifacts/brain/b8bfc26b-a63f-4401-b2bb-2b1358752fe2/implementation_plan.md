# Implementation Plan — 3rd-Party Communication Service, Progressive-Disclosure Tasks & Interconnected Dependency Graph

## 1. Architecture & Core Services

### A. 3rd-Party Vendor Communication Service (`src/lib/services/communication.ts` & `lib/services/communication.ts`)
- **Dual-Path Resolution**: Create `/src/lib/services/communication.ts` as the canonical implementation and re-export all symbols from `/lib/services/communication.ts` so both root-relative (`lib/...`) and `src/lib/...` imports resolve seamlessly.
- **3rd-Party-Only Email Rule**:
  - Extend `vendorContact` on `MilestoneTask` (in `lib/types.ts` and `lib/store/usePlannerStore.ts`) with an optional `email` field (defaulting to deterministic 3rd-party vendor addresses such as `gurnam.tents@vendor.utsav.in`, `mukesh.halwai@vendor.utsav.in`, `ramesh.genset@vendor.utsav.in`, etc.).
  - Enforce a strict guard in `triggerEmailNotification`: reject or skip internal manager/coordinator addresses (`hitanshuac@gmail.com`) and dispatch strictly to external 3rd-party vendor contacts.
- **Exposed Functions**:
  - `triggerWhatsAppNotification(payload: WhatsAppDispatchRequest): CommunicationDispatchResult`
  - `triggerEmailNotification(payload: EmailDispatchRequest): CommunicationDispatchResult`
  - `getTaskDispatchHistory(taskId?: string): CommunicationDispatchResult[]`
- **Integration with `TMinusAlertService` (`lib/services/tminus-alert-service.ts`)**:
  - Integrate `triggerWhatsAppNotification` and `triggerEmailNotification` into `TMinusAlertService` so critical or approaching T-Minus deadlines can automatically or on-demand trigger 3rd-party vendor dispatches when `autoTriggerCritical` is enabled or via `dispatchCriticalAlerts(alerts)` / single-task icon triggers.

---

## 2. Progressive-Disclosure UI & Compact Action Icons ("Less is More")

### A. Pending Tasks Strip (`components/timeline/PendingTaskStrip.tsx`)
- **Ultra-Clean Default Row**:
  - Display only the status toggle, **Task Title**, a concise status label (`"Needs approval"` for pending/critical, `"Needs finalization"` for in-progress, `"Blocked"` if waiting on prerequisite, or `"Done"`), and compact `T-Xd` timing.
  - **Integrated Small Icon Buttons**: Place compact, single-click **WhatsApp** and **3rd-Party Email** icon buttons directly inside each pending task row (`w-6 h-6` touch-friendly icon buttons with subtle tooltips).
  - **Instant Subtle Badge Feedback**: Clicking either the WhatsApp or Email icon triggers `triggerWhatsAppNotification` or `triggerEmailNotification` for that task's 3rd-party vendor and updates an inline subtle status indicator (`"WA Sent"` / `"Email Sent"`) right on the task row without intrusive modals.
- **Click-to-Expand Progressive Disclosure**:
  - Clicking a task row toggles its expanded drawer, revealing full details only on demand: assigned 3rd-party vendor name, role, phone/email, dependency prerequisites, inline title/deadline editor, delete button, and deep-link to Budget/Vendors.

### B. Compact T-Minus Alert Strip (`components/alerts/TMinusAlertBanner.tsx`)
- Replace verbose multi-line paragraphs with a single-line summary bar (`"3 tasks need finalization · T-Minus Alert"`) + compact 1-click vendor dispatch icons, expanding full alert details only when clicked.

---

## 3. Interconnected Task Dependency Graph (`components/timeline/TaskDependencyGraph.tsx`)

- **Horizontal Flow by T-Minus Stage**:
  - Render an interactive SVG + HTML node-and-edge graph on the Dashboard Overview (`CommandCenterPage` when `activeTab === "overview"`), organized horizontally across four columns:
    1. **Foundation (`T-90d to T-45d`)**
    2. **Lock-In (`T-30d to T-7d`)**
    3. **Final Prep (`T-7d to T-1d`)**
    4. **Day-Of Muhurat (`T-0d`)**
- **Visual Language & Interactivity**:
  - Nodes are color-coded using subtle pastel category surfaces (`CATEGORY_PASTEL`) with concise labels (title + `T-Xd`).
  - Directed bezier edges (`<svg>` paths) connect prerequisite tasks (`dependsOn`) to downstream tasks, highlighting critical-path or delayed dependencies in amber/rose and completed links in emerald.
  - Clicking any node selects it to highlight its upstream/downstream dependency chain and reveals a compact inline detail strip with 1-click status toggle and 3rd-party WhatsApp/Email icon actions.

---

## 4. Verification & Testing
- Add unit tests in `tests/communication.test.ts` and update `tests/tminus-alert-service.test.ts` to verify:
  - Mock WhatsApp and Email notifications dispatch accurately.
  - Internal coordinator emails (`hitanshuac@gmail.com`) are blocked from 3rd-party email dispatch while vendor emails succeed.
  - `TMinusAlertService` triggers `communication.ts` when deadlines are critical.
- Run `npm run test`, `lint_applet`, and `compile_applet` to ensure zero TypeScript or runtime errors.
