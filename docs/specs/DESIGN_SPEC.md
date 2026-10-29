# Design Specification: UtsavAI 4-Region Solid-Surface UI

> **Hack2Skill Prompt Wars Virtual — Challenge 5**  
> Status: Released & Verified · Version: 1.0.0

---

## 1. Design System Philosophy: Anti-AI-Slop Solid Surfaces
Modern AI interfaces frequently suffer from excessive blur, low-contrast semi-transparent cards, and hard-to-read gradients. **UtsavAI** adheres to a strict **Solid-Surface Material 3 architecture**:
- **Zero Blurs**: No `backdrop-filter` or `blur()` CSS properties.
- **Solid High-Contrast Surfaces**: Card backgrounds (`--c-surface`), canvas (`--c-canvas`), and tonal backgrounds (`--c-tonal-bg`) use opaque hex fills.
- **Instant Rendering**: Guaranteed zero composite GPU rendering lag on mobile devices.

---

## 2. 4-Region Layout Architecture

```text
+-----------------------------------------------------------------------------------+
| Region 1: Top App Bar [Brand: UtsavAI | Mode Badge | Persona Lens Selector]      |
+-----------------------------------------------------------------------------------+
| Region 2: Navigation Tab Bar [Overview | Budget & Trade-offs | DAG | Vendor Audit] |
+-----------------------------------------------------------------------------------+
| Dynamic Banner: [⚠️ Critical Overrun Alert / Timeline Bottleneck | 1-Click Action]|
+-----------------------------------------------------------------------------------+
| Region 3: Page Header [Event Title | Target Date | Status Chip | .ics Export]     |
+-----------------------------------------------------------------------------------+
| Region 4: 12-Column Execution Grid                                                |
|   +------------------------------------------+ +--------------------------------+ |
|   | 8-Column Main Execution Panels           | | 4-Column Mid-Flight Simulator  | |
|   |  - Category Budget Allocation Ledger     | |  - Guest Count Slider          | |
|   |  - Milestone Dependency Graph (DAG)      | |  - Total Budget Cap Slider     | |
|   |  - Vendor Quote Auditor & Negotiation    | |  - Days Remaining Slider       | |
|   |  - AI Trade-Off Strategy Cards           | |  - Triage Alert Radar          | |
|   +------------------------------------------+ +--------------------------------+ |
+-----------------------------------------------------------------------------------+
```

---

## 3. UI Requirements & WCAG 2.1 AA Criteria

| ID | Requirement Statement | Verification Standard | Status |
|---|---|---|---|
| `UX-1` | Navigation tab bar in Region 2 shall implement valid ARIA tab semantics (`role="tablist"`, `role="tab"`, `aria-selected`). | Headless Axe AST scan | **PASS** |
| `UX-2` | Interactive Mid-Flight Simulator sliders shall feature explicit `aria-label`, `min`, `max`, and current value attributes. | HTML markup inspection | **PASS** |
| `UX-3` | Color contrast ratio between body text (`--c-text-body`) and card surfaces (`--c-surface`) shall be `>= 4.5:1`. | Colorimetric audit (7.1:1) | **PASS** |
| `UX-4` | Interactive focusable elements shall display a visible `2px solid var(--c-primary)` focus ring with `outline-offset: 2px`. | Keyboard navigation test | **PASS** |
| `UX-5` | The layout shall be responsive across viewport widths from `375px` (mobile single column) to `1440px` (desktop 12-column grid). | Media query audit | **PASS** |
| `UX-6` | Overrun alert banner shall dynamically render contextual severity styling: Red for Overrun, Amber for Timeline, Green for On-Track. | DOM state switch test | **PASS** |
| `UX-7` | All AI-generated narratives and trade-off proposals shall render through `<SafeNarrative />` with zero `dangerouslySetInnerHTML`. | AST security scanner | **PASS** |
| `UX-8` | All monetary amounts shall be formatted in Indian Rupee format (`₹` with `en-IN` comma grouping and tabular numbers). | Locale formatting test | **PASS** |

---

## 4. Acceptance Checklist
- [x] Verified zero occurrences of `backdrop-filter` or `blur(` across all stylesheets
- [x] All 8 design criteria (`UX-1` through `UX-8`) verified passing
- [x] Solid surface tokens in `src/styles/tokens.css` utilized across all components
