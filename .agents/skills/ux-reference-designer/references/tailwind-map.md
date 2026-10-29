# Tailwind CSS v4 Reference Mapping for UtsavAI

## Direct Token Mappings
| CSS Token / Class | Tailwind v4 Utility Equivalent | Forbidden / Discouraged Utilities |
|---|---|---|
| `var(--c-canvas)` | `bg-slate-50` | `backdrop-blur-*`, `bg-opacity-*` |
| `var(--c-surface)` | `bg-white` | `backdrop-filter`, `blur` |
| `var(--c-primary)` | `bg-orange-600`, `text-orange-600` | Arbitrary hex outside design tokens |
| `var(--c-tier-critical)` | `bg-red-600`, `text-red-700` | Unstyled inline styling |
| `var(--c-tier-timeline)` | `bg-amber-600`, `text-amber-800` | Alpha-channel blurs |
| `var(--c-tier-ontrack)` | `bg-emerald-600`, `text-emerald-800` | Ad-hoc gradients |

## Rules
- Never use `backdrop-filter`, `blur()`, or transparent `rgba()` glassmorphism.
- Always use solid surfaces to ensure crisp contrast and zero render lag.
