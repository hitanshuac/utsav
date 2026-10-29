---
name: a11y-wcag-guard
description: Audits the compiled web application for WCAG 2.1 AA compliance, missing ARIA tags, contrast failures, and keyboard navigability using axe-core.
---

# Accessibility (WCAG 2.1 AA) Guard Skill

Use this skill when asked to "audit accessibility", "check WCAG compliance", or "prepare UI for judge evaluation".

## Execution Workflow
1. Ensure the app is built (`npm run build`).
2. Run axe-core headless check against the built HTML/components:
   ```bash
   npx --yes @axe-core/cli dist/index.html --tags wcag2a,wcag2aa
   ```
3. Verify specific Event Planner UI criteria:
   - All Mid-Flight Simulator sliders (`Guest Count`, `Budget Cap`, `Days to Event`) have explicit `aria-label`, `aria-valuemin`, `aria-valuemax`, and `aria-valuenow`.
   - Tab navigation in R2 uses `role="tablist"`, `role="tab"`, and `aria-selected`.
   - Role lens dropdown buttons use `aria-haspopup="menu"`, `aria-expanded`, and `role="menuitemradio"`.
   - Color contrast ratio between text (`--c-text`, `--c-text-body`, `--c-text-muted`) and solid surfaces (`--c-surface`, `--c-canvas`) is `>= 4.5:1`.
   - Interactive focus states have a visible `2px solid var(--c-primary)` focus ring (`outline-offset: 2px`).
4. Output a summary report: `Total Violations: 0 | Critical: 0 | Serious: 0`.
