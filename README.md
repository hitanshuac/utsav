# Celebration & Event Planner (`UtsavLedger`)

Deterministic Celebration & Wedding Coordination Command Center built for Family Event Coordinators and Community Celebration Organizers.

## Key Capabilities

1. **Deterministic Budget & Variance Engine (`lib/engine/budget-math.ts`)**:
   - Executes all budget summations, variance calculations, and per-guest scaling strictly in TypeScript arithmetic.
   - Dynamically scales variable guest categories (`catering`, `logistics`) when guest headcount changes while holding fixed contracts (`venue`, `photography`) constant.
   - Flags unverified vendor line items as `Estimates` until explicitly verified.

2. **MLSecOps `SecureLLMClient` Interceptor (`lib/security/secure-llm-client.ts` & `app/api/planner/route.ts`)**:
   - Zero client-side LLM SDK imports. All requests route through `/api/planner`.
   - Enforces OWASP LLM01 pre-flight sanitization (HTML tag stripping, structural delimiter removal, 800-char input cap) and OWASP LLM06 post-flight credential leak scanning.
   - Validates all responses against strict Zod schemas (`VendorAuditResultSchema`, `TradeoffStrategiesResponseSchema`).

3. **Plain-Text Vendor Quote Auditor & WhatsApp Dispatcher (`components/vendor/`)**:
   - Normalizes rough plain-text vendor notes into structured inclusions, flagged hidden costs (unbundled 18% GST, cleaning fees, minimum pax guarantees, overtime rates), and up to 3 negotiation questions.
   - Generates 1-click `wa.me` negotiation links and syncs audited quotes directly into the budget ledger.

4. **Topological Milestone Dependency Tracker & RFC 5545 Calendar Export (`lib/engine/dependency-graph.ts` & `lib/engine/calendar-utils.ts`)**:
   - Uses Kahn's topological sorting algorithm to order tasks by prerequisite completion and deadline proximity.
   - Exports RFC 5545 compliant `.ics` calendar files and 1-click Google Calendar links.

## Environment Setup

1. Copy the example environment template:
   ```bash
   cp .env.example .env
   ```
2. Open `.env` and insert your Gemini API key:
   ```env
   GEMINI_API_KEY="your-gemini-api-key"
   ```
   *(Note: `.env` is listed in `.gitignore` so your personal key will never be tracked or committed to Git).*

## Hackathon Judges & Environment Recreation

For the complete 60-second setup and evaluation guide, see [`JUDGES_REPRODUCIBILITY_GUIDE.md`](./JUDGES_REPRODUCIBILITY_GUIDE.md).

- **Diagnostics Endpoint**: `http://localhost:3000/api/health` (inspects Node runtime, Gemini API key connectivity, and active model)
- **Deterministic Shield Fallback**: If no API key is provided, the app automatically runs in deterministic fallback mode with 100% feature coverage.

## Verification

```bash
# Run complete test suite (25 tests covering budget math, graphs, alerts, and logger)
npm run test

# Build production bundle
npm run build
```
