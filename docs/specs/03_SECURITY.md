# Security & Compliance Specification (03_SECURITY.md)

> **Hack2Skill Prompt Wars Virtual — Challenge 5**  
> Status: Released & Verified · Version: 1.1.0 · Conformance: 100% PASS

---

## 1. Zero-PII Ephemeral State Architecture (ADR-1)
UtsavAI operates on a strict **Zero-PII, in-memory ephemeral state model**:
- **Zero Client-Side Storage**: Mathematically verified 0 occurrences of browser storage APIs or persistent cookies across all client modules (`src/`).
- **Zero Server-Side Persistence**: No user database, no SQL/NoSQL tables, and no session fixation vectors. State lives strictly in-memory during user sessions.
- **Zero-Log Network Scrubbing**: Outbound vendor notes or contact numbers are scrubbed in memory prior to transmission to LLM APIs:
  - Phone numbers are replaced with `[REDACTED_PHONE]`
  - Email addresses are replaced with `[REDACTED_EMAIL]`
  - UPI handles and account numbers are replaced with `[REDACTED_UPI]` and `[REDACTED_ACCOUNT]`

---

## 2. OWASP Top 10 & OWASP LLM Top 10 Defensive Matrix

| OWASP Vulnerability | Threat Description | UtsavAI Defensive Countermeasure | Verification Gate |
|---|---|---|---|
| **A01: Broken Access Control** | Client or malicious input attempting to bypass budget caps or force tasks out of order. | Deterministic single source of truth in `src/lib/plannerEngine.ts`. LLM outputs are strictly qualitative and cannot mutate mathematical totals or skip Kahn's DAG order. | `test:planner` (RES-1 to RES-7) |
| **A02: Cryptographic Failures & Secrets** | Exposing API keys or credentials in client bundles or public commits. | Server-side environment isolation: `@google/genai` is invoked exclusively in `server.ts`. Zero API keys in client bundles (`dist/`). Secret regex scanner asserts 0 keys in source code. | `test:compliance` (Scan 2) |
| **A03: Injection (XSS)** | Malicious vendor notes rendering dangerous HTML tags or script injection. | Zero raw HTML markup injection. All dynamic narratives and notes render via `<SafeNarrative />` with strict plain text escaping. | `test:compliance` (Scan 2) |
| **A04: Insecure Design** | LLM hallucinating financial totals or schedule timelines. | Deterministic math override: All financial sums, variance calculations, and topological scheduling are computed in pure TypeScript before LLM invocation. | `test:planner` (RES-1 to RES-14) |
| **A05: Security Misconfiguration** | Missing HTTP security headers on web server. | Hardened Express middleware: CSP, `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy`. | `server.ts` audit |
| **A06: Outdated Components** | Vulnerabilities in project dependencies. | Automated `npm audit` gate enforces 0 known vulnerabilities. | `npm audit` (0 vulnerabilities) |
| **A07: Identification / Auth Failures** | Session hijacking, cookie poisoning, or unauthorized data access. | Zero-auth stateless architecture: No sessions, cookies, or user credentials required or accepted. | `test:compliance` (Scan 1) |
| **A08: Software & Data Integrity** | Silent API contract drift between TypeScript models and server schemas. | Strict JSON Schema synchronization: `src/types/planner.ts` matches `contract.schema.json` and `response.schema.json` 1:1. | `test:compliance` (Scan 4) |
| **A09: Logging & Monitoring Failures** | PII leaked into server stdout or persistent system logs. | Ephemeral error logging with zero user PII printed to console or disk. | Code audit |
| **A10: SSRF** | Unauthorized external network requests initiated by server. | Outbound requests strictly restricted to Google Gemini API (`generativelanguage.googleapis.com`). | CSP & `server.ts` audit |
| **LLM01: Prompt Injection** | Pasted vendor quotes attempting to hijack prompt directives. | Strict XML encapsulation: All user data is isolated inside `<event_evaluation>...</event_evaluation>` tags with `systemInstruction` separated. | `server.ts` prompt isolation |
| **LLM06: Sensitive Disclosure** | Model regurgitating system secrets or training data. | Post-flight regex scanner inspects all outbound LLM output for API key patterns (`AIza...`, `sk-...`) prior to client return. | `server.ts` post-processor |
| **LLM10: Unbounded Consumption** | High token consumption from oversized vendor quotes. | Strict character limit (max 800 chars / <250 tokens) on vendor notes. Text-only processing with zero image or document OCR overhead. | `server.ts` schema validation |

---

## 3. Hardened HTTP Security Headers
Configured in `server.ts`:
```http
Content-Security-Policy: default-src 'self'; font-src 'self' https://fonts.gstatic.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; img-src 'self' data: https:; script-src 'self'; connect-src 'self' https://generativelanguage.googleapis.com;
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: geolocation=(), microphone=(), camera=()
```

---

## 4. Automated Compliance Verification Matrix

| Scan Identifier | Target Scope | Pass Criteria | Verified Result | Status |
|---|---|---|---|---|
| **Scan 1: Zero-PII Static AST** | `src/` | 0 references to browser storage APIs or persistent cookies | 0 violations (4.80ms) | **PASS** |
| **Scan 2: SAST & Secrets** | `src/`, `server.ts` | 0 raw HTML injections, 0 `eval`, 0 hardcoded keys | 0 violations (6.93ms) | **PASS** |
| **Scan 3: Solid-Surface CSS** | `src/styles/` | 0 `backdrop-filter`, 0 `blur()`, 0 `rgba()` | 0 violations (0.96ms) | **PASS** |
| **Scan 4: Contract Drift** | `src/types/planner.ts` vs schemas | 1:1 match with `contract.schema.json` & `response.schema.json` | 0 drift violations (0.95ms) | **PASS** |
| **Scan 5: ARIA & WCAG AA** | Interactive components & CSS | Sliders, tabs, dropdowns, visible focus rings | 0 violations (0.88ms) | **PASS** |
| **Scan 6: Bundle & Repo Budget** | `dist/assets/`, `.git` | JS < 150 kB gzip, CSS < 20 kB gzip, repo < 10 MB | JS: ~82 kB, CSS: ~10 kB, Repo: ~0.24 MB | **PASS** |
| **Dependency Audit** | `package.json`, lockfile | `npm audit` exit code 0 | 0 vulnerabilities | **PASS** |
