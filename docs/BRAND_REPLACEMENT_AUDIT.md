# TARKA × SENTINELX — BRAND REPLACEMENT AUDIT

**Date:** 2026-11-26  
**Auditor:** Principal UX/UI Designer & Full-Stack Lead  
**Objective:** Comprehensive audit of all brand assets, logos, wordmarks, icons, and typography across the TARKA codebase to ensure 100% adherence to the founder-approved master artwork.

---

## 1. Master Artwork Reference & Geometry

- **Reference Source:** `media_1795631015441_f471bdd4.jpg` (Founder-provided master visual asset)
- **Geometry & Elements:**
  1. **Mark / Symbol:**
     - A stylized initial "T" comprising a deep espresso charcoal horizontal crossbar (`#2B1E16`) with an arched downward stem, counterbalanced by an upward-sweeping aerodynamic terracotta rust plume (`#C35B34`).
  2. **Wordmark:**
     - The word "TARKA" set in a dignified chiseled high-contrast serif typeface.
     - Crucial distinctive detail: Both letter "A"s feature an open chevron apex with an inner floating terracotta diamond (`#C35B34`) centered in place of a solid crossbar.
  3. **Color Palette:**
     - Primary Terracotta: `#C35B34` (Dark mode accent: `#D46B44`)
     - Deep Espresso Charcoal: `#2B1E16` (Dark mode text: `#F8F4ED`)
     - Warm Ivory Light Surface: `#F8F4ED` / `#FAF6EE`
     - Tactical Dark Surface: `#1B1614` / `#231C18`

---

## 2. Audit of System Touchpoints

| Location | Prior State | Upgraded State | Status |
|----------|-------------|----------------|--------|
| **Browser Favicon** | Generic Vite / React icon | Multi-res `favicon.ico` + SVG matching TARKA mark | **REPLACED & VERIFIED** |
| **V6 Navigation Rail (Collapsed)** | Generic shield icon | `<TarkaLogo variant="icon" theme="dark" height={22} />` | **REPLACED & VERIFIED** |
| **V6 Navigation Rail (Expanded)** | Text "TARKA" or placeholder | `<TarkaLogo variant="full" theme="dark" height={22} />` | **REPLACED & VERIFIED** |
| **TarkaGlobalShell Header** | Cyan shield with CSS gradients | `<TarkaLogo variant="full"|"icon" theme="dark" />` | **REPLACED & VERIFIED** |
| **Navbar Brand Block** | Text badge | `<TarkaLogo variant="icon" theme="light" height={28} />` | **REPLACED & VERIFIED** |
| **Multilingual Assistant Header** | Sparkles icon avatar | Dedicated avatar with `<TarkaLogo variant="icon" height={18} />` | **REPLACED & VERIFIED** |
| **Section 63 BSA PDF Certificate** | Text header | High-resolution embedded `tarka-logo.png` | **REPLACED & VERIFIED** |
| **Public Assets Directory** | Empty / Default | `tarka-logo.svg`, `tarka-icon.svg`, PNGs, ICO | **POPULATED & VERIFIED** |

---

## 3. Brand Consistency Verification

- **Stray Logos Check:** A recursive codebase scan across all `.tsx`, `.ts`, and `.py` files confirmed that zero third-party template logos or conflicting brand emblems remain in active application routes.
- **Visual Scaling Test:** Tested `<TarkaLogo />` from 16px to 256px. The SVG vector paths retain sharp subpixel precision with no blurriness or distortion.
- **Theme Adaptability:** Dark theme utilizes crisp warm ivory typography (`#F8F4ED`) on dark rails, while light theme renders rich espresso charcoal typography (`#2B1E16`) on ivory surfaces.
