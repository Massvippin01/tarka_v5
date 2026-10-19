# SentinelX --- Interaction Component Contract

## Interaction grammar

Every interactive component follows:

**Idle → Hover → Focus → Active → Success/Error**

State must be visible without excessive animation.

## Click contracts

  Object           Click result
  ---------------- ------------------------------------
  Entity           Preview
  Open entity      Full dossier
  Relationship     Relationship Inspector
  Evidence         Evidence Viewer
  Alert            Alert investigation
  Investigation    Investigation Workspace
  Search result    Correct entity/case/document route
  Graph node       Entity preview
  Timeline event   Event/evidence context

## Expand

Expansion should happen in place whenever practical.

Example: **Lead card → expanded proof chain**

## Slide-over

Use for: - entity preview - evidence preview - relationship preview -
alert detail - contextual help

Underlying investigation context remains visible.

## Keyboard

Minimum: - Ctrl+K --- command palette - `/` --- search when safe - Esc
--- close drawer/modal - Enter --- activate - Arrow keys --- list
navigation - Tab --- focus movement - `?` --- help

## Focus mode

Optional distraction-reduced mode for: - evidence review - report
writing - graph analysis

Keep an escape/back path.

## Customization

Allow: - Comfortable/Compact density - visible panels - default
investigation lens - graph layout preference - voice preference -
notification preference - table columns - language

Do not permit arbitrary visual changes that break the design system.

## Loading

Use skeletons for predictable content.

AI stages where meaningful: **Retrieving → Correlating → Verifying →
Preparing**

Never fake progress.

## Errors

Every error states: 1. what failed 2. whether work was saved 3. what to
do next

## No dead clicks

All major interaction targets require manual and automated QA coverage.
