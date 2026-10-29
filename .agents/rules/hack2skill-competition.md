---
trigger: model_decision
description: Load when preparing Hack2Skill Prompt Wars Virtual Challenge 5 submission artifacts, evaluator presets, video demos, or README updates
---

# Hack2Skill Prompt Wars Virtual — Challenge 5 Governance

1. **Zero-Friction Evaluator Shield:** Every feature MUST be testable by the automated AI evaluator and human judges in `<= 3` clicks without requiring an API key, login, or image upload. Pre-loaded scenario presets (`Wedding ₹8L / 200 Guests`, `50th Anniversary Tight Budget`, `Community Cultural Fest`) MUST load instantly in `<10ms`.
2. **Submission Guardrails:**
   - Total repository size MUST remain strictly `< 10 MB`.
   - Repository MUST remain Public with strictly one branch (`main`).
   - Maximum 3 submission attempts allowed; only the final attempt score stands.
3. **Auditability & Evidence:** Every functional or architectural claim in documentation MUST link to a verifiable file path and requirement ID (`PM-n`, `UX-n`, `ENG-n`, `RES-n`).
4. **Transparency of Estimates:** All generated budget allocations MUST explicitly display an `Estimated Assumption` vs. `Verified Quote` badge so the AI never presents hallucinated vendor pricing as confirmed fact.
