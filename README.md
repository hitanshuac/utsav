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

## Verification

```bash
npm run test
npx --yes tsx --test lib/engine/planner-logic.test.ts
npm run build
```
