# AI LLM Integration & MLSecOps Guardrails

## 1. Server-Side Interceptor (`src/lib/services/secure-llm-client.ts`)

All LLM calls are strictly isolated on the server side (`server.ts` -> `/api/rebalance`, `/api/audit-vendor`, and `/api/planner` -> `SecureLLMClient`).

### Key Capabilities
1. **Environment Detection**:
   - Reads `process.env.GEMINI_API_KEY` or `process.env.GOOGLE_API_KEY`.
   - Rejects known template placeholders (`YOUR_GEMINI_API_KEY_HERE`, `YOUR_GEMINI_API_KEY`, `MY_GEMINI_API_KEY`) so placeholder strings never trigger malformed API calls.
2. **Model Selection & Automatic Failover**:
   - Primary model: `process.env.GEMINI_MODEL` (defaults to `gemini-3.5-flash`).
   - Automatic failover: If an external developer/judge API key tier returns `404`, `503` (high demand), or `NOT_FOUND` for `gemini-3.5-flash`, `SecureLLMClient` automatically retries with `gemini-3.5-flash-lite`.
3. **OWASP LLM01 (Prompt Injection Prevention)**:
   - `sanitizeInput()` caps input length at 800 characters, strips HTML tags (`/<[^>]*>?/gm`), and neutralizes raw structural delimiters (`{}[]`).
4. **OWASP LLM06 (Sensitive Information Disclosure)**:
   - `inspectOutput()` scans outbound model responses for API key signatures (`AIza...`, `sk-...`) and blocks the response if a credential pattern is detected.
5. **Deterministic Shield Fallback**:
   - Every AI action (`/api/audit-vendor`, `/api/rebalance`, `/api/planner`) wraps `SecureLLMClient` in a `try/catch` that falls back to a deterministic TypeScript parser (`preAuditVendorQuote`, `generateDeterministicTradeoffs`).
   - Responses include `source: "gemini-live"` or `source: "deterministic-shield"` so the UI displays complete transparency.

---

## 2. API Endpoints

### `GET /api/health`
Returns live runtime and LLM configuration diagnostics:
```json
{
  "status": "ok",
  "nodeVersion": "v20.x.x",
  "timestamp": "2026-10-30T...",
  "llm": {
    "configured": true,
    "model": "gemini-3.5-flash",
    "provider": "Google Gemini (@google/genai)",
    "source": "gemini-live",
    "message": "Live Gemini 3.5 inference active (Primary: gemini-3.5-flash)"
  }
}
```

### `POST /api/rebalance`
Accepts current budget allocations, variance, persona, and total budget cap, returning 2 balanced qualitative trade-off strategies with exact delta amounts.

### `POST /api/audit-vendor`
Accepts raw unstructured vendor quotes, returning structured vendor name, quoted amount, detected inclusions, flagged hidden costs, and negotiation questions.

### `POST /api/planner` (Backward-Compatible Action Route)
Accepts discriminated union payloads validated by `PlannerApiRequestSchema` (`src/types/schemas.ts`):
1. `action: "audit_vendor"` — Extracts `vendorName`, `quotedAmount`, `detectedInclusions`, `flaggedHiddenCosts`, and up to 3 `negotiationQuestions`.
2. `action: "suggest_tradeoffs"` — Generates 2 strategic budget rebalancing options with category delta adjustments.
3. `action: "parse_task"` — Parses natural language task input into structured `title`, `category`, `deadlineDaysBeforeEvent`, and `urgency`.
