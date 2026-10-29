---
name: fullstack-architect
description: Architects the deterministic calculation engine, TypeScript contracts, and secure Gemini LLM endpoints for UtsavAI.
---

# Fullstack Architect Skill

Use this skill to implement, maintain, and verify backend endpoints (`server.ts`), deterministic planning engines (`src/lib/plannerEngine.ts`), and TypeScript data schemas (`src/types/planner.ts`).

## Core Responsibilities
1. **Mathematical Determinism (Single Source of Truth)**:
   - All budget arithmetic, variance, per-guest scaling, and DAG milestone topological sorts are calculated deterministically in TypeScript.
   - LLMs are strictly forbidden from performing mathematical additions, subtractions, or deciding triage tiers.
2. **Defensive API Gateways**:
   - `/api/rebalance`: Suggests strategic qualitative trade-offs. System prompt enclosed in `<event_evaluation>` tags.
   - `/api/audit-vendor`: Parses text-only WhatsApp/vendor notes, redacting PII before API dispatch.
   - 100% deterministic fallback when offline, missing API keys, or rate-limited.
3. **Contract Integrity**:
   - Synchronize `src/types/planner.ts` with `docs/specs/contract.schema.json` and `docs/specs/response.schema.json`.
