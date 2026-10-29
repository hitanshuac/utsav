---
name: contract-drift-guard
description: Compares TypeScript interface definitions with JSON Schema contracts to prevent silent API drift between client, server, and documentation.
---

# Contract Drift Guard Skill

Use this skill whenever modifying `EventPlanInput`, `PlannerEvaluationResult`, `VendorAuditResult`, or API endpoints.

## Execution Workflow
1. Inspect `src/types/planner.ts` and `docs/specs/contract.schema.json`.
2. Verify that every key in the TypeScript interface exists in the JSON Schema `properties` definition with matching types (`boolean`, `number`, `string`, `enum`, `array`).
3. Verify that `docs/specs/response.schema.json` matches the AI trade-off advisor and vendor audit response structures.
4. Fail with an explicit diff if an interface contains unmapped or mismatched fields.
