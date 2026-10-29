---
name: qa-production-guard
description: Executes the automated resilience test harness (RES-1 to RES-14), verifies SAST and compliance scans, checks bundle budgets, and generates QA_REPORT.md with GO/NO-GO verdict.
---

# QA Production Guard Skill

Use this skill to run test suites, check security compliance, and issue the final production release verdict.

## Gates to Pass Before Release (Verdict = GO)
1. **Planner Resilience Test Suite (`npm run test:planner`)**:
   - `14/14` scenarios pass (`RES-1` through `RES-14`).
2. **Security & Compliance Scan (`npm run test:compliance`)**:
   - Zero `dangerouslySetInnerHTML`.
   - Zero hardcoded API secrets.
   - Zero client-side storage leaks (`localStorage`, `sessionStorage`, `document.cookie`).
   - JSON Schema contract drift check passes.
   - ARIA attributes verification passes.
3. **TypeScript Typecheck (`npm run lint`)**:
   - `tsc --noEmit` exits with code `0`.
4. **Bundle & Repo Budget Scan**:
   - Production JS bundle `< 150 kB` gzip.
   - Production CSS bundle `< 20 kB` gzip.
   - Total repository size `< 10 MB`.
5. **Documentation Sync**:
   - `docs/specs/QA_REPORT.md` written with complete evidence table.
