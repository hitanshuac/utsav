# Security Policy — UtsavAI (उत्सव AI)

## Architecture & Security Posture
UtsavAI is architected with a strict Defense-in-Depth posture designed for deterministic, privacy-preserving event execution under zero-trust conditions.

Full security specification: [docs/specs/03_SECURITY.md](file:///d:/Projects/utsav/docs/specs/03_SECURITY.md).

### Core Security Guarantees
1. **Zero-PII Ephemeral State:**
   - 100% in-memory runtime execution.
   - Zero persistent browser storage (`localStorage`, `sessionStorage`, `indexedDB`, or `document.cookie`).
   - Automated AST compliance scan (`npm run test:compliance` - Scan 1) verifies zero storage APIs in `src/`.
2. **Safe DOM & Zero XSS Guarantee (OWASP A03 / ASVS v4.0):**
   - Dynamic AI outputs are rendered strictly through `<SafeNarrative />`.
   - 0 `dangerouslySetInnerHTML` or dynamic `eval()` / `new Function()` invocations across the codebase.
3. **Hardened HTTP Security Headers:**
   - Enforced on all Express endpoints:
     - `Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; connect-src 'self' https://generativelanguage.googleapis.com;`
     - `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload`
     - `Cross-Origin-Opener-Policy: same-origin`
     - `Cross-Origin-Resource-Policy: same-origin`
     - `X-Frame-Options: DENY`
     - `X-Content-Type-Options: nosniff`
     - `Referrer-Policy: strict-origin-when-cross-origin`
     - `Permissions-Policy: geolocation=(), microphone=(), camera=()`
4. **Boundary Validation & Prototype Pollution Defense:**
   - `16kb` payload cap on all incoming JSON bodies.
   - `415 Unsupported Media Type` check for non-JSON requests on `POST /api/*`.
   - Recursive prototype key sanitization (`__proto__`, `constructor`, `prototype`).
5. **OWASP LLM Top 10 Guardrails:**
   - **LLM01 (Prompt Injection Prevention):** User payloads are scrubbed of structural injection delimiters (`< > { } [ ]`) and encapsulated within distinct XML delimiters (`<event_evaluation>`).
   - **LLM06 (Sensitive Information Disclosure):** Pre-flight PII scrubbing redacts phone numbers, emails, and account IDs in memory; post-flight inspectors block accidental leakage of API credentials.
   - **Circuit-Breaker Shield:** 8,000ms `AbortController` timeout immediately trips to deterministic heuristic fallback (`provenance: 'fallback'`).

## Reporting a Vulnerability
To report security vulnerabilities or compliance inquiries:
1. Open a confidential security advisory via GitHub Security Advisories or contact the repository maintainers.
2. Provide reproduction steps, payload details, and observed behavior.
3. All verified reports are acknowledged within 24 hours.
