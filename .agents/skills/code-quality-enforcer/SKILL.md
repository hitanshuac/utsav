---
name: code-quality-enforcer
description: Enforces 98-100/100 Static Code Quality by auditing file lengths (<=300 lines), cyclomatic complexity, zero 'any' types, zero empty catch blocks, zero committed JS bundles, TSDoc coverage, and ESLint zero-warning compliance.
---

# Code Quality Enforcer Skill (Target: 98–100 / 100)

Run this skill before any commit or hackathon submission to guarantee the AI Code Evaluator scores **Code Quality >= 97/100**.

## 1. Automated File-Length Audit (The 300-Line Ceiling)
Scan all `.ts` and `.tsx` files in `src/` and `server.ts`:
- **Pass Threshold:** Every logic/component file MUST be `<= 300` lines (excluding pure data dictionaries like `i18n.ts` and `presets.ts`).
- **Remediation Pattern:**
  - If `App.tsx > 300 lines`: Extract state orchestration and API handlers into `src/hooks/useAppController.ts`.
  - If `MainPanel.tsx > 300 lines`: Extract each tab/section into `src/components/sections/<SectionName>.tsx`.
  - If a complex visualization component `> 300 lines`: Separate the SVG/canvas renderer from the inspector/controls panel.
  - If `server.ts > 300 lines`: Extract route handlers into `src/server/routes.ts` and middleware into `src/server/middleware.ts`.
  - If `plannerEngine.ts > 300 lines`: Extract domain calculators into `src/lib/engine/<domain>.ts` and re-export.

## 2. Zero Committed Build Artifacts Audit
Verify `git ls-files` contains **ZERO** generated `.js` bundles in `api/` or `dist/`:
- `api/index.ts` must be a clean TypeScript module (`import app from '../server'; export default app;`).
- If a build script generates temporary `.js` files locally, add them to `.gitignore` and remove them from git tracking (`git rm --cached`).

## 3. Strict TypeScript & Error Handling Hygiene
Assert 0 occurrences across `src/` and `server.ts` of:
- `: any` or `as any` (use `unknown` with type guards or explicit interfaces in `src/types/`).
- `@ts-ignore` or `@ts-nocheck`.
- Empty `catch {}` blocks (always type as `catch (error: unknown)` and handle or document why fallback is triggered).
- Nested ternary expressions (`? ... : ... ? ... : ...`) inside JSX.

## 4. TSDoc & Clean Naming Standard
- Every exported function in `src/lib/` and every React component in `src/components/` MUST have a concise `/** ... */` TSDoc block describing its responsibility.
- Ensure `README.md` and `ARCHITECTURE.md` model names and file paths match the exact filenames in `src/`.
