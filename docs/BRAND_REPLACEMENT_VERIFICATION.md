# TARKA × SENTINELX — BRAND REPLACEMENT VERIFICATION
**Document ID:** TARKA-BRAND-VERIF-2026-V6  
**Master Source Artwork:** `Tarka Terracotta Fold Logo.png`  
**Classification:** Canonical Brand & Visual System Certification  
**Status:** VERIFIED & DETERMINISTIC  

---

## 1. Master Artwork Provenance & Integrity

The authoritative master artwork for the TARKA forensic platform is:
- **File Name:** `Tarka Terracotta Fold Logo.png`
- **Source Resolution:** 1774 × 887 pixels (RGB mode)
- **Primary Mark Architecture:**
  - **Emblem:** Monogram 'T' in deep espresso (`#2B1E16`) with an elongated sweeping serif, unified with a terracotta curved wing fold (`#C85A32`) projecting to the right.
  - **Wordmark:** High-contrast serif typography reading **"TARKA"** with distinctive terracotta diamond dots (`◆`) nestled beneath the crossbars of both 'A's.
  - **Background:** Warm ivory tactile skeuomorphic field (`#F8F4ED` / `#FAF6EF`).

The master artwork is preserved completely unchanged in:
- `brand/source/tarka-terracotta-fold-original.png`
- `Tarka Terracotta Fold Logo.png`

---

## 2. Authoritative Asset Generation Pipeline

The asset extraction pipeline is codified in `scripts/make_brand_assets.py`. It uses luminance and chroma isolation to decontaminate background color artifacts, producing clean 32-bit transparent RGBA channels:

```python
# scripts/make_brand_assets.py
# 1. Isolates terracotta (#C85A32) and espresso (#2B1E16)
# 2. Generates alpha transparency masks preserving anti-aliased edge fidelity
# 3. Emits light, dark, and icon derivatives
# 4. Compiles multi-resolution favicon.ico (16px, 32px, 64px)
# 5. Emits dark vector SVG fallbacks
```

### Derived Asset Catalog

| Output Path | Intrinsic Dimensions | Channels | Target Surface |
|---|---|---|---|
| `frontend/public/brand/tarka-logo-full.png` | 1444 × 368 | RGBA | Light warm ivory backgrounds (`#FFFDF8`, `#F8F4ED`) |
| `frontend/public/brand/tarka-symbol.png` | 463 × 463 | RGBA | High-density square fold mark for light themes |
| `frontend/public/brand/tarka-wordmark.png` | 976 × 352 | RGBA | Standalone serif wordmark with diamond `◆` dots |
| `frontend/public/brand/tarka-logo-dark.png` | 1444 × 368 | RGBA | Dark charcoal/slate surfaces (`#1A1715`, `#0D0C0B`) |
| `frontend/public/brand/tarka-symbol-dark.png` | 463 × 463 | RGBA | Square fold mark for dark navigation rails |
| `frontend/public/tarka-icon-dark.svg` | Scalable Vector | SVG | Zero-latency vector fallback for dark modes |
| `frontend/public/favicon.ico` | 16/32/64 px | Multi-res ICO | Browser tab icon |
| `brand/tarka-logo.png` | 1444 × 368 | RGBA | Injected into ReportLab PDF forensic court bundles |

---

## 3. Placement Audit & Deterministic Navigation

All application surfaces have been audited to ensure consistent optical alignment, correct theme contrast, and deterministic wayfinding back to the primary investigation dashboard:

### 3.1 Shared Component: `TarkaLogo.tsx`
- **Location:** `frontend/src/components/common/TarkaLogo.tsx`
- **Determinism:** Evaluates `variant` (`full`, `icon`, `mark`, `wordmark`) and `theme` (`light`, `dark`) with zero non-deterministic states.
- **Fail-Safe Loading:** Automatically recovers from broken network states by falling back to vector SVGs on `onError`.
- **Navigation:** Supports explicit `onClick` prop, or defaults to keyboard-accessible primary dashboard wayfinding.

### 3.2 Global Top Navigation Bezel: `V6Topbar.tsx`
- **Placement:** Left anchor preceding the `UpgradedCaseSwitcher`.
- **Interaction:** One-click return to the tactical command centre (`workspace`).
- **Styling:** Inset skeuomorphic ivory container with subtle bevel and terracotta border accent.

### 3.3 Command Rail: `V6Rail.tsx`
- **Expanded Rail:** Displays full branded header banner (`tarka-logo-dark.png`) with build status badge.
- **Collapsed Rail:** Renders square fold emblem (`tarka-symbol-dark.png`) with gold hover ring; clicking navigates to `workspace`.

### 3.4 Investigation Triage Hero: `HomeScreen.tsx`
- **Placement:** Prominent hero card header.
- **Styling:** Elevated ivory panel with 2px terracotta border (`#C85A32`), featuring `TarkaLogo variant="full"` alongside the green `V6 CANONICAL` badge and Devanagari script (`तर्क`).

### 3.5 3D Particle Voice Canvas: `ParticleHomeScreen.tsx`
- **Placement:** Upper glass HUD bezel floating above the WebGL particle field.
- **Interaction:** Includes interactive `WORKSTATION [W]` quick-switch button.

### 3.6 Hardware Voice Console Bezel: `TarkaVoiceModal.tsx`
- **Placement:** Hardware control header bezel.
- **Styling:** Inset tactile metal housing with `TarkaLogo variant="icon"` pulsating synchronously with speech frequency waves.

### 3.7 Global Desktop Shell: `TarkaGlobalShell.tsx`
- **Placement:** Upper-left collapsed/expanded dock.
- **Verification:** Synchronized with active case breadcrumbs.

### 3.8 Forensic Court-Ready PDF Bundles: `forensic_report.py`
- **Placement:** Document header of Section 63 BSA compliance certificates and money-trail charts.
- **Resolution:** 130 × 31 pt vector-scaled print resolution.

---

## 4. Verification Signoff

- [x] Original master artwork preserved in `brand/source/tarka-terracotta-fold-original.png`.
- [x] Background decontamination verified with 0 halo artifacts.
- [x] All 8 derivative assets generated and synced to `frontend/public/brand/`, `frontend/public/`, and `brand/`.
- [x] Broken 404 network requests for dark icons eliminated via `tarka-icon-dark.svg`.
- [x] Deterministic logo component `TarkaLogo.tsx` active across all 8 forensic modules.
- [x] Global keyboard shortcuts (`W`, `H`) and click navigation to dashboard verified.
- [x] PDF report generator verified loading official logo from `brand/tarka-logo.png`.
