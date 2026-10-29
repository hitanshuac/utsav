# UtsavAI — Celebration & Event Execution Engine

> **Hack2Skill · Prompt Wars Virtual · Challenge 5: Celebration & Event Planner**  
> *Deterministic Budget & Dependency Execution Engine with Strategic GenAI Trade-Off Resolution & Vendor Quote Auditing*

---

## 1. Vertical, Persona & Problem Statement Alignment
- **Chosen Vertical:** Celebration and Event Planner (Challenge 5).
- **Target Personas:**
  1. **Family Host (`family_host`):** Planning high-stakes family celebrations (e.g., ₹8,00,000 wedding for 200 guests) requiring clear trade-offs between food quality, guest count, and decor.
  2. **Wedding Coordinator (`wedding_coordinator`):** Tracking critical-path vendor dependencies and auditing unstructured vendor quotations for hidden charges.
  3. **Community Organizer (`community_organizer`):** Coordinating tight-budget cultural or neighborhood gatherings with volunteer task sequencing.

### Moving Beyond Inspiration to Execution
Generic AI wrappers output static lists of party themes. **UtsavAI** manages the interconnected moving parts of real-world event execution:
- **100% Deterministic Budget & DAG Engine (`src/lib/plannerEngine.ts`):** Computes exact category allocations, per-guest variable scaling (catering/logistics vs. fixed venue costs), budget deficits, and topological milestone scheduling.
- **Mid-Flight Re-Planning Simulator:** Users dynamically adjust `Guest Count`, `Budget Cap`, and `Days to Event` via interactive sliders. The engine recalculates budget deficits and shifted deadlines in `<5ms` without resetting user state.
- **Strategic GenAI Trade-Off Advisor (`/api/rebalance`):** When budget overruns occur (e.g., +20% cost surge or +50 added guests), Gemini 2.5 Flash proposes structured compromise strategies tailored to the user's priority vibe (`Experience First`, `Budget Strict`, or `Balanced`).
- **Lightweight Text-Only Vendor Quote Auditor (`/api/audit-vendor`):** Parses pasted WhatsApp notes or rough vendor quotes in `<200 tokens`, flagging omitted clauses (GST, generator backup, cleaning fees) and generating 1-click pre-filled WhatsApp negotiation links (`wa.me`) and RFC 5545 `.ics` calendar files.

---

## 2. Security & Compliance Architecture

### SAST & OWASP Top 10 Compliance (`.agents/skills/sast-compliance/SKILL.md`)
- **Zero XSS & Safe Rendering:** Automated AST scans enforce zero `dangerouslySetInnerHTML` usage (`SafeNarrative.tsx` renders all AI outputs safely) and zero hardcoded credentials.
- **Hardened HTTP Security Headers:** Enforced in `server.ts` (`Content-Security-Policy`, `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`).
- **Prompt Injection Defense (OWASP LLM01):** All payloads sent to `@google/genai` are isolated inside structural `<event_evaluation>...</event_evaluation>` XML delimiters with system instructions strictly separated.
- **Network Boundary PII Scrubbing:** `/api/rebalance` and `/api/audit-vendor` scrub phone numbers, email addresses, and bank account numbers in memory prior to outbound LLM calls.
- **Zero-PII Ephemeral State:** Zero accounts, zero cookies, zero `localStorage`/`sessionStorage`, and zero database persistence.

### Master Sync Orchestration (`.agents/skills/master-sync/SKILL.md`)
Multi-phase engineering governance is enforced across 8 sequential phases:
1. **Phase 1: Pre-Flight & AST/Dead-Code Sanitization** (Import cycle checks, unused export pruning).
2. **Phase 2: Defensive Contracts & Schema Integrity** (`contract.schema.json` & `response.schema.json` 1:1 sync with `src/types/planner.ts`).
3. **Phase 3: SAST, Secret Scanning & Dependency Audit** (`npm audit`, AST scans, zero storage leaks).
4. **Phase 4: Planner Engine & Resilience Verification** (14/14 automated planner & DAG test harness passes).
5. **Phase 5: Build Gate & Bundle Budget Scan** (JS < 150 kB gzip, CSS < 20 kB gzip, total repo < 10 MB).
6. **Phase 6: Documentation & Spec Synchronization** (`PRODUCT_SPEC.md`, `DESIGN_SPEC.md`, `03_SECURITY.md`, `DECISIONS.md`, `QA_REPORT.md`).
7. **Phase 7: Conversational Error Harvesting & Rule Hardening**.
8. **Phase 8: Checkpoint & Deployment Readiness** (Single `main` branch enforcement).

---

## 3. Assumptions Made
1. **Estimate vs. Confirmed Distinction:** All initial AI or benchmark budget figures are explicitly marked with `isEstimate: true` until a verified vendor quote is locked by the user.
2. **Variable vs. Fixed Cost Scaling:** Catering and logistics scale linearly with guest count deltas, whereas Venue, Photography, and Core Decor remain step-fixed unless manually reallocated.
3. **Zero Paid Third-Party Gateways:** WhatsApp vendor outreach (`https://wa.me/`) and Calendar milestone exports (`.ics` data URIs) execute via native client protocols, guaranteeing zero external API costs and 100% reliability during judge evaluation.

---

## 4. Quickstart & Local Execution

**Prerequisites:** Node.js 20+

```bash
# 1. Install dependencies
npm install

# 2. Configure environment variables (optional; deterministic fallback runs offline without key)
cp .env.example .env
# Add GEMINI_API_KEY="your-api-key" to .env

# 3. Start development server (Port 3000)
npm run dev

# 4. Run automated verification suites
npm run test:planner       # 14/14 deterministic budget, scaling & DAG milestone tests
npm run test:compliance    # 6/6 automated SAST, Zero-PII, ARIA & schema contract scans
npm run test               # Execute complete test suite

# 5. Typecheck & production build
npm run lint               # tsc --noEmit
npm run build              # Production Vite bundle (<150 kB gzip)
npm start                  # Production Express server on port 3000
```

---

## 5. Specification & Handover Index

| Document | Purpose | Standard |
|---|---|---|
| [PRODUCT_SPEC.md](docs/specs/PRODUCT_SPEC.md) | Event execution taxonomy, personas, urgency bands, and requirement IDs (`PM-n`) | Challenge 5 Rubric |
| [DESIGN_SPEC.md](docs/specs/DESIGN_SPEC.md) | 4-Region solid-surface tokens, layout grid, and UX criteria (`UX-n`) | WCAG 2.1 AA |
| [03_SECURITY.md](docs/specs/03_SECURITY.md) | Zero-Auth, Secret Hygiene, XML Delimiters, Network Boundary PII Guards | OWASP Top 10 / LLM Top 10 |
| [DECISIONS.md](docs/specs/DECISIONS.md) | Architectural Decision Records (ADR-1 through ADR-8) | Architecture |
| [QA_REPORT.md](docs/specs/QA_REPORT.md) | Resilience matrix (16 scenarios), build gate, compliance scans, GO verdict | Release Gate |
| [HANDOVER.md](HANDOVER.md) | Antigravity IDE 4-persona delivery pipeline & skill integration | Antigravity IDE |
