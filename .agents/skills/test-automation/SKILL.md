---
name: test-automation
description: Generates automated planner unit tests, DAG dependency validation suites, API contract tests, resilience regression scenarios, and mock fixtures for Node.js and TypeScript.
---

# Test Automation Skill (TypeScript / Node Edition)

Use this skill when asked to "write unit tests", "expand test coverage", "add resilience scenarios", or "verify edge cases" for event planning rules and API routes.

## Test Pyramid Requirements

1. **Tier 1: Deterministic Planner Engine Unit Tests (`src/lib/plannerEngine.ts`):**
   - Test boundary values for budget variance:
     - Total Allocated `₹7,99,999` vs Cap `₹8,00,000` (`PASS -> ON_TRACK`)
     - Total Allocated `₹8,00,001` vs Cap `₹8,00,000` (`FAIL -> CRITICAL_OVERRUN`, deficit `₹1`)
   - Test Per-Guest Variable Scaling:
     - Guest increase `+25%` (`200 -> 250` pax) scales `catering` and `logistics` by `1.25x` while keeping `venue` and `photography` fixed.
   - Test Milestone Dependency DAG & Bottlenecks:
     - Event date pulled in to `21 days` when `Lock Venue` requires `30 days` lead time triggers `TIMELINE_BOTTLENECK` in `<5ms`.
     - Verify topological sort places parent tasks (`Lock Venue`) strictly before dependent tasks (`Finalize Caterer`, `Send Invitations`).

2. **Tier 2: API Contract Tests (`/api/rebalance` & `/api/audit-vendor`):**
   - Test valid overrun evaluation -> `200 OK` + structured trade-off strategies + narrative.
   - Test valid rough vendor note -> `200 OK` + normalized inclusions, flagged hidden costs, and 3 negotiation questions.
   - Test missing `GEMINI_API_KEY` -> `200 OK` + deterministic fallback trade-off strategy and vendor checklist (`provenance: 'fallback'`).
   - Test rate limiting -> 16th request within 1 minute returns `429 Too Many Requests`.
   - Test malformed body / negative budget cap -> `400 Bad Request` (`ValidationError`).

3. **Tier 3: Synthetic Event Cohort Benchmarks:**
   - Execute the 100-event simulation benchmark suite and assert:
     - `0` unhandled exceptions.
     - `100%` classification matching expected planning status tier.
     - Execution time for all 100 event re-calculations under `50ms`.

## Verification Command
Run tests via:
```bash
npm run lint && npm run test:planner && npm run test:compliance
```
