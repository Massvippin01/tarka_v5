# SentinelX --- Pixel-Level Design System

## Visual direction

Dark enterprise intelligence workstation.

**Never use:** gradients, glassmorphism, neon, cyberpunk, 3D, decorative
AI imagery, rainbow charts, excessive motion or theatrical effects.

## Color tokens

``` text
Background       #081018
Surface          #0D1721
Elevated         #111E2A
Border           #243342
Primary text     #F3F6F8
Secondary text   #9BAAB7
Accent           #31C4D8
Verified         #45C98A
Warning          #E6B85C
Critical         #E26D78
```

Color is semantic, not decorative. Never use color alone for meaning.

## Typography

Primary: **Inter** Fallback: **IBM Plex Sans** Technical identifiers:
monospace

  Role                    Size
  ----------------- ----------
  Page title          28--32px
  Section title       20--24px
  Card title          15--17px
  Body                14--16px
  Metadata            12--13px
  Critical number     28--40px
  Technical ID        12--13px

## Spacing

8px system: **8 / 16 / 24 / 32 / 40 / 48**

## Surfaces

Hierarchy: **Background → Surface → Elevated Surface → Modal**

Use surface contrast rather than heavy shadows.

## Components

Buttons: - one primary action per local context - secondary actions
remain visually subordinate - destructive actions are separated

Cards: - clear title - useful content - obvious click affordance - no
decorative clutter

Tables: - sticky headers where useful - row hover/focus -
sorting/filtering - column control - density control - direct row
navigation

Drawers: - preserve underlying context - 360--480px desktop width where
appropriate - full/nearly full screen on mobile

## Motion

Functional only: - 120--180ms micro-interactions - restrained panel
transitions - subtle route orientation

## Accessibility

Every interactive element needs: - visible focus - accessible label -
logical tab order - keyboard activation - readable contrast

## Density

Provide: - Comfortable - Compact

Default to Comfortable. Persist investigator preference.
