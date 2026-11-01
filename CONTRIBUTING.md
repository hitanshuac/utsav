# Contributing to UtsavAI (उत्सव AI)

Thank you for contributing to UtsavAI. All contributions must adhere to our deterministic calculation standards, zero-PII storage invariants, and solid-surface UI architecture.

---

## 1. 4-Stage Antigravity Delivery Pipeline
Development follows the linear persona pipeline:
1. **`pm-product-strategist`**: Product taxonomy, personas (`family_host`, `wedding_coordinator`, `community_organizer`), and testable requirements (`PM-n` in `docs/specs/PRODUCT_SPEC.md`).
2. **`ux-reference-designer`**: Solid-surface Material 3 UI tokens and 4-region layout specifications (`UX-n` in `docs/specs/DESIGN_SPEC.md`).
3. **`fullstack-architect`**: Deterministic calculations in `src/lib/plannerEngine.ts`, schema contracts (`docs/specs/contract.schema.json`), and Express endpoints.
4. **`qa-production-guard`**: Automated resilience matrix (`RES-1` to `RES-14`), compliance scans, and bundle budgets in `docs/specs/QA_REPORT.md`.

---

## 2. Core Engineering Invariants
1. **Deterministic Single Source of Truth:**
   - All budget arithmetic, headcount scaling, and Kahn's DAG sorting MUST execute synchronously in `src/lib/plannerEngine.ts` in `<5ms`.
   - Never compute business arithmetic inside UI components or LLM prompts.
2. **Zero-PII Storage Policy:**
   - Never reference `localStorage`, `sessionStorage`, `indexedDB`, or `document.cookie` anywhere in `src/`. State must remain strictly ephemeral in-memory.
3. **Safe Rendering:**
   - Render all AI-generated or dynamic text through `<SafeNarrative />`. Never use raw DOM HTML injection properties or dynamic code evaluation.
4. **Solid-Surface Material 3 Styles:**
   - Use opaque hex colors and design tokens from `src/styles/tokens.css`.
   - Never introduce `backdrop-filter`, `blur(`, or `rgba(` in CSS stylesheets.

---

## 3. Mandatory 5 Verification Commands
Before submitting pull requests or pushing changes, verify that all 5 verification gates pass with exit code 0:

```bash
# 1. TypeScript Strict Typecheck
npm run lint

# 2. Production Vite Bundle Build (<150 kB gzip JS, <20 kB gzip CSS)
npm run build

# 3. Deterministic Planner & DAG Resilience Test Harness (14/14 Scenarios)
npm run test:planner

# 4. Security, Privacy & Contract Compliance Scans (6/6 Scans)
npm run test:compliance

# 5. Vitest Full Regression Suite (Unit & Route Tests)
npm test
```
