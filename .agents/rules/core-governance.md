---
trigger: always_on
description: Core agentic governance enforcing 99+/100 across Problem Alignment, Code Quality, Security, Efficiency, Testing, and Accessibility
---

# Core Agentic Governance (99+/100 Hackathon Architecture Standard)

## 1. 6-Tier Safety & Quality Hierarchy
1. **Tier 0 (Deterministic Core & Live GenAI Bridge):**
   - All mathematical calculations, financial totals, and graph/timeline algorithms MUST run in pure deterministic TypeScript (`src/lib/`).
   - The React UI MUST actively call the backend GenAI endpoints (`fetch('/api/...')`) for qualitative reasoning, while maintaining an automatic `<10ms` deterministic fallback when offline or out of quota.
   - Use current live Gemini models (`gemini-3.5-flash` primary, `gemini-3.5-flash-lite` failover) and strip ambient system `GOOGLE_API_KEY` collisions in local dev.
2. **Tier 1 (Strict Code Quality & Modularity — The 300-Line Law):**
   - **File Size Cap:** No `.ts` or `.tsx` code file in `src/` or `server.ts` may exceed **300 lines** (excluding pure data/i18n dictionaries like `i18n.ts` and `presets.ts`). Decompose early into `src/components/<domain>/`, `src/hooks/use*.ts`, and `src/lib/`.
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

## 2. Environment Lock
- Workspace Stack: **Node.js 20+ · Express · React 19 · TypeScript · Vite · Tailwind CSS v4 + Reference CSS (`tokens.css`, `layout.css`, `components.css`)**.
- Never generate Python, FastAPI, Ruff, Pytest, or DuckDB files in this repository.

## 3. SRE Inner/Outer Verification Gate
After every multi-file code edit:
1. **Inner Loop:** Run `npm run lint` (`tsc --noEmit`) and fix any type errors immediately.
2. **Outer Loop:** Run `npm run build`, `npm run test:planner`, and `npm run test:compliance` to confirm 8/8 scans pass before reporting completion.
