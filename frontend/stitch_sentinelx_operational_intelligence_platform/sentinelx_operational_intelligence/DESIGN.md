---
name: SentinelX Operational Intelligence
colors:
  surface: '#11131c'
  surface-dim: '#11131c'
  surface-bright: '#373943'
  surface-container-lowest: '#0c0e17'
  surface-container-low: '#191b24'
  surface-container: '#1d1f29'
  surface-container-high: '#282933'
  surface-container-highest: '#33343e'
  on-surface: '#e2e1ef'
  on-surface-variant: '#c4c5d9'
  inverse-surface: '#e2e1ef'
  inverse-on-surface: '#2e303a'
  outline: '#8e90a2'
  outline-variant: '#434656'
  surface-tint: '#b8c3ff'
  primary: '#b8c3ff'
  on-primary: '#002387'
  primary-container: '#2d5bff'
  on-primary-container: '#efefff'
  inverse-primary: '#104af0'
  secondary: '#b7c8e1'
  on-secondary: '#213145'
  secondary-container: '#3a4a5f'
  on-secondary-container: '#a9bad3'
  tertiary: '#ffb59b'
  on-tertiary: '#5b1a00'
  tertiary-container: '#c24100'
  on-tertiary-container: '#ffece6'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#dde1ff'
  primary-fixed-dim: '#b8c3ff'
  on-primary-fixed: '#001355'
  on-primary-fixed-variant: '#0035bd'
  secondary-fixed: '#d3e4fe'
  secondary-fixed-dim: '#b7c8e1'
  on-secondary-fixed: '#0b1c30'
  on-secondary-fixed-variant: '#38485d'
  tertiary-fixed: '#ffdbcf'
  tertiary-fixed-dim: '#ffb59b'
  on-tertiary-fixed: '#380d00'
  on-tertiary-fixed-variant: '#812900'
  background: '#11131c'
  on-background: '#e2e1ef'
  surface-variant: '#33343e'
typography:
  display-lg:
    fontFamily: IBM Plex Sans
    fontSize: 32px
    fontWeight: '600'
    lineHeight: 40px
    letterSpacing: -0.02em
  headline-md:
    fontFamily: IBM Plex Sans
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
  headline-sm:
    fontFamily: IBM Plex Sans
    fontSize: 16px
    fontWeight: '600'
    lineHeight: 24px
  body-lg:
    fontFamily: Inter
    fontSize: 15px
    fontWeight: '400'
    lineHeight: 22px
  body-md:
    fontFamily: Inter
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 20px
  data-tabular:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: 0.01em
  label-caps:
    fontFamily: IBM Plex Sans
    fontSize: 11px
    fontWeight: '700'
    lineHeight: 16px
    letterSpacing: 0.06em
  label-sm:
    fontFamily: Inter
    fontSize: 11px
    fontWeight: '500'
    lineHeight: 14px
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  base: 4px
  xs: 4px
  sm: 8px
  md: 12px
  lg: 16px
  xl: 24px
  gutter: 12px
  panel-padding: 16px
---

## Brand & Style
This design system is engineered for high-stakes operational environments, specifically for the Karnataka Police intelligence apparatus. The aesthetic is defined as **Military-Technical Minimalism**, drawing heavy inspiration from Palantir-style command-and-control interfaces. 

The brand personality is authoritative, precise, and mission-critical. There is no room for decorative flair; every pixel must serve a functional purpose. The goal is to reduce cognitive load during high-stress monitoring while maximizing information density. The interface prioritizes "heads-up" situational awareness, ensuring that critical alerts surface immediately through a cold, high-contrast dark-mode environment.

**Core Principles:**
- **Density over White Space:** Information must be accessible at a glance without excessive scrolling.
- **Visual Silence:** Neutral backgrounds and low-contrast UI chrome ensure that operational data (GIS points, graph nodes) remains the focal point.
- **Precision:** Mathematical alignment and consistent spacing reinforce a sense of system reliability and security.

## Colors
The palette is built on a "Void" foundation to minimize eye fatigue during extended night shifts and high-intensity monitoring.

- **Primary Canvas:** The background uses a deep `#05070A` to provide absolute contrast for data points.
- **Functional Blue:** The primary blue is used exclusively for actionable intelligence and active states. It is a cold, technical blue that pierces the dark background without being neon or distracting.
- **Semantic Signals:** Success, Warning, and Error colors are strictly reserved for system status and threat levels. 
- **Grayscale Hierarchy:** Borders and surfaces utilize a subtle range of cool-toned grays to define zones without adding visual weight. Surfaces are layered using "Tonal Stepping" rather than shadows.

## Typography
The typography system uses a dual-font approach to balance technical character with readability.

1. **IBM Plex Sans:** Employed for structural UI elements, headers, and labels. Its engineering-inspired terminals provide an institutional, authoritative feel.
2. **Inter:** Used for all high-density data, body text, and table content. Inter’s tall x-height and excellent legibility at small sizes (11px-13px) are critical for interpreting complex intelligence reports.

**Type Rules:**
- **Tabular Figures:** All numeric data in tables must use tabular (monospaced) lining to ensure vertical alignment of digits.
- **Caps for Context:** Use `label-caps` for section headers and non-interactive metadata to distinguish them from actionable data points.
- **Contrast:** Use high-contrast white for primary headers and muted gray (60% opacity) for secondary descriptions.

## Layout & Spacing
This design system utilizes a **Rigid 4px Grid System** to maintain extreme density. 

- **Layout Model:** A multi-pane fixed-width layout is preferred. The screen is typically divided into three primary zones: 
    1. Global Sidebar (Narrow, 64px)
    2. Primary Workspace (Flexible, often a GIS Map or Graph View)
    3. Contextual Inspector (Fixed, 320px-400px)
- **Density:** Gutters are kept tight (12px) to allow for more data columns. 
- **Reflow:** On smaller screens, the contextual inspector converts to a slide-over drawer rather than reflowing content, ensuring the spatial relationship of the primary map or graph remains intact.
- **Alignment:** Every element must snap to the 4px grid. Components should use `8px` padding for internal content and `12px` for section separation.

## Elevation & Depth
In a mission-critical dark UI, shadows are inefficient and cause visual "fuzziness." Depth is instead conveyed through **Tonal Layering** and **Structural Outlines**.

- **Layer 0 (Background):** `#05070A` - The base operational void.
- **Layer 1 (Containers/Panels):** `#0D1117` - Navigation sidebars and background panels.
- **Layer 2 (Interactive/Cards):** `#161B22` - Cards, data rows, and floating widgets.
- **Borders:** Panels are separated by 1px solid borders (`#1F2937`). 
- **Active State:** Instead of a shadow, an active panel or selected node is indicated by a 1px primary-colored (`#2D5BFF`) border and a subtle 10% opacity blue tint to the surface.

## Shapes
Shapes are designed to be sharp and precise. A minimal radius of **4px (Soft)** is used for buttons and primary containers to prevent the UI from feeling aggressive while maintaining a professional, engineered look.

- **Buttons/Inputs:** 4px radius.
- **Data Tables:** Sharp (0px) corners for the outer container to align with the screen edges.
- **Graph Nodes:** Circular (Pill) for entities (e.g., Suspects, Vehicles) to distinguish them from the rectangular UI panels.
- **Status Indicators:** Small 6px circles for live status (active/inactive).

## Components
Consistent component behavior is vital for speed of use.

- **Data Tables:**
    - High-density rows (32px height).
    - Subtle hover state using a slightly lighter background (`#1F2937`).
    - Fixed headers with 1px bottom border.
    - Status badges should be text-only or use a simple colored dot prefix.

- **Buttons:**
    - **Primary:** Solid `#2D5BFF` with white text. No gradients.
    - **Ghost:** Border-only (`#1F2937`) with white text. High-contrast hover.
    - All buttons must use `label-caps` for high-intensity readability.

- **Inputs:**
    - Dark-filled backgrounds (`#05070A`) with 1px border.
    - Focus state: Primary blue border, no glow.

- **Graph Nodes (Neo4j-style):**
    - Entities are represented as circles with a 2px stroke.
    - Relationship lines (Edges) are thin, 1px lines in muted gray.
    - Directional arrows indicate data flow/intent.

- **GIS Overlays:**
    - Map markers must be vector-sharp.
    - Pop-ups (Tooltips) on maps should use Layer 2 (`#161B22`) with no transparency to ensure legibility over varying map terrain.

- **AI Command Module:**
    - A specialized input field with a subtle pulsating left-border accent to indicate "Active AI Listening" or "Processing."