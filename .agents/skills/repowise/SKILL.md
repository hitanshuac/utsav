---
name: repowise
description: Analyzes repository architecture, generates an AST-based dependency graph, maps module coupling, and explains cross-file imports for TypeScript/React.
---

# Repowise — TypeScript Architecture & Dependency Mapper

Use this skill when asked to "map the codebase", "trace dependencies", "find circular imports", or understand module coupling before a major refactor.

## Execution Workflow

1. **Dependency Analysis:**
   - Scan `package.json`, `tsconfig.json`, `server.ts`, and `src/`.
   - Identify module dependencies: UI components (`src/components/`) -> Planner Engine (`src/lib/plannerEngine.ts`) -> API Handlers (`server.ts`).
   - Flag any circular dependencies between client and server code.

2. **AST Surface Extraction:**
   - Map all public exports, interfaces, and function signatures.
   - Trace how `EventPlanInput` travels from the `MidFlightSimulator` sliders and `VendorAuditor` through `evaluateEventPlan()` to `/api/rebalance` and `/api/audit-vendor`.

3. **Coupling & Risk Report:**
   Output a compact ASCII graph:

   ```text
   server.ts ──► rebalanceHandler.ts / vendorAuditHandler.ts ──► deterministicFallback.ts
      │
      └──► dist/ (Static SPA) ──► App.tsx ──► R1..R4 Regions ──► plannerEngine.ts
   ```

   Highlight high-fan-in files (e.g., `src/types/planner.ts`, `src/lib/plannerEngine.ts`) where edits risk breaking multiple components.
