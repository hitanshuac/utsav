---
name: sre-refactor
description: 5-phase decomposition of God Objects and complex components into modular Single Responsibility Principle (SRP) units while preserving 100% of planner contracts and test passes.
---

# SRE-Compliant Refactor (TypeScript / React)

Use this skill when refactoring large components (e.g., `CommandCenter.tsx` or `server.ts`), reducing cyclomatic complexity, or modularizing functions with zero downtime.

## 5-Phase Decomposition Protocol

### Phase 1: Contract Baseline
- Identify the public interface/props of the target file.
- Verify existing tests pass before touching code: `npm run lint && npm run build`.

### Phase 2: Extraction Strategy
- Identify distinct responsibilities within the target (e.g., Budget Allocation Panel vs. Dependency Milestone List vs. Vendor Quote Auditor vs. Mid-Flight Simulator Sidebar).
- Plan target files in `src/components/` with strict input/output props.

### Phase 3: Surgical Modularization
- Extract child components/modules one at a time.
- Keep the parent component as a thin orchestrator adhering to the 4-region layout (`R1`, `R2`, `R3`, `R4`).
- Do NOT alter any deterministic calculation logic (`src/lib/plannerEngine.ts`) or data schemas (`src/types/planner.ts`).

### Phase 4: Typecheck & Compile Gate
- Execute `npm run lint` (`tsc --noEmit`).
- Ensure no implicit `any` and no broken import paths.

### Phase 5: Regression Verification
- Run the planner engine test harness (`npm run test:planner && npm run test:compliance`).
- Verify all resilience matrix scenarios (`RES-1` through `RES-14`) continue to pass.
