# MASTER HANDOVER & 99+/100 BLUEPRINT — Antigravity IDE & AI Studio

> **Post-Mortem Benchmark (Challenge 5 Verified Score: 96.62 / 100 — Global Rank #261 / 51,782):**
> - Problem Statement Alignment: **100 / 100**
> - Efficiency: **100 / 100**
> - Security: **99 / 100**
> - Testing: **99 / 100**
> - Accessibility: **98 / 100**
> - Code Quality: **88 / 100** *(Root causes identified & permanently locked out below)*

---

## 1. ROOT-CAUSE POST-MORTEM: WHY CODE QUALITY HIT 88/100 (AND HOW WE LOCK IT AT 98–100)

Automated AI Code Evaluators (Sonar/ESLint/AST-based graders) grade **Code Quality** on 6 objective static metrics. Here is why AI agents lose 10–12 points and the exact hard gates that prevent it:

| # | AI Agent Bad Habit (What Caused 88/100) | New Hard Architectural Rule (Enforced by `complianceScan.ts`) |
|---|---|---|
| **1** | **God Components & Monolith Files:** AI agents dump 700–860 lines into `App.tsx` or `MainPanel.tsx`. | **300-Line File Ceiling (`Scan 7`):** Every `.ts` and `.tsx` file in `src/` and `server.ts` MUST be **$\le 300$ lines** (excluding pure data/i18n dictionaries). Any component exceeding 250 lines must be split into `src/components/<feature>/` sub-components + custom hooks (`src/hooks/use*.ts`). |
| **2** | **Committed Build Artifacts (`api/index.js`):** Committing a 1,221-line esbuild `.js` bundle into Git caused the evaluator to grade generated JS and flag 100% code duplication. | **Zero Committed Bundles Rule (`Scan 7`):** NEVER commit compiled `.js` bundles in `api/` or `dist/`. For Vercel Serverless, use a 2-line native TypeScript entry `api/index.ts` (`import app from '../server'; export default app;`) so Vercel compiles TypeScript in the cloud and Git stays 100% clean TypeScript. |
| **3** | **High Cyclomatic Complexity & Long Functions:** AI writes 120-line render functions and deeply nested ternaries (`a ? b : c ? d : e`). | **Function Complexity Gate:** Max function length $\le 50$ lines; max cyclomatic complexity $\le 10$; zero nested ternaries. Extract view states into small lookup maps or sub-components. |
| **4** | **`as any` Shortcuts & Empty `catch {}` Blocks:** AI uses `(item as any)` or `catch {}` to silence TypeScript quickly. | **Zero-Shortcut AST Gate (`Scan 7`):** `complianceScan.ts` fails immediately if `: any`, `as any`, `@ts-ignore`, `@ts-nocheck`, or empty `catch {}` blocks exist anywhere in `src/` or `server.ts`. |
| **5** | **`npm run lint` Only Ran `tsc --noEmit`:** Typecheck alone ignores code smells and ESLint rules. | **Dual Lint Gate:** `npm run lint` MUST run `tsc --noEmit && eslint src/ server.ts --max-warnings 0`. |
| **6** | **Ghosted Backend / Fake AI Wiring:** During refactors, AI agents sometimes unhook `fetch('/api/...')` and only call local fallback functions. | **Live Full-Stack Bridge Check (`Scan 8`):** `complianceScan.ts` mathematically verifies that `src/` contains active `fetch('/api/...')` calls wired to the Express/Vercel backend AND that doc model names match `secure-llm-client.ts`. |

---

## 2. 6-TIER CORE AGENTIC GOVERNANCE (ALWAYS-ON RULES)

1. **Tier 0 (Deterministic Core & Live GenAI Bridge):**
   - All mathematical calculations, financial totals, and graph/timeline algorithms MUST run in pure deterministic TypeScript (`src/lib/`).
   - The React UI MUST actively call the backend GenAI endpoints (`fetch('/api/...')`) for qualitative reasoning, while maintaining an automatic `<10ms` deterministic fallback when offline or out of quota.
   - Use current live Gemini models (`gemini-3.5-flash` primary, `gemini-3.5-flash-lite` failover) and strip ambient system `GOOGLE_API_KEY` collisions in local dev.
2. **Tier 1 (Strict Code Quality & Modularity — The 300-Line Law):**
   - **File Size Cap:** No `.ts` or `.tsx` code file in `src/` or `server.ts` may exceed **300 lines** (excluding pure data dictionaries like `i18n.ts` and `presets.ts`). Decompose early into `src/components/<domain>/`, `src/hooks/use*.ts`, and `src/lib/`.
   - **Zero Committed Bundles:** NEVER commit compiled `.js` bundles (like `api/index.js` or `dist/`) to Git. Use a clean TypeScript `api/index.ts` re-export for Vercel.
   - **Zero Type Shortcuts:** Strictly zero `: any`, `as any`, `@ts-ignore`, or empty `catch {}` blocks. Every exported function and component MUST have a concise TSDoc (`/** ... */`) comment.
3. **Tier 2 (OWASP Security & Zero-PII):**
   - Zero `localStorage`, `sessionStorage`, `indexedDB`, or `document.cookie`.
   - Zero `dangerouslySetInnerHTML` or `eval()`. Render all dynamic/AI text via `<SafeNarrative />`.
   - Enforce HTTP security headers (CSP, HSTS, COOP, CORP, `nosniff`, `DENY`), 16kb JSON limit, 415 Content-Type guard, in-memory PII scrubbing, and XML prompt delimiters.
4. **Tier 3 (Solid-Surface Material 3 UI & WCAG 2.1 AA Accessibility):**
   - Zero `backdrop-filter`, zero `blur(`, zero `rgba(` in CSS. Use strictly opaque hex codes and CSS variables (`var(--c-...)`).
   - Every `<button>` must have an explicit `type="button"` or `type="submit"`. All decorative SVG icons must have `aria-hidden="true"`. All interactive controls must have explicit `aria-label` or `<label htmlFor>`.
5. **Tier 4 (Human-Centric Domain Copy — Zero Spec Jargon in UI):**
   - Never display internal spec codes (`ADR-1`, `Kahn's DAG`, `OWASP LLM01`, `RES-14`) in user-facing UI labels. Use natural, domain-authentic terminology.
6. **Tier 5 (Single-Branch & Repo Budget):**
   - Commit strictly to `main`. Keep total repository size `< 5 MB` (`< 150 kB` gzip JS, `< 20 kB` gzip CSS).

---

## 3. MASTER COMPLIANCE SCAN SUITE (8/8 SCANS)

In every project, `npm run test:compliance` (`scripts/complianceScan.ts`) runs 8 automated scans:

- **Scan 1: Zero-PII Static AST Scan** (0 localStorage, sessionStorage, indexedDB, document.cookie)
- **Scan 2: SAST Scan** (0 dangerouslySetInnerHTML, 0 eval, 0 hardcoded API keys)
- **Scan 3: Solid-Surface CSS Scan** (0 backdrop-filter, 0 blur(, 0 rgba()
- **Scan 4: Contract Drift Check** (`src/types/` matches JSON schemas 1:1)
- **Scan 5: ARIA & WCAG 2.1 AA Check** (`role="tablist"`, `role="tab"`, `aria-label`, `type="button"`, focus rings)
- **Scan 6: Bundle & Repo Size Budget** (< 150 kB gzip JS, < 20 kB gzip CSS, < 10 MB .git)
- **Scan 7: Code Quality & Modularity Guard**:
  - Asserts all `.ts`/`.tsx` files in `src/` (except `i18n.ts`/`presets.ts`) are $\le 320$ lines.
  - Asserts `git ls-files` tracks zero compiled `.js` bundles inside `api/`.
  - Asserts `: any`, `as any`, `@ts-ignore`, and empty `catch {}` blocks are 0 across `src/` and `server.ts`.
- **Scan 8: Live GenAI & Documentation Sync Guard**:
  - Asserts `src/` contains active `fetch('/api/` calls to the backend.
  - Asserts `README.md` and `ARCHITECTURE.md` match `src/lib/services/secure-llm-client.ts` Gemini model names.

---

## 4. HOW TO EXECUTE SUBMISSION CYCLES (TARGET: 99+/100)

1. **Attempt 1 (Mid-Week Diagnostic Check):** Push your full working MVP with all 8 scans passing (`<=300` lines per file, zero committed `.js` bundles, zero `any`, live Gemini 3.5 calls). Submit Attempt 1 and check the 6 sub-scores immediately.
2. **Attempt 2 (Targeted Sub-Score Polish):** If any of the 6 pillars is `< 98`, use AI Studio + Antigravity IDE to target *only* that pillar's static/runtime signals and submit Attempt 2.
3. **Attempt 3 (Reserve Buffer):** Keep Attempt 3 in reserve—never use Attempt 3 unless you are 100% sure it improves on Attempt 2, because only the final submission score stands!
