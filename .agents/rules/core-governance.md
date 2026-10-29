---
trigger: always_on
description: Core agentic governance adapted for UtsavAI (Prompt Wars Challenge 5: Celebration & Event Planner)
---

# Core Agentic Governance (UtsavAI Event Execution Engine)

## 1. 5-Tier Safety & Conflict Hierarchy
When instructions conflict, resolve strictly in this order:
- **Tier 0 (Mathematical Determinism, Single-Branch & Zero-PII):** Never persist PII, never create databases/cookies, never create secondary git branches (commit strictly to `main`), and never allow an LLM to compute budget sums, date arithmetic, or planning triage tiers (`CRITICAL_OVERRUN`, `TIMELINE_BOTTLENECK`, `VENDOR_CLARIFICATION`, `ON_TRACK`).
- **Tier 1 (Non-Destructive Execution):** Never delete existing planner rules (`src/lib/plannerEngine.ts`), resilience tests, or HTTP security headers (`server.ts`) without explicit user approval.
- **Tier 2 (Defensive Contracts):** Enforce strict TypeScript types and JSON schema validation (`ValidationError`) at every API boundary; always maintain a `<10ms` deterministic fallback when offline, missing `GEMINI_API_KEY`, or rate-limited.
- **Tier 3 (Anti-Over-Engineering / 7-Step YAGNI Ladder):** Keep repository size strictly `< 10 MB`. Prefer native TypeScript/React/SVG over new npm dependencies. Never install external libraries for tasks solvable in `<50` lines of standard code.
- **Tier 4 (Anti-AI-Slop Solid-Surface UI):** Enforce solid surfaces defined in `src/styles/tokens.css` (`--c-canvas`, `--c-surface`, `--c-tonal-bg`). Never use `backdrop-filter`, `blur()`, `rgba()` alpha surfaces, or `dangerouslySetInnerHTML`.

## 2. Environment Lock
- Workspace Stack: **Node.js 20+ · Express · React 19 · TypeScript · Vite · Tailwind CSS v4 + Reference CSS (`tokens.css`, `layout.css`, `components.css`)**.
- Never generate Python, FastAPI, Ruff, Pytest, or DuckDB files in this repository.

## 3. SRE Inner/Outer Verification Gate
After every multi-file code edit:
1. **Inner Loop:** Run `npm run lint` (`tsc --noEmit`) and fix any type errors immediately.
2. **Outer Loop:** Run `npm run build` and the planner engine test harness (`npm run test:planner && npm run test:compliance`) to confirm 0 regressions before reporting completion.
