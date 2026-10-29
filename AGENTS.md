# Project Inputs
- PRODUCT_GOAL: Deterministic celebration and event execution engine with AI trade-off resolution, dependency-aware milestone scheduling, and vendor quote auditing
- TARGET_USERS: Indian families, wedding coordinators, and community organizers managing multi-vendor events under strict budget and timeline constraints
- CADENCE: Continuous interactive re-planning (single session, ephemeral in-memory state with 1-click calendar and WhatsApp exports)
- ROLES: family_host, wedding_coordinator, community_organizer
- CATEGORIES (BEATS): Critical Overrun (Tier 1), Timeline Bottleneck (Tier 2), Vendor Clarification Needed (Tier 3), On-Track Execution (Tier 4)
- CANDIDATE_SOURCES: Standard Indian Event Cost Benchmarks (Venue, Catering, Decor, Photography, Logistics), RFC 5545 iCalendar Specification, OWASP LLM Security Standards
- REFERENCE (UI): src/styles/demo.html (4-Region Solid-Surface Material 3 Layout)
- BRAND: UtsavAI (उत्सव AI — Celebration & Event Execution Concierge)
- RUNTIME: Vite 8 + React 19 + Express (local dev), Google Cloud Run / Vercel (production)
- LLM_PROVIDER: Google Gemini (@google/genai ^2.4.0, gemini-2.5-flash)
- AUTH_PROVIDER: None (Zero-PII architecture, no authentication or persistent storage by design)
- DEPLOY_TARGET: Google Cloud Run (port 3000 app, port 8080 reverse proxy)

# Conventions
- Specs live in docs/specs/. Requirement IDs: PM-n, UX-n, ENG-n (one per line, testable).
- Pipeline order: pm-product-strategist -> ux-reference-designer -> fullstack-architect -> qa-production-guard.
- Never start a stage before the previous stage's Acceptance checklist passes.
- Styling strictly uses `src/styles/tokens.css`, `src/styles/layout.css`, and `src/styles/components.css` alongside Tailwind CSS v4. No hardcoded hex or pixel literals outside `tokens.css`.
- Implement in TypeScript + React 19 + Vite 8 + Express (`server.ts`).
- The deterministic planning engine (`src/lib/plannerEngine.ts`) is the single source of truth for budget arithmetic, variance detection, per-plate scaling, and milestone dependency ordering. The LLM layer (`/api/rebalance` and `/api/audit-vendor`) MUST ONLY propose qualitative trade-offs, normalize plain-text vendor notes, and draft negotiation questions—never alter mathematical totals or bypass dependency constraints.
- Zero-PII: No personal names, emails, phone numbers, or payment credentials are ever persisted to disk, cookies, or browser storage.
