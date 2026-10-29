---
name: bundle-budget-scan
description: Enforces production bundle size limits and repository footprint caps (< 10 MB total repo, < 150 kB gzip JS, < 20 kB gzip CSS) for optimal judge evaluation and low-latency client performance.
---

# Bundle Budget & Repository Footprint Scan Skill

Use this skill to measure and enforce strict size budgets on compiled assets and git repository size.

## Size Thresholds
- **Primary JS Bundle**: `< 150 kB` (gzip compressed)
- **Primary CSS Bundle**: `< 20 kB` (gzip compressed)
- **Total Git Repository Footprint**: `< 10 MB`

## Verification Workflow
1. Execute production build:
   ```bash
   npm run build
   ```
2. Inspect `dist/` directory files and their gzip sizes.
3. Check git object database size:
   ```bash
   git count-objects -vH
   ```
4. Fail build if any artifact exceeds the budgeted ceiling.
