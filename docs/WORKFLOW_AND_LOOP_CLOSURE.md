# Communication, Event Logger & Loop Closure Workflow

## 1. Ephemeral Activity & Loop Logger (`src/lib/services/event-logger.ts`)

Event coordination requires tracking every notification sent and closing the loop (usually via phone call or vendor confirmation).

- **Storage**: 100% ephemeral in-memory reactive state (Zero-PII compliance, zero persistent disk/cookies/web storage).
- **Logged Channels**: `"whatsapp" | "email" | "call" | "system" | "loop_closed"`
- **Real-Time Cross-Component Sync**: Reactive in-memory subscription listener (`subscribeToEventLogger`) dispatches state updates so all dashboard widgets update immediately.

---

## 2. 3rd-Party Vendor Communication Rules (`lib/services/communication.ts`)

- **WhatsApp (`triggerMockWhatsApp`)**: Available for both 3rd-party vendors and internal coordinators.
- **Email (`triggerMockEmail`)**: **Restricted strictly to 3rd-party vendors**.
  - `isThirdPartyVendor(role)` blocks internal/managing roles (`Family Coordinator`, `Managing Lead`, `Internal`, `Organizer`, `Host`) and returns an explicit error if triggered.

---

## 3. Editable Edge-Case Templates (`PendingTaskStrip.tsx`)

When a coordinator expands a pending task row, they can choose from 4 pre-filled, human-editable templates before dispatching via WhatsApp or Email:

1. **`standard` (Standard Follow-up)**: Requests written confirmation of deliverables and schedule lock.
2. **`delay_30m` (+30m Delay Cascade)**: Notifies the vendor that the ceremony schedule shifted by +30 minutes and requests crew hold/adjustment without overtime penalty.
3. **`budget_surge` (+15% Guest Surge)**: Requests pro-rata buffer readiness for +15% floating guests at locked contract rates.
4. **`backup_sos` (Backup / SOS Check)**: Urgent 15-minute deadline verification before activating standby vendor.

---

## 4. Vendor Communication Frequency & Effectiveness (`VendorActivityFrequencyChart.tsx`)

Displayed inside the expanded detail view of tasks in both `PendingTaskStrip.tsx` and `TaskDependencyGraph.tsx`:
- Calculates per-vendor breakdown of **WhatsApp messages**, **Emails**, and **Calls**.
- Computes **Effectiveness Score (0–100%)**: Ratio of resolved/closed loops to total outreach attempts.
- Assigns **Cadence Status**:
  - `Loop Closed` (all open items resolved)
  - `Balanced Cadence` (healthy outreach-to-closure ratio)
  - `Needs Call Follow-up` (multiple digital messages sent without loop closure)
  - `No Outreach Yet` (zero logged interactions)
