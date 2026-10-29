---
name: master-sync
description: Master 8-Phase Orchestration Skill that validates AST integrity, enforces schema contracts, executes SAST/dependency scans, verifies planner engine test suites, checks bundle budgets (<10MB repo), synchronizes documentation, harvests session errors, and guarantees safe deployment readiness.
---

# Master Sync Skill (8-Phase Orchestration Protocol)

This skill is the top-level orchestrator for synchronizing, validating, and securing the **UtsavAI Celebration & Event Planner** codebase for Prompt Wars Challenge 5.

Execute all 8 phases in strict sequential order. Do NOT skip gates.

```mermaid
graph TD
    P1[Phase 1: Pre-flight & AST Sanitization] --> P2[Phase 2: Defensive Contracts & Schemas]
    P2 --> P3[Phase 3: SAST, Secrets & Audit]
    P3 --> P4[Phase 4: Planner Engine & Resilience Suite]
    P4 --> P5[Phase 5: Build Gate & Bundle Budget]
    P5 --> P6[Phase 6: Documentation & Spec Sync]
    P6 --> P7[Phase 7: Conversational Error Harvesting]
    P7 --> P8[Phase 8: Checkpoint & Deployment Readiness]
```

---

## Phase 1: Pre-Flight & AST/Dead-Code Sanitization
1. **Repository Sanitation**: Scan root and `src/` for orphaned scratch files, temporary logs, or mock data blobs that risk breaching the 10 MB repo cap.
2. **Circular Dependency Verification**: Execute `runCircularDepScan()` to ensure zero circular dependencies across client and server modules.
3. **Dead Code Elimination**: Review exports and unused types. Never delete deterministic calculation functions in `src/lib/plannerEngine.ts` or tests without explicit user confirmation.

## Phase 2: Defensive Contracts & Schema Integrity
1. **Schema vs TypeScript Synchronization**: Run `runContractDriftScan()` to verify that `docs/specs/contract.schema.json` and `docs/specs/response.schema.json` match `src/types/planner.ts` 1:1 with zero drift.
2. **Fail-Fast Input Validation**: Verify that `/api/rebalance` and `/api/audit-vendor` enforce strict JSON schema validation and return HTTP 400 (`ValidationError`) on malformed payloads.

## Phase 3: SAST, Secret Scanning & Dependency Vulnerability Audit
1. **Dependency Audit**: Run `npm audit` and assert zero known vulnerabilities (`found 0 vulnerabilities`).
2. **Static Application Security Testing (SAST)**:
   - Verify zero occurrences of `dangerouslySetInnerHTML` in UI components (must use `SafeNarrative.tsx`).
   - Verify zero hardcoded API keys or credentials in source code.
   - Assert all HTTP security headers (`Content-Security-Policy`, `nosniff`, `DENY`, `strict-origin-when-cross-origin`) are enforced in `server.ts`.
3. **Zero-PII Storage Leakage**: Run `runZeroPiiScan()` to guarantee zero usage of `localStorage`, `sessionStorage`, `indexedDB`, or `document.cookie`.

## Phase 4: Planner Test Suite & Resilience Verification
1. **Automated Planner Test Harness**: Run `npm run test:planner`.
2. **Assertion Gate**: All 14/14 planner resilience scenarios MUST pass (100% pass rate):
   - `RES-1`: Exact Budget Summation & Zero Variance Baseline (`ON_TRACK`).
   - `RES-2`: 20% Budget Overrun Detection & Deficit Flagging (`CRITICAL_OVERRUN`).
   - `RES-3`: Mid-Flight Guest Count Surge (+50 Guests) Linear Catering Scaling.
   - `RES-4`: Fixed Venue & Photography Invariance Under Guest Count Changes.
   - `RES-5`: Mid-Flight Date Pull-In (-14 Days) Critical Path Bottleneck Detection (`TIMELINE_BOTTLENECK`).
   - `RES-6`: Topological Sort of Milestone Dependencies (Venue Lock -> Catering -> Invites).
   - `RES-7`: Cyclic Dependency Guard & Graceful DAG Recovery.
   - `RES-8`: Unverified Vendor Quote Clause Detection (Missing GST, Generator, Cleaning Fees).
   - `RES-9`: Estimate vs. Confirmed Quote Provenance Tracking.
   - `RES-10`: Offline / Missing `GEMINI_API_KEY` Deterministic Trade-Off Fallback (`<10ms`).
   - `RES-11`: Rate-Limit (HTTP 429) Circuit Breaker & Graceful UI Banner Fallback.
   - `RES-12`: RFC 5545 `.ics` Calendar Export Payload Conformance.
   - `RES-13`: WhatsApp (`wa.me`) Encoded Negotiation URL Sanitization.
   - `RES-14`: 100-Event Synthetic Stress Benchmark Execution (`<50ms`).

## Phase 5: Build Gate, Repo Size & Bundle Performance Budget
1. **TypeScript Typecheck**: Run `npm run lint` (`tsc --noEmit`) to verify 0 type errors.
2. **Production Bundle Compilation**: Run `npm run build` via Vite.
3. **Gzip & Repo Footprint Budget**: Execute `runBundleBudgetScan()`:
   - Primary JS bundle: `< 150 kB` gzip.
   - Primary CSS bundle: `< 20 kB` gzip.
   - Total Git repository size: `< 10 MB` (`git count-objects -vH`).

## Phase 6: Documentation & Spec Synchronization
Synchronize all repository documentation and specifications:
- `docs/specs/PRODUCT_SPEC.md` (`PM-n` traceability).
- `docs/specs/DESIGN_SPEC.md` (`UX-n` design system tokens).
- `docs/specs/03_SECURITY.md` (Zero-Auth, Secret Hygiene, Network Boundary PII Guards).
- `docs/specs/DECISIONS.md` (ADR-1 through ADR-6).
- `docs/specs/QA_REPORT.md` (Conformance table, compliance scans, GO/NO-GO verdict).
- `README.md` & `HANDOVER.md`.

## Phase 7: Conversational Error Harvesting & Rule Hardening
1. Review the conversation trajectory and test logs for any edge cases, validation failures, or lint issues encountered during development.
2. Formulate explicit regression tests or type guards to prevent recurrence.
3. Harden the test harness (`scripts/testHarness.ts`) with new negative test assertions.

## Phase 8: Safe Checkpoint & Deployment Readiness
1. **Zero-PII OPSEC Sanitization**: Confirm no personal data, machine-specific paths, or API keys leaked into commit diffs or temporary artifacts.
2. **Single-Branch Verification**: Confirm `git branch -a` shows strictly `main`.
3. **Deployment Port Compliance**: Confirm server listens on port 3000 (`process.env.APP_PORT || 3000`).
4. Report final pipeline synchronization verdict to the user.
