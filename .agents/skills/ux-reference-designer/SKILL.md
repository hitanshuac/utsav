---
name: ux-reference-designer
description: Designs and maintains the 4-region solid-surface Material 3 layout, token systems, and WCAG AA accessibility specs for UtsavAI.
---

# UX Reference Designer Skill

Use this skill to create and maintain `docs/specs/DESIGN_SPEC.md` and CSS design system files in `src/styles/`.

## 4-Region Solid Surface Architecture
- **R1 (Top App Bar)**: Brand header (`UtsavAI`), Search, Persona Lens Selector (`family_host`, `wedding_coordinator`, `community_organizer`).
- **R2 (Navigation Tab Bar)**: `Overview`, `Budget & Trade-offs`, `Milestone DAG`, `Vendor Auditor`.
- **Top Dynamic Alert Banner**: Context-aware alert for `CRITICAL_OVERRUN` or `TIMELINE_BOTTLENECK` with 1-click `Resolve Trade-offs` action.
- **R3 (Page Header)**: Event Title, Target Date, Live Budget Status Chip, RFC 5545 `.ics` Export button.
- **R4 (12-Column Execution Grid)**:
  - 8-Column interactive workspace (Category cards, DAG timeline, quote auditor).
  - 4-Column Mid-Flight Simulator panel (`Guest Count`, `Budget Cap`, `Days Remaining` sliders) & Alert Radar.

## Visual Rules (Anti-AI-Slop Solid Surface)
- All surfaces use solid fills: `--c-canvas`, `--c-surface`, `--c-surface-card`, `--c-tonal-bg`.
- STRICTLY FORBIDDEN: `backdrop-filter`, `blur()`, low-contrast `rgba()` alpha backgrounds, and `dangerouslySetInnerHTML`.
- Minimum contrast ratio: `>= 4.5:1` for normal text, `>= 3:1` for large text and icons.
