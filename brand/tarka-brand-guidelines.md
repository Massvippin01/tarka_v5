# TARKA — OFFICIAL BRAND IDENTITY & DESIGN SPECIFICATION
**Version:** 2.0 (Authoritative Master Release)  
**Classification:** Restricted / Enterprise Forensic Intelligence  
**Design Foundation:** Classical Indian Epistemic Logic (Tarka-Śāstra) × High-Assurance Digital Forensics  
**Master Asset Provenance:** Vectorized from Founder Master Artwork (`media_1795631015441_f471bdd4.jpg`)  

---

## 1. Brand Concept & Architectural Rationale

The name **TARKA** (Sanskrit: तर्क, lit. *“philosophical logic, dialectic reasoning, hypothesis testing”*) embodies the indigenous epistemological tradition of determining truth through rigorous refutation of false claims and competing hypotheses.

The visual mark synthesizes two foundational investigative principles:
1. **The Structural Foundation (Espresso Charcoal `#2B1E16`):**
   - The left structural stem and horizontal lintel form a resolute "T".
   - Represents the unyielding weight of physical evidence, append-only custody ledgers, and deterministic mathematical proof.
2. **The Dynamic Feather / Quill (Terracotta Rust `#C35B34`):**
   - The rightward-sweeping, aerodynamic plume forms the dynamic right wing of the "T".
   - Evokes the investigative quill of justice, rapid golden-hour response, and forward momentum in tracking complex criminal syndicates.
3. **The Illumination Diamonds (Terracotta `#C35B34`):**
   - Both "A"s in the TARKA wordmark feature an open chevron arch with a floating rhomboid diamond.
   - Represents single-point factual illumination emerging from conflicting testimony and noisy sensory streams.

---

## 2. Official Color Palette

```
┌────────────────────────────────────────────────────────────────────────┐
│                        TARKA COLOR HARMONY                             │
│                                                                        │
│   PRIMARY INK          SOVEREIGN ACCENT       WARM CANVAS (LIGHT)      │
│   #2B1E16              #C35B34                #F8F4ED                  │
│   RGB(43, 30, 22)      RGB(195, 91, 52)       RGB(248, 244, 237)       │
│                                                                        │
│   DARK RAIL SURFACE    CARD ELEVATION         DARK ACCENT (LIGHT BG)   │
│   #221C19              #E9E2D7                #D46B44                  │
│   RGB(34, 28, 25)      RGB(233, 226, 215)     RGB(212, 107, 68)        │
│                                                                        │
│   INTEGRITY GREEN      CONTRADICTION RED      EVIDENCE GAP OCHRE       │
│   #059669              #DC2626                #D97706                  │
│   RGB(5, 150, 105)     RGB(220, 38, 38)       RGB(217, 119, 6)         │
└────────────────────────────────────────────────────────────────────────┘
```

| Color Role | Hex Code | RGB | HSL | Usage |
|---|---|---|---|---|
| **Primary Ink** | `#2B1E16` | `43, 30, 22` | `23°, 32%, 13%` | Primary logo typography, headings, structural borders on light surfaces |
| **Sovereign Accent** | `#C35B34` | `195, 91, 52` | `16°, 58%, 48%` | Brand symbol plume, diamond illumination dots, primary CTA accents |
| **Warm Canvas** | `#F8F4ED` | `248, 244, 237` | `38°, 42%, 95%` | Default tactile skeuomorphic application background |
| **Card Elevation** | `#E9E2D7` | `233, 226, 215` | `37°, 29%, 88%` | Physical card beds, borders, raised surfaces, segmented tabs |
| **Dark Rail Surface** | `#221C19` | `34, 28, 25` | `20°, 15%, 12%` | Left navigation rail, floating status capsule, executive command bar |
| **Dark Theme Typography** | `#FFFDF8` | `255, 253, 248` | `43°, 100%, 99%` | Primary text and dark-mode logo wordmark |

---

## 3. Asset Specifications & File Inventory

All assets are generated with sub-pixel mathematical precision and stored in `brand/` and `frontend/public/`:

| File Name | Format | Dimensions | Background | Role & Best Use |
|---|---|---|---|---|
| `tarka-logo.svg` | SVG | `810 × 192` | Transparent | Primary horizontal lockup on warm ivory / light surfaces |
| `tarka-logo-dark.svg` | SVG | `810 × 192` | Transparent | Horizontal lockup for dark surfaces, dark rail, and PDF covers |
| `tarka-icon.svg` | SVG | `256 × 256` | Transparent | Standalone mark for light backgrounds, tab icons, small UI spots |
| `tarka-icon-dark.svg` | SVG | `256 × 256` | Transparent | Standalone mark for dark navigation rail, mobile app launcher |
| `tarka-logo.png` | PNG | `810 × 192` | Transparent | High-DPI raster export for documents, slides, and reports |
| `tarka-icon-256.png` | PNG | `256 × 256` | Transparent | PWA application icon (standard density) |
| `tarka-icon-512.png` | PNG | `512 × 512` | Transparent | PWA splash icon, high-resolution display |
| `favicon.ico` | ICO | `16, 32, 48, 64` | Transparent | Multi-resolution legacy and browser bookmark icon |
| `favicon.svg` | SVG | `256 × 256` | Transparent | Modern responsive SVG favicon for browser tabs |

---

## 4. Typography System

1. **Wordmark / Masthead Typography:**
   - Custom chiseled lapidary serif with classical proportions.
   - Height-to-width ratio: 1:0.62 (Golden mean approximation).
   - Open triangular apex on "A"s with calibrated negative space for diamond suspension.
2. **Interface UI Typography:**
   - **Primary Interface:** `Inter Variable`, `IBM Plex Sans` (400 Regular, 500 Medium, 600 SemiBold).
   - **Telemetry, Hashes & Ledgers:** `JetBrains Mono Variable`, `IBM Plex Mono` (500 Medium, 600 SemiBold). Tabular numbers (`font-variant-numeric: tabular-nums`) enabled across all monetary amounts and transaction counts.
   - **Formal Reports & Section 63 BSA Certificates:** `IBM Plex Serif` / `Helvetica-Bold` for legal precision.

---

## 5. Visual Invariants & Usage Rules

1. **Do NOT Distort Proportions:** Never stretch, compress, shear, or skew the mark or wordmark.
2. **Do NOT Use Artificial Glowing Effects:** Do not apply neon drop-shadows, cyan AI glows, or futuristic lens flares.
3. **Do NOT Replace the Diamonds:** The terracotta diamonds inside both "A"s are structural brand identifiers; never omit them.
4. **Preserve Contrast Hierarchy:** Always use `tarka-logo-dark.svg` on dark charcoal surfaces (`#221C19`) and `tarka-logo.svg` on ivory/linen surfaces (`#F8F4ED`).
5. **Clear Space:** Maintain a clear margin of at least $0.5 \times H$ (half the height of the mark) around all lockups.
