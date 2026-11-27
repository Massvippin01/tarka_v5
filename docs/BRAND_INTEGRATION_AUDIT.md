# TARKA × SENTINELX — BRAND INTEGRATION AUDIT
**Document ID:** TARKA-BRAND-AUDIT-2026-V6  
**Classification:** Canonical Brand & UI/UX Audit  
**Status:** COMPLETE & VERIFIED  

---

## 1. Executive Summary

This document audits and certifies the official brand integration across the TARKA forensic investigation platform. The visual identity has been aligned with the official founder-approved TARKA mark: an espresso monogram 'T' with a sweeping serif, folded terracotta wing (`#C85A32`), and a high-contrast serif wordmark with distinctive terracotta diamond dots (`◆`) nestled beneath both 'A's.

All brand assets have been rendered from the master 1774×887 vector-fidelity artwork, decontaminated from background color artifacts into transparent 32-bit RGBA channels, and deployed across light, dark, and tactile skeuomorphic surfaces.

---

## 2. Master Brand Asset Matrix

| Asset File Path | Dimensions | Channels | Description / Target Surface |
|---|---|---|---|
| `brand/source/tarka-terracotta-fold-original.png` | 1774 × 887 | RGBA | High-resolution master asset repository source |
| `frontend/public/brand/tarka-logo-full.png` | 1444 × 368 | RGBA (Transparent) | Full emblem + wordmark for light ivory surfaces |
| `frontend/public/brand/tarka-logo-full-ivory.png` | 1444 × 368 | RGBA (Transparent) | Full mark tuned for high-contrast presentation |
| `frontend/public/brand/tarka-symbol.png` | 463 × 463 | RGBA (Transparent) | Square emblem fold mark for light backgrounds |
| `frontend/public/brand/tarka-wordmark.png` | 976 × 352 | RGBA (Transparent) | Standalone serif wordmark with diamond `◆` accents |
| `frontend/public/brand/tarka-logo-dark.png` | 1444 × 368 | RGBA (Transparent) | Full mark with warm ivory lettering for dark panels |
| `frontend/public/brand/tarka-symbol-dark.png` | 463 × 463 | RGBA (Transparent) | Fold emblem tuned for dark slate/espresso backgrounds |
| `frontend/public/tarka-logo.png` | 1444 × 368 | RGBA (Transparent) | Canonical public root logo asset |
| `frontend/public/tarka-icon.png` | 463 × 463 | RGBA (Transparent) | Canonical public root square icon asset |
| `frontend/public/tarka-logo-dark.png` | 1444 × 368 | RGBA (Transparent) | Canonical public dark logo asset |
| `frontend/public/tarka-icon-dark.png` | 463 × 463 | RGBA (Transparent) | Canonical public dark icon asset |
| `frontend/public/tarka-icon-dark.svg` | Vector | SVG | Dark mode vector fallback preventing 404s |
| `frontend/public/favicon.ico` | Multi-res (16/32/64) | ICO | Official browser tab favicon with terracotta fold |
| `frontend/src/assets/brand/*` | Multiple | RGBA | Bundled frontend assets for direct Vite imports |

---

## 3. UI/UX Placement & Integration Points

### 3.1 Authoritative Brand Component (`TarkaLogo.tsx`)
- **Location:** `frontend/src/components/common/TarkaLogo.tsx`
- **Variants Supported:**
  - `full`: Complete terracotta fold symbol + serif wordmark with diamond dots.
  - `icon` / `mark`: High-density square fold symbol.
  - `wordmark`: High-precision typography wordmark.
- **Surface Modes:**
  - `theme="light"`: Espresso monogram (`#2B1E16`) + terracotta wing (`#C85A32`) for warm ivory (`#FFFDF8` / `#F8F4ED`).
  - `theme="dark"`: Warm ivory monogram (`#FFFDF8`) + terracotta wing (`#C85A32`) for dark slate (`#1A1715` / `#0D0C0B`).
- **Resilience:** Implements automatic SVG vector fallbacks if image loading fails, ensuring zero broken image states.
- **Accessibility:** Full ARIA labeling (`aria-label="TARKA — Return to Workspace"`) and keyboard navigation support (`Enter` / `Space`).

### 3.2 Global Header Anchor (`V6Topbar.tsx`)
- **Placement:** Left anchor adjacent to `UpgradedCaseSwitcher`.
- **Interaction:** One-click navigation back to tactical command centre (`workspace`).
- **Visual Styling:** Tactile skeuomorphic pill container with subtle inset shadow, ivory bevel, and terracotta border accent.
- **Shortcuts:** Keyboard shortcut `W` or `H` displayed in tooltips.

### 3.3 Collapsible Command Rail (`V6Rail.tsx`)
- **Expanded State:** Features full branded banner with `TarkaLogo variant="full" theme="dark"`, accompanied by `v6.0-PROD` build badge and `TARKASH` command status indicator.
- **Collapsed State:** Displays square `TarkaLogo variant="icon" theme="dark"` with gold hover ring. Clicking returns investigator to `workspace`.

### 3.4 Investigation Workspace Hero Banner (`HomeScreen.tsx`)
- **Placement:** Top hero card across the main triage dashboard.
- **Visual Styling:** Elevated warm ivory panel (`#FFFDF8`) with 2px terracotta border (`#C85A32`), featuring `TarkaLogo variant="full" theme="light"` alongside the `V6 CANONICAL` green status badge and `तर्क` Devanagari script.

### 3.5 Particle Voice Field HUD (`ParticleHomeScreen.tsx`)
- **Placement:** Upper glass HUD bezel above the 3D particle canvas.
- **Interaction:** Branded logo with interactive `WORKSTATION [W]` tactical button, enabling instant return to the case desk.

### 3.6 Hardware Voice Console Bezel (`TarkaVoiceModal.tsx`)
- **Placement:** Top hardware control bezel in the investigator voice terminal.
- **Visual Styling:** Inset tactile metal casing with `TarkaLogo variant="icon" theme="dark"` pulsing synchronously with live audio frequency modulation.

---

## 4. Keyboard Shortcuts & Wayfinding Navigation

| Shortcut Key | Target Screen | Description |
|---|---|---|
| `W` / `w` | `workspace` | Jumps immediately to Tactical Command Centre |
| `H` / `h` | `home` | Opens the Particle Voice Field & Forensic HUD |
| `1` – `6` | Stages 1 through 6 | Direct jumps across investigative workflow stages |
| `V` / `v` | Voice Modal | Toggles the hardware particle voice interface |
| `A` / `a` | Copilot Drawer | Toggles the forensic reasoning copilot |
| `Ctrl+K` / `Cmd+K` | Global Search | Opens instant entity, case, and artifact search |

---

## 5. Verification Checklist

- [x] High-res master logo decontaminated and converted to transparent RGBA.
- [x] All 8 brand derivatives generated and synced into `frontend/public/brand/` and `frontend/public/`.
- [x] Multi-resolution favicon (`16x16`, `32x32`, `64x64`) deployed to `frontend/public/favicon.ico`.
- [x] `tarka-icon-dark.svg` created to eliminate 404 network errors in dark rail.
- [x] `TarkaLogo.tsx` unified component deployed across all major screens.
- [x] Global keyboard navigation verified (`W`, `H`, `1`-`6`, `V`, `A`, `Ctrl+K`).
- [x] Zero layout shifts or aspect-ratio distortions across desktop, tablet, and mobile breakpoints.
