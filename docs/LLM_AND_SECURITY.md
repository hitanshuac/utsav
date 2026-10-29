# AI LLM Integration & MLSecOps Guardrails

## 1. Server-Side Interceptor (`lib/security/secure-llm-client.ts`)

All LLM calls are strictly isolated on the server side (`server.ts` -> `app/api/planner/route.ts` -> `SecureLLMClient`).

### Key Capabilities
1. **Environment Detection**:
   - Reads `process.env.GEMINI_API_KEY` or `process.env.GOOGLE_API_KEY`.
   - Rejects known template placeholders (`YOUR_GEMINI_API_KEY_HERE`, `YOUR_GEMINI_API_KEY`, `MY_GEMINI_API_KEY`) so placeholder strings never trigger malformed API calls.
2. **Model Selection & Automatic Failover**:
   - Primary model: `process.env.GEMINI_MODEL` (defaults to `gemini-3.8-flash`).
   - Automatic failover: If an external developer/judge API key tier returns `404` or `NOT_FOUND` for `gemini-3.8-flash`, `SecureLLMClient` automatically retries with `gemini-2.5-flash`.
3. **OWASP LLM01 (Prompt Injection Prevention)**:
   - `sanitizeInput()` caps input length at 800 characters, strips HTML tags (`/<[^>]*>?/gm`), and neutralizes raw structural delimiters (`{}[]`).
4. **OWASP LLM06 (Sensitive Information Disclosure)**:
   - `inspectOutput()` scans outbound model responses for API key signatures (`AIza...`, `sk-...`) and blocks the response if a credential pattern is detected.
5. **Deterministic Shield Fallback**:
   - Every `/api/planner` action (`audit_vendor`, `suggest_tradeoffs`, `parse_task`) wraps `SecureLLMClient` in a `try/catch` that falls back to a deterministic TypeScript parser (`deterministicVendorAuditFallback`, `deterministicTradeoffsFallback`).
   - Responses include `source: "gemini-live"` or `source: "deterministic-shield"` so the UI displays complete transparency.

---

## 2. API Endpoints

### `GET /api/health`
Returns live runtime and LLM configuration diagnostics:
```json
{
  "status": "ok",
  "nodeVersion": "v20.x.x",
  "timestamp": "2026-10-29T...",
  "llm": {
    "configured": true,
    "model": "gemini-3.8-flash",
    "provider": "Google Gemini (@google/genai)",
    "source": "gemini-live",
    "message": "Live Gemini inference active (Primary: gemini-3.8-flash)"
  }
}
```

### `POST /api/planner`
Accepts discriminated union payloads validated by `PlannerApiRequestSchema` (`lib/types.ts`):
1. `action: "audit_vendor"` — Extracts `vendorName`, `quotedAmount`, `detectedInclusions`, `flaggedHiddenCosts`, and up to 3 `negotiationQuestions`.
2. `action: "suggest_tradeoffs"` — Generates 2 strategic budget rebalancing options with category delta adjustments.
3. `action: "parse_task"` — Parses natural language task input into structured `title`, `category`, `deadlineDaysBeforeEvent`, and `urgency`.
