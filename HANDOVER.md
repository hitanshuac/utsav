# HANDOVER — 4-Persona Delivery Pipeline for Antigravity IDE & AI Studio (UtsavAI)

PM -> UX -> Full-stack -> QA, as four core Agent Skills plus five governance skills and an always-on `AGENTS.md`. Uses the 4-region solid-surface CSS system (`tokens.css`, `layout.css`, `components.css`).

## 1. Inventory
| Path (this bundle) | Purpose | Produces |
|---|---|---|
| `pm-product-strategist/SKILL.md` | Event curation, urgency taxonomy, persona lenses, overrun alert policy, user journey | `docs/specs/PRODUCT_SPEC.md` (`PM-n`) |
| `ux-reference-designer/SKILL.md` | Tokens, 4-region layout (App Bar, Tabs, Header, 8/4 Grid), states, troubleshooting | `docs/specs/DESIGN_SPEC.md` (`UX-n`) + CSS in `src/styles/` |
| `ux-reference-designer/references/tokens.css` `layout.css` `components.css` | Copy-paste solid-surface CSS | `src/styles/*.css` |
| `ux-reference-designer/references/demo.html` | Visual target to compare against | — |
| `ux-reference-designer/references/tailwind-map.md` | CSS class -> Tailwind utilities, forbidden utilities | — |
| `fullstack-architect/SKILL.md` | Data contract, deterministic planner engine, Gemini trade-off & vendor audit endpoints, `.ics` & `wa.me` actions | Code + `contract.schema.json`, `response.schema.json`, `DECISIONS.md` (`ENG-n`) |
| `qa-production-guard/SKILL.md` | Resilience matrix, build gate, `<10MB` repo check, conformance table, GO/NO-GO verdict | `docs/specs/QA_REPORT.md` |
| `sast-compliance/SKILL.md` | OWASP Top 10 / LLM Top 10, Semgrep rules, secret hygiene, zero XSS, PII redaction | `docs/specs/03_SECURITY.md`, scan results |
| `master-sync/SKILL.md` | Master 8-phase orchestration protocol (AST, contracts, SAST, planner tests, build, doc, deploy) | End-to-end synchronized state |

## 2. Install (IDE / Workspace)
Run from the project root:

macOS / Linux:
```bash
mkdir -p .agents/skills docs/specs src/styles
```
Windows (PowerShell):
```powershell
New-Item -ItemType Directory -Force ".agents\skills","docs\specs","src\styles" | Out-Null
```

Resulting tree:
```text
utsav-event-planner/
├── AGENTS.md
├── .agents/
│   ├── rules/
│   │   ├── core-governance.md
│   │   └── hack2skill-competition.md
│   └── skills/
│       ├── pm-product-strategist/SKILL.md
│       ├── ux-reference-designer/{SKILL.md, references/*}
│       ├── fullstack-architect/SKILL.md
│       ├── qa-production-guard/SKILL.md
│       ├── delivery-pipeline/SKILL.md
│       ├── master-sync/SKILL.md
│       ├── sast-compliance/SKILL.md
│       ├── test-automation/SKILL.md
│       ├── sre-refactor/SKILL.md
│       ├── repowise/SKILL.md
│       ├── dead-code-cleanup/SKILL.md
│       ├── contract-drift-guard/SKILL.md
│       ├── circular-dep-guard/SKILL.md
│       ├── bundle-budget-scan/SKILL.md
│       ├── a11y-wcag-guard/SKILL.md
│       └── zero-pii-leak-audit/SKILL.md
├── docs/specs/                    (PRODUCT_SPEC.md, DESIGN_SPEC.md, 03_SECURITY.md, DECISIONS.md, QA_REPORT.md)
├── src/
│   ├── styles/                    (tokens.css, layout.css, components.css)
│   ├── types/planner.ts
│   ├── lib/plannerEngine.ts
│   └── components/
└── server.ts
```

## 3. Run the 4-Stage Delivery Pipeline (Copy-Paste Prompts)

| # | Prompt | Output | Gate |
|---|---|---|---|
| 1 | `Use the pm-product-strategist skill. Read the project inputs in AGENTS.md. Write docs/specs/PRODUCT_SPEC.md for the UtsavAI Celebration & Event Execution Engine. Show each Acceptance item as pass/fail.` | `PRODUCT_SPEC.md` | Every Acceptance box passes |
| 2 | `Use the ux-reference-designer skill. Input: docs/specs/PRODUCT_SPEC.md. Copy tokens.css, layout.css, components.css into src/styles/. Write docs/specs/DESIGN_SPEC.md. Build the 4-region shell (App Bar with Persona Lens, Module Tabs, Overrun Alert Banner, Page Header with .ics export, and 8/4 Grid with Budget/DAG/Vendor cards on left and Mid-Flight Simulator sliders on right).` | `DESIGN_SPEC.md`, `src/styles/*.css`, UI shell | Matches `demo.html` structure at 375px and 1440px; `grep` for `backdrop-filter\|rgba(\|blur(` is empty |
| 3 | `Use the fullstack-architect skill. Inputs: docs/specs/PRODUCT_SPEC.md and DESIGN_SPEC.md. Implement src/lib/plannerEngine.ts (deterministic budget math, per-guest scaling, DAG milestone sort) and server.ts (/api/rebalance and text-only /api/audit-vendor with deterministic offline fallback). Emit contract.schema.json, response.schema.json, and DECISIONS.md.` | Working app | Runs offline with no API key; `npm run build` & `npm run lint` exit 0 |
| 4 | `Use the qa-production-guard and master-sync skills. Execute npm run test:planner and npm run test:compliance. Write docs/specs/QA_REPORT.md with the conformance table and a GO/NO-GO verdict.` | `QA_REPORT.md` | Verdict = GO |

## 4. Definition of Done & Challenge 5 Release Badges
- [x] 4 Core Delivery skills + 12 Governance/QA skills configured in `.agents/skills`
- [x] `AGENTS.md` filled for Challenge 5 (Celebration & Event Planner); zero `{{VAR}}` placeholders remain
- [x] `PRODUCT_SPEC.md`, `DESIGN_SPEC.md`, `contract.schema.json`, `response.schema.json`, `QA_REPORT.md` synchronized
- [x] App renders and executes all trade-off and vendor audit workflows with no network and no API key (100% deterministic fallback)
- [x] Build (`npm run build`), typecheck (`tsc --noEmit`), and lint exit `0`
- [x] Automated planner test harness (`npm run test:planner`): `14/14` tests pass (`100%`)
- [x] Compliance scans (`npm run test:compliance`): `6/6` scans pass (`100%`)
- [x] **Repository Footprint Gate**: `[PASS: < 10 MB]` & Single `main` branch verified
- [x] **SAST & OWASP Top 10 Compliance Badge**: `[PASS: 0 VIOLATIONS]` (No XSS, no `dangerouslySetInnerHTML`, no hardcoded secrets)
- [x] **Defensive Boundary Whitelisting Badge**: `[PASS: 100% WHITELISTED]` (XML delimiters `<event_evaluation>`, strict JSON schema validation, HTTP security headers)
- [x] **Zero-PII Invariant**: `[PASS: 100% IN-MEMORY]` (Zero `localStorage`, `sessionStorage`, `indexedDB`, or cookies)
- [x] `QA_REPORT.md` verdict = **GO (Prompt Wars Challenge 5 Submission Ready)**
