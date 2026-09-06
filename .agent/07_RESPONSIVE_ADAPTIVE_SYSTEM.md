# SentinelX --- Responsive & Adaptive System

## Objective

Responsive behavior means **recomposition**, not simply shrinking the
desktop interface.

## Target environments

Design and test: - 1280px - 1366px - 1440px - 1920px - 2560px / 4K -
ultrawide - tablet - mobile companion

## 200% zoom

At approximately 200% browser/UI zoom: - no overlapping - no clipped
critical controls - no inaccessible dialogs - no broken navigation - no
unreadable text - no loss of primary actions - no page-level horizontal
overflow - keyboard navigation remains functional

## Large displays

At 4K: - graph/map/evidence canvas can use more space - tables can
expose more useful columns - text remains constrained by readable max
widths - panels do not become absurdly wide

At ultrawide: **More screen → more investigative workspace**

not: **More screen → giant empty margins**

## Small displays

Tablet: - collapsible navigation - two-region workspace where useful

Mobile: - navigation drawer - one primary workspace - contextual
full-screen drawers where required

Mobile is a field companion, not a shrunken graph workstation.

## Graph behavior

Never shrink the graph into an unusable miniature.

Use: - full-screen graph mode - compact toolbar - reduced secondary
panels - progressive detail

## Tables

At smaller widths: - prioritize essential columns - constrain horizontal
scrolling to the table region when necessary - provide row detail drawer

## Implementation primitives

Prefer: - CSS Grid - Flexbox - min/max sizing - clamp() - container
queries where useful - responsive spacing tokens

Avoid major layout dependence on absolute positioning.

## Acceptance matrix

  Environment   Requirement
  ------------- --------------------------------------
  1280px        Fully usable
  1366px        Full desktop
  1920px        Expanded workspace
  2560px        Intelligent 4K composition
  Ultrawide     Workspace expands without distortion
  125%          No breakage
  150%          No breakage
  200%          No critical breakage
  Tablet        Reflow
  Mobile        Field companion

**Core principle:** available screen area may change; the investigator's
mental model must not.
