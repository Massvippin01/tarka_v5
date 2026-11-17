# TARKA | SKEUOMORPHIC FORENSIC COMMAND CENTRE DESIGN SYSTEM SPECIFICATION

**System Name:** TARKA Tactile Forensic Command System (v6.2)  
**Governing Doctrine:** AI PROPOSES. EVIDENCE VERIFIES. HUMAN DECIDES.  
**Target Environment:** High-stakes cyber-fraud investigation workstations, forensic laboratories, and judicial presentation terminals.  
**Compliance Standard:** WCAG 2.2 Level AA (Contrast $\ge 4.5:1$ normal text, $\ge 3.0:1$ large text/graphical controls).

---

## 1. Design Philosophy & Architectural Doctrine

TARKA is not a generic SaaS dashboard, a consumer banking portal, or a gaming HUD. It is a specialised, institution-grade cyber-fraud investigation and attribution workbench engineered for law enforcement officers, forensic analysts, bank vigilance authorities, and judicial magistrates.

The visual architecture is founded on **Tactile Institutional Skeuomorphism**:
1. **Calm Authority:** Surfaces evoke the tactile, precision feel of calibrated physical forensic hardware (oscilloscopes, cryptographic hardware security modules, and heavy institutional paper dossiers).
2. **Physical Hierarchy & Layered Depth:** Interactive elements possess tangible weight through micro-bevels, dual-layer soft ambient shadows, and recessed inset wells.
3. **Evidentiary Traceability:** Visual state directly mirrors evidentiary state. No status color or indicator is decorative; every highlight represents an underlying cryptographic, mathematical, or statutory property.

---

## 2. Canonical Color Tokens

The color palette utilizes a warm ivory and graphite foundation accented with burnt orange and strictly restrained forensic status indicators.

### 2.1 Workspace Surfaces & Foundations
| Token | Hex Value | Role & Semantic Application |
|---|---|---|
| `--tarka-canvas` | `#E9E2D7` | Deep recessed canvas background behind floating viewports |
| `--tarka-background` | `#F1ECE4` | Primary application workstation background canvas |
| `--tarka-surface` | `#F8F4ED` | Secondary surface, container sections, and card backdrops |
| `--tarka-surface-raised` | `#FFFDF8` | Elevated primary cards, active panels, and interactive inspection widgets |
| `--tarka-surface-inset` | `#E5DDD1` | Recessed data tables, search inputs, code wells, and sunken telemetry channels |

### 2.2 Structural & Navigation Graphite
| Token | Hex Value | Role & Semantic Application |
|---|---|---|
| `--tarka-graphite` | `#292522` | Navigation rail chassis, terminal command bar, and structural frames |
| `--tarka-graphite-soft` | `#3B332F` | Sub-navigation containers, dark hover wells, and inactive button wells |
| `--tarka-brown` | `#49362E` | Active navigation pill surfaces, primary command buttons, and dark elevation |
| `--tarka-brown-light` | `#655044` | Structural bevel highlights and high-contrast dark borders |

### 2.3 Typography & Legibility Scale
| Token | Hex Value | Role & Semantic Application |
|---|---|---|
| `--tarka-text-primary` | `#292522` | High-contrast body text, primary values, and table figures (14.5:1 on `#FFFDF8`) |
| `--tarka-text-secondary` | `#756A60` | Section subtitles, column headers, and secondary captions (5.1:1 on `#FFFDF8`) |
| `--tarka-text-muted` | `#978B7F` | Timestamp metadata, cryptographic hash prefixes, and tertiary hints |

### 2.4 Structural Borders & Separators
| Token | Hex Value | Role & Semantic Application |
|---|---|---|
| `--tarka-border` | `#D5CABE` | Standard panel hairline borders and table row gridlines |
| `--tarka-border-strong` | `#BDB0A3` | High-definition card perimeters, input focus borders, and splitters |

### 2.5 Restrained Forensic Status & Accents
| Token | Hex Value | Soft Background | Semantics & Admissibility Rule |
|---|---|---|---|
| `--tarka-accent` | `#A85C2A` | `#EED9C7` | Primary system active highlight, selected workflow stage, primary actions |
| `--tarka-success` | `#287653` | `#DCEBE1` | Verified evidence, cryptographically sealed Merkle root, clean double-entry |
| `--tarka-warning` | `#A66A17` | `#F5E9D2` | Golden-hour urgency countdown, unverified third-party claims, clock skew |
| `--tarka-danger` | `#B6423B` | `#F5DFDC` | Critical falsification (Finacle CBS Row #14 mismatch), synthetic mule sink |
| `--tarka-info` | `#476D91` | `#E0EAF1` | Telemetry channels, CGNAT port forwarding, neutral network topology |

---

## 3. Physical Skeuomorphic Depth & Bevel Specification

Skeuomorphic depth in TARKA is achieved through balanced, physics-grounded light models: light originates from the top-center ($90^\circ$).

### 3.1 Raised Panels (`.tarka-panel`, `.v6-card`)
```css
.tarka-panel, .v6-card {
  background: var(--tarka-surface-raised, #FFFDF8);
  border: 1px solid var(--tarka-border, #D5CABE);
  border-radius: 12px;
  box-shadow:
    0 2px 4px rgba(55, 40, 29, 0.05),
    0 8px 20px rgba(55, 40, 29, 0.05),
    inset 0 1px 0 rgba(255, 255, 255, 0.9);
  transition: border-color 140ms ease, box-shadow 140ms ease;
}

.tarka-panel:hover, .v6-card:hover {
  border-color: var(--tarka-border-strong, #BDB0A3);
  box-shadow:
    0 4px 8px rgba(55, 40, 29, 0.07),
    0 12px 28px rgba(55, 40, 29, 0.07),
    inset 0 1px 0 rgba(255, 255, 255, 0.9);
}
```

### 3.2 Recessed Wells & Inputs (`.tarka-inset`, `.v6-inset`)
```css
.tarka-inset, .v6-inset, input, select, textarea {
  background: var(--tarka-surface-inset, #E5DDD1);
  border: 1px solid var(--tarka-border, #D5CABE);
  border-radius: 10px;
  box-shadow:
    inset 0 2px 5px rgba(55, 40, 29, 0.08),
    inset 0 1px 2px rgba(55, 40, 29, 0.05);
}
```

### 3.3 Tactile Grounded Buttons (`.tarka-button`, `.v6-btn`)
```css
.tarka-button, .v6-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  height: 36px;
  padding: 0 14px;
  border-radius: 8px;
  font-weight: 600;
  font-size: 13px;
  border: 1px solid var(--tarka-border, #D5CABE);
  background: var(--tarka-surface-raised, #FFFDF8);
  color: var(--tarka-text-primary, #292522);
  cursor: pointer;
  box-shadow:
    0 2px 3px rgba(55, 40, 29, 0.08),
    inset 0 1px 0 rgba(255, 255, 255, 0.8);
  transition: all 140ms cubic-bezier(0.2, 0.8, 0.2, 1);
}

.tarka-button:active, .v6-btn:active {
  transform: translateY(1px);
  box-shadow: inset 0 1px 2px rgba(55, 40, 29, 0.2);
}

.v6-btn.primary {
  background: var(--tarka-accent, #A85C2A);
  border-color: var(--tarka-accent, #A85C2A);
  color: #FFFDF8;
  box-shadow:
    0 2px 4px rgba(168, 92, 42, 0.28),
    inset 0 1px 0 rgba(255, 255, 255, 0.3);
}

.v6-btn.primary:hover {
  background: var(--accent-hover, #8D491E);
  border-color: var(--accent-hover, #8D491E);
  box-shadow:
    0 4px 8px rgba(168, 92, 42, 0.38),
    inset 0 1px 0 rgba(255, 255, 255, 0.35);
}
```

---

## 4. Typography Scale & Strict 12px Font Floor

To guarantee judicial legibility and prevent eye strain during 12-hour investigative shifts, TARKA enforces a **strict 12px minimum font floor** across all DOM nodes.

| Typographic Level | Font Family | Size | Weight | Line Height | Usage |
|---|---|---|---|---|---|
| **Display Title** | Inter | 26–28px | 700 (Bold) | 1.2 | Primary workstation banner & case hero |
| **Section Head** | Inter | 18–20px | 650 (SemiBold) | 1.3 | Panel headers & modal titles |
| **Card / Subhead** | Inter | 14–16px | 600 (SemiBold) | 1.4 | Module cards, KPI headers |
| **Body Content** | Inter | 13–14px | 500 (Medium) | 1.5 | Narrative text, facts, hypotheses |
| **Financial Figures** | JetBrains / IBM Plex Mono | 22–28px | 700 (Bold) | 1.1 | Booked loss, lien amounts (`tnum`) |
| **Forensic Metadata** | JetBrains / IBM Plex Mono | 12px (FLOOR) | 600 (Medium) | 1.4 | SHA-256 hashes, RRNs, timestamps |

---

## 5. Navigation Chassis & Shared Shell

The application navigation is housed in a warm graphite vertical chassis (`#292522`) that anchors the eye:
- **Collapsed Rail:** 64px width with centered tactile icon glyphs and active status indicator rings.
- **Expanded Rail:** 260px width with structured categories:
  - **HUB:** Command Center, All Cases Registry.
  - **ACTIVE CASE DOSSIER:** Dynamic mini-card with FIR number, complainant name, golden-hour live countdown badge.
  - **INVESTIGATION WORKFLOW (Stages 1–6):** Evidence & Ledger, People & Accounts, Money Trail, Fraud Network, Device & SIM, Actions & Report.
  - **FORENSIC LAB:** Court Dossier (§63 BSA), Privacy & ZKP, Workstation (Loom, Claims, DAG), Benchmarks (10k/s).
  - **SYSTEM:** Settings & Station Governance, Health & Diagnostics (100% cryptographic integrity).
  - **OFFICER FOOTER:** Authenticated IO credentials with active session ring.
- **Horizontal Topbar:** 52px height in warm ivory `#FFFDF8` with integrated Case Switcher popover, statutory case lifecycle control, command palette trigger (`⌘K`), golden-hour radial indicator, and Ask TARKA AI copilot.

---

## 6. Accessibility & Verification Checklist

- [x] All normal text on surface cards exceeds 4.5:1 contrast ratio (`#292522` on `#FFFDF8` = 14.5:1).
- [x] All secondary text exceeds 4.5:1 contrast ratio (`#756A60` on `#FFFDF8` = 5.1:1).
- [x] Dark graphite navigation rail text exceeds 7.0:1 contrast ratio (`#FFFDF8` on `#292522` = 14.5:1).
- [x] Interactive buttons provide visible keyboard focus rings (`focus-visible:ring-2 ring-[#A85C2A]`).
- [x] Tabular numbers enforce monospace alignment (`font-variant-numeric: tabular-nums`).
- [x] Zero text renders below 12px font size.
- [x] Responsive layout verified from mobile (390px) to ultra-wide (1920px).

