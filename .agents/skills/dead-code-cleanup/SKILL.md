---
name: dead-code-cleanup
description: Identifies and safely removes unused files, dead exports, unreachable code branches, and obsolete types using TypeScript AST verification with zero false positives.
---

# Dead-Code Cleanup (TypeScript / React Edition)

Use this skill when asked to "clean up dead code", "remove unused imports", "prune unused types", or "prepare the repo for production release".

## Safety Principles
- **Tier 0 Rule:** NEVER delete deterministic budget or DAG scheduling rules in `src/lib/plannerEngine.ts` or requirement types in `src/types/planner.ts` even if currently unreferenced by the UI (they are required by the test harness).
- **Zero-False-Positive Guarantee:** Always verify pruning against `tsc --noEmit`.

## Execution Workflow

1. **Scan for Unused Exports & Dependencies:**
   - Run `npx --yes knip --no-exit-code` or inspect `tsconfig.json` for unused locals (`noUnusedLocals`, `noUnusedParameters`).
   - Search for exported types, components, or helper functions that have zero references across `src/` and `server.ts`.

2. **Prune Candidate Review:**
   - Inspect candidates: unused CSS classes, legacy placeholder components, orphaned mock fixtures, dead icons from `lucide-react`.

3. **Surgical Removal:**
   - Remove unused imports.
   - Delete verified orphan files after explicit user confirmation.
   - Remove dead conditional branches.

4. **Verification Gate:**
   - Run `npm run lint` (`tsc --noEmit`). Exit code MUST be `0`.
   - Run `npm run build`. Bundle size MUST decrease or remain neutral.
