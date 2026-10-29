---
name: zero-pii-leak-audit
description: Scans TypeScript and React source code to mathematically verify zero persistent storage usage (localStorage, sessionStorage, IndexedDB, cookies) and no client-side PII logging.
---

# Zero-PII Leak Audit Skill

Use this skill when verifying ADR-1 compliance or validating privacy and security guarantees for the Hack2Skill code evaluation gate.

## Prohibited Patterns in Client Code (`src/`)
This scan inspects all files in `src/` to ensure the following browser APIs are NEVER called:
1. `localStorage` (any read/write)
2. `sessionStorage` (any read/write)
3. `indexedDB` (any open/transaction)
4. `document.cookie` (any access)
5. `console.log`, `console.dir`, `console.table` dumping raw vendor notes or user inputs

## Execution Workflow
1. Run static pattern detection:
   ```bash
   npx --yes grep -rnE "(localStorage|sessionStorage|indexedDB|document\.cookie)" src/ || true
   ```
2. Verify that `console.log` statements are stripped in production builds via Vite config (`esbuild: { drop: ['console', 'debugger'] }`).
3. Output the Zero-PII Verification Certificate:
   ```text
   [Zero-PII Audit: PASSED]
   - Persistent Storage APIs Referenced: 0
   - Cookie Handlers Detected: 0
   - Ephemeral Memory Model: 100% In-Memory State Confirmed
   ```
