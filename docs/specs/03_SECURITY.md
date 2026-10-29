# Security & Compliance Specification (03_SECURITY.md)

> **Hack2Skill Prompt Wars Virtual — Challenge 5**  
> Status: Released & Verified · Version: 1.0.0

---

## 1. Zero-PII Ephemeral State Architecture (ADR-1)
UtsavAI operates on a **Zero-PII, in-memory state model**:
- **Zero Client-Side Storage**: No `localStorage`, `sessionStorage`, `indexedDB`, or `document.cookie` in production client modules.
- **Zero Server-Side Persistence**: No user database, no SQL/NoSQL tables, and no session fixation vectors.
- **Zero-Log Network Scrubbing**: Any pasted vendor notes or contact numbers are scrubbed in memory prior to sending to external LLM APIs:
  - Phone numbers are replaced with `[REDACTED_PHONE]`
  - Email addresses are replaced with `[REDACTED_EMAIL]`
  - UPI handles and account numbers are replaced with `[REDACTED_UPI]` and `[REDACTED_ACCOUNT]`

---

## 2. OWASP Top 10 & OWASP LLM Top 10 Controls

| OWASP Vulnerability | Threat Description | UtsavAI Defensive Countermeasure |
|---|---|---|
| **A01: Broken Access Control** | Client overriding budget arithmetic or skipping tasks. | Mathematical determinism: `src/lib/plannerEngine.ts` is the single source of truth; LLM suggestions never alter sums directly. |
| **A02: Cryptographic Failures** | Exposing API keys in client JavaScript. | Server-side isolation: `@google/genai` is loaded strictly in `server.ts`. Zero client-side API keys. |
| **A03: Injection (XSS)** | Malicious vendor notes rendering dangerous HTML tags. | Zero `dangerouslySetInnerHTML`. All outputs pass through `<SafeNarrative />` plain text escaping. |
| **A05: Security Misconfiguration** | Missing security headers on web server. | Enforced CSP, `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`. |
| **LLM01: Prompt Injection** | Pasted vendor quotes attempting to alter system instructions. | Payload encapsulation: All user data is isolated inside `<event_evaluation>...</event_evaluation>` XML delimiters. System prompt strictly separated. |
| **LLM06: Sensitive Disclosure** | Model inadvertently regurgitating training secrets. | Post-flight regex scanner checks all outbound model text for API key patterns (`AIza...`) before sending to client. |
| **LLM10: Unbounded Consumption** | High token usage from lengthy vendor quotes. | Strict 800-character ceiling (<250 tokens) on vendor quote parsing. Text-only processing with zero OCR/image overhead. |

---

## 3. Hardened HTTP Security Headers
Configured in `server.ts`:
```http
Content-Security-Policy: default-src 'self'; font-src 'self' https://fonts.gstatic.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; img-src 'self' data: https:; script-src 'self' 'unsafe-inline' 'unsafe-eval'; connect-src 'self' https://generativelanguage.googleapis.com;
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: geolocation=(), microphone=(), camera=()
```

---

## 4. Automated Compliance Verification
Verified via `npm run test:compliance`:
1. AST scan for zero `dangerouslySetInnerHTML`.
2. Static secret scanner for zero hardcoded API keys.
3. Zero client-side storage leaks scan.
4. JSON Schema drift detection.
5. In-memory PII scrubber regression tests.
6. Rate-limiter denial of service tests.
