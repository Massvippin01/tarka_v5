# TARKA SUTRAM 2026 PS04 | PHASE 15
# DESIGN SYSTEM SPECIFICATION (TARKA OBSIDIAN-GLASS DS v2.0)

**Product:** TARKA Cyber Fraud Investigation and Attribution Workbench  
**Specification:** Forensic Obsidian-Glass Bento Design System  
**Governing Doctrine:** AI PROPOSES. EVIDENCE VERIFIES. HUMAN DECIDES.  
**Target Standard:** Admin Dashboard V2 Reference Fidelity

---

## 1. Design System Philosophy

The TARKA Obsidian-Glass Design System is specifically engineered for high-consequence forensic investigations. Unlike consumer dashboard interfaces, investigative systems require:
1. **Prolonged Ocular Comfort:** Deep midnight blue and black surfaces that prevent retinal exhaustion during multi-hour cyber incident investigations.
2. **Unambiguous Semantic Coding:** Absolute distinction between corroborated evidence (emerald `#10B981`), disputed claims (amber `#F59E0B`), statutory violations (crimson `#EF4444`), and mathematical certainty (cyan `#06B6D4`).
3. **Multi-Layered Visual Depth:** Specular hairlines and backdrop-filtered glass surfaces that create clear visual separation without adding noisy decorative borders.
4. **Information Density with Zero Clutter:** Strict vertical rhythm, monospace precision for hashes and timestamps, and adaptive HUD overlays.

---

## 2. Color Tokens & Semantic Hierarchy

### 2.1 Environmental Foundations
```css
:root, [data-theme="obsidian-glass"], [data-theme="obsidian"] {
  /* Canvas Environments */
  --bento-canvas: #060B14;               /* Primary Application Background */
  --bento-subcanvas: #0B1220;            /* Secondary Workspace Canvas */
  --bento-sidebar: #0B1220;              /* Sidebar Rail Canvas */
  --bento-topbar: #0B1220;               /* Top Command Bar Canvas */

  /* Bento Surface Containers */
  --reui-card-bg: #0F1B2E;               /* Core Bento Container Surface */
  --reui-card-sub: #132238;              /* Nested Card / Drawer Surface */
  --reui-card-hover: #162844;            /* Interactive Hover Elevation */

  /* Specular Hairlines & Borders */
  --bento-border: rgba(255, 255, 255, 0.08);       /* Default Hairline */
  --bento-border-subtle: rgba(255, 255, 255, 0.05);/* Subtle Divider */
  --bento-border-glow: rgba(6, 182, 212, 0.40);    /* Active Focus / Cyan Glow */
  --glass-specular-top: rgba(255, 255, 255, 0.12); /* Top Edge Light Incident */
}
```

### 2.2 Forensic Semantic Accents
| Semantic Role | Token Name | Hex Value | Purpose / Judicial Meaning |
|---|---|---|---|
| **Primary Action / Intel** | `--primary` | `#06B6D4` / `#22D3EE` | Active tools, intelligence links, primary CTAs |
| **Mathematical Proof (SMT)** | `--accent-cyan` | `#22D3EE` | Z3 SMT UNSAT proof, cryptographic CAS hash |
| **Corroborated Fact (Tier 1)** | `--success` | `#10B981` / `#34D399` | Bank official ledger, verified CDR, Bitstream intact |
| **Disputed Claim (Tier 2/3)** | `--warning` | `#F59E0B` / `#FBBF24` | Inconsistent timestamp, uncorroborated victim claim |
| **Statutory Violation / Fraud** | `--danger` | `#EF4444` / `#F87171` | Min-cut fraudulent withdrawal, CGNAT evasion |
| **Neutral Telemetry / Meta** | `--text-muted` | `#94A3B8` / `#64748B` | Labels, UTC timestamps, provenance breadcrumbs |

---

## 3. Typography Specification

The typography stack ensures instant legibility across complex tabular data and forensic bitstreams:

```css
:root {
  /* Font Families */
  --font-display: "Space Grotesk", "Inter", -apple-system, sans-serif;
  --font-sans: "Inter", "IBM Plex Sans", -apple-system, sans-serif;
  --font-mono: "JetBrains Mono", "IBM Plex Mono", monospace;

  /* Type Scale */
  --text-xs: 11px;    /* Micro telemetry, statutory tags, CAS hash pills */
  --text-sm: 12px;    /* Table data cells, secondary metadata */
  --text-base: 13px;  /* Standard UI labels, button text */
  --text-md: 14px;    /* Subsection headings, dialog titles */
  --text-lg: 16px;    /* Card headers, modal headlines */
  --text-xl: 20px;    /* Primary KPI numerals */
  --text-2xl: 24px;   /* Screen hero titles, workbench banners */
}
```

---

## 4. Glass Materials & Specular Layering

Phase 15 defines three discrete levels of glassmorphism based on visual stacking order:

```css
/* Level 1: Core Bento Tile */
.glass-surface-l1 {
  background: var(--reui-card-bg, #0F1B2E);
  border: 1px solid var(--bento-border, rgba(255, 255, 255, 0.08));
  border-top: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 8px;
  box-shadow: 0 4px 16px -2px rgba(0, 0, 0, 0.45);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
}

/* Level 2: Nested Sub-Panel / Flyout Menu */
.glass-surface-l2 {
  background: var(--reui-card-sub, #132238);
  border: 1px solid rgba(255, 255, 255, 0.10);
  border-top: 1px solid rgba(255, 255, 255, 0.16);
  border-radius: 6px;
  box-shadow: 0 8px 24px -4px rgba(0, 0, 0, 0.60);
  backdrop-filter: blur(16px);
}

/* Level 3: Modal Overlay / Command Palette (Sarvam Voice Modal) */
.glass-surface-modal {
  background: rgba(11, 18, 32, 0.88);
  border: 1px solid rgba(6, 182, 212, 0.30);
  border-radius: 12px;
  box-shadow: 0 20px 48px -8px rgba(0, 0, 0, 0.85), 0 0 32px rgba(6, 182, 212, 0.12);
  backdrop-filter: blur(24px);
  -webkit-backdrop-filter: blur(24px);
}
```

---

## 5. Primitives & Bento Components

### 5.1 KpiTile & BentoKpiCard
- **Dimensions:** Compact height (84px - 100px) with zero wasted padding.
- **Top Bar:** Specular light reflection on hover.
- **Numerals:** Large 20px `#FFFFFF` weight 800 with monospace tracking.
- **Micro-Graph / Badge:** Translucent semantic chip in upper right corner.

### 5.2 StoryBanner & Contextual HUD
- **Presentation Modes Banner:**
  - `guided`: Border cyan `rgba(34, 211, 238, 0.25)`, background `rgba(6, 182, 212, 0.10)`.
  - `review`: Border emerald `rgba(16, 185, 129, 0.25)`, background `rgba(16, 185, 129, 0.10)`.
  - `analyst`: Zero vertical footprint for maximum data grid density.

### 5.3 Buttons & Interactive Controls
```css
/* Primary Action Button */
.btn-primary-glass {
  background: linear-gradient(180deg, #06B6D4 0%, #0891B2 100%);
  color: #060B14;
  font-weight: 700;
  border: 1px solid #22D3EE;
  border-radius: 6px;
  padding: 6px 14px;
  box-shadow: 0 2px 8px rgba(6, 182, 212, 0.25);
  transition: all 0.15s ease-in-out;
}
.btn-primary-glass:hover {
  background: #22D3EE;
  box-shadow: 0 0 16px rgba(34, 211, 238, 0.45);
  transform: translateY(-1px);
}

/* Secondary Dark Glass Button */
.btn-secondary-glass {
  background: rgba(255, 255, 255, 0.05);
  color: #F8FAFC;
  font-weight: 600;
  border: 1px solid rgba(255, 255, 255, 0.10);
  border-radius: 6px;
  padding: 6px 12px;
}
.btn-secondary-glass:hover {
  background: rgba(255, 255, 255, 0.10);
  border-color: rgba(255, 255, 255, 0.20);
}
```

---

## 6. Responsive Breakpoint Specification

| Breakpoint Name | Viewport Width | Sidebar Behavior | Bento Columns | Table Scrolling |
|---|---|---|---|---|
| **Desktop Ultra** | `>= 1440px` | Expanded (232px) | 4 Columns | Full width, zero truncation |
| **Laptop Standard** | `1024px - 1439px` | Collapsed / Peek (56px) | 3-4 Columns | Native inline scrolling |
| **Tablet Workstation** | `768px - 1023px` | Collapsed Rail (56px) | 2 Columns | Horizontal scroll containers |
| **Mobile Incident Triage** | `< 768px` | Off-canvas Drawer | 1 Column Stack | Tabbed card views |

---

## 7. Verification & Design Token Compliance
- **100% Theme Isolation:** Scoped under `:root` and `[data-theme="obsidian-glass"]`.
- **Zero Style Leaks:** Legacy porcelain properties isolated to `[data-theme="porcelain"]`.
- **Fast Render Time:** Pure CSS variables with GPU-accelerated `backdrop-filter`.

