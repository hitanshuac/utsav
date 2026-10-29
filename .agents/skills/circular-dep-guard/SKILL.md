---
name: circular-dep-guard
description: Scans the codebase for circular import dependencies using static analysis and AST tools to maintain high modularity and prevent runtime initialization bugs.
---

# Circular Dependency Guard Skill

Use this skill to detect, resolve, and prevent circular dependencies in TypeScript and JavaScript modules across `src/` and `server.ts`.

## Execution Workflow

1. **Static Graph Analysis**:
   - Trace all relative `import` statements across client and server files.
   - Construct a directed graph of module imports.
   - Run Tarjan's or Kosaraju's strongly connected components algorithm to find cycles.

2. **Verification Command**:
   ```bash
   npx --yes dpdm --no-warning --no-tree --exit-code circular:1 src/main.tsx server.ts
   ```
   Or run the automated scan in `test:compliance`.

3. **Resolution Strategy**:
   - Extract shared types into `src/types/planner.ts`.
   - Extract pure utility functions into dedicated leaf modules.
   - Ensure unidirectional data flow: Types -> Pure Engine Functions -> State / Services -> UI Components.
