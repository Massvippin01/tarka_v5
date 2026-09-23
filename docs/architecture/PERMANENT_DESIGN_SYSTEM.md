# SentinelX Nexus — Permanent Design Lock (Wave 5)
**Status:** IMMUTABLE ARCHITECTURAL FOUNDATION  
**Authority:** Principal Systems Architect & Lead Engineer  
**Scope:** Universal Design Language across all SentinelX interfaces, components, navigation, intelligence surfaces, and forensic workspaces.

---

## 1. Executive Mandate

This document serves as the **permanent, immutable design foundation** for SentinelX.

> **IMMUTABILITY INSTRUCTION:**
> Do not reinterpret, redesign, simplify, modernize, or replace the visual language established here in later screens. All future interfaces must inherit this system. New functionality may extend the system, but must not create a competing visual language.

---

## 2. Product Identity

SentinelX is an **evidence-centric investigative intelligence operating system** engineered for:
- Sworn Investigators
- Digital Forensic Analysts
- Criminal Intelligence Analysts
- Authorized Supervisory Officers

### Explicit Negative Invariants
SentinelX is **NOT**:
- A generic AI dashboard
- A chatbot
- A cybersecurity / SOC dashboard
- A police complaint filing portal
- A standalone graph visualizer
- A SaaS analytics product

It is engineered as a **professional investigative instrument** centered on evidence, reasoning, verification, and human decision-making.

---

## 3. Core Experience & Design Psychology

### The Investigative Flow
$$\text{DISCOVER} \longrightarrow \text{CONNECT} \longrightarrow \text{VERIFY} \longrightarrow \text{RECONSTRUCT} \longrightarrow \text{EXPLAIN} \longrightarrow \text{DECIDE}$$

### The Sovereign Principle
$$\text{\textbf{AI PROPOSES}} \longrightarrow \text{\textbf{EVIDENCE VERIFIES}} \longrightarrow \text{\textbf{HUMAN DECIDES}}$$

### Cognitive Design Rules
- The investigator must understand the system immediately without requiring training in machine learning or AI architectures.
- **Prioritize:**
  1. **Orientation**: Where am I in the case?
  2. **Comprehension**: What does this evidence mean?
  3. **Evidence**: What is the verifiable raw artifact?
  4. **Uncertainty**: What are the error bounds and alternative interpretations?
  5. **Authorization**: Under what legal power is this tool being executed?
  6. **Next Action**: What procedural step is required?
- Never overwhelm the investigator with simultaneous intelligence.
- Reveal complexity progressively.
- Do not make the interface "look intelligent"; make its **information architecture** intelligent.

---

## 4. Permanent Visual Identity & Palette (Light Forensic Workstation)

SentinelX uses the design DNA of the institutional login screen across the entire authenticated product: quiet, editorial, institutional, precise, warm, restrained, confident, and memorable.

### Canonical Foundation Surfaces
| Token | Name | Hex Code | Role |
| :--- | :--- | :--- | :--- |
| `--bg-canonical` | Warm Forensic Ivory / Paper | `#F4F1EA` | Universal application background |
| `--surface-primary` | Primary Workstation Surface | `#FAF8F3` | Dominant analytical surface, sheets, tables |
| `--surface-secondary` | Secondary Workstation Surface| `#ECE8DF` | Secondary panels, rows, headers |
| `--surface-elevated` | Elevated Sheet | `#FFFFFF` | Form fields, active sheets |
| `--text-primary` | Primary Ink | `#1E1D1A` | Primary editorial content, titles, facts |
| `--text-secondary` | Secondary Ink | `#625E57` | Field labels, secondary descriptions |
| `--text-muted` | Technical Ink | `#8C877E` | Subtle timestamps, structural captions |
| `--border-structural`| Structural Divider Rule | `#D8D2C7` | High-precision 1px panel boundaries |
| `--border-subtle` | Subtle Row Divider | `#E5E0D6` | Table rows, inner separators |

---

### The Primary Sentinel Identity
$$\text{\textbf{Deep Institutional Crimson: }} \mathbf{\#AE2D30} \quad (\text{Dark Crimson: } \mathbf{\#8F2528})$$

This is the distinctive, emotional anchor of SentinelX.

**Permitted Usage of Crimson (`#AE2D30`):**
- Active investigation focus
- Critical attention & unresolved contradictions
- Sentinel analyst marker & reasoning focus
- Important primary actions & statutory buttons
- Security clearance warnings & selected states

**Prohibited Usage:**
- Do NOT turn the entire interface red.
- Use crimson sparingly as a surgical accent.
- The interface must look balanced and authoritative even in grayscale.

---

### Restrained Semantic State Taxonomy (Never Neon)

| State / Meaning | Family | Hex Code | Semantic Rule |
| :--- | :--- | :--- | :--- |
| **Integrity-Confirmed / Verified** | Deep Forensic Green | `#1E6F43` | Ground truth, unbroken custody, corroboration $\ge 2$ |
| **Contradiction / Conflict** | Institutional Crimson | `#AE2D30` | Kinematic impossibility, conflicting alibis |
| **Evidence Gap / Missing KYC** | Ochre / Amber | `#B45309` | Deductive hole, missing CAF, unverified lead |
| **Restricted / Authorization** | Deep Violet | `#5B21B6` | Section 91 CrPC / Section 94 BNSS warrant required |
| **Unknown / Ambiguous Identity** | Muted Gray | `#625E57` | Candidate match pending human adjudication |

### Button Language
- **Primary Action**: Deep crimson background (`#AE2D30`) + ivory text (`#FAF8F3`).
- **Secondary Action**: Transparent/ivory background (`#FAF8F3`) + thin dark border (`#D8D2C7`) + ink text (`#1E1D1A`).
- **Control Form Factor**: Compact rectangular controls with small radius (2-4px) or square corners. Zero gradients, zero pill shapes.

---

## 5. Typography Standards

- **Editorial Headings & Document Titles**: `IBM Plex Serif`, `Source Serif 4`, `Georgia`, `serif`
- **Operational UI**: `Inter`, `-apple-system`, `BlinkMacSystemFont`, `Segoe UI`, `sans-serif`
- **Technical & Forensic Metadata**: `IBM Plex Mono`, `Courier Prime`, `monospace`

### Compact Professional Scale
| Size | Token / Class | Usage |
| :--- | :--- | :--- |
| **11px** | `.text-meta` | Metadata, hashes, timestamps, cell azimuths, coordinate tuples |
| **12px** | `.text-secondary` | Dense secondary descriptions, audit trail events, raw logs |
| **13px** | `.text-body` | Operational UI, form fields, action buttons, table rows |
| **15px** | `.text-primary` | Primary content, claim text, observation summaries |
| **17px** | `.text-section` | Section emphasis, subsection headers, inspector titles |
| **19px** | `.text-contextual`| Contextual headings, drawer titles, modal anchors |
| **22px** | `.text-workspace` | Dominant workspace headers, center surface headers |
| **26px** | `.text-case` | Major case headings, FIR case identifiers |

*Oversized marketing typography (36px+) is strictly prohibited inside the operational workspace.*

---

## 6. Information Architecture & Navigation

### Immediate Operational Context
SentinelX **does not feature a consumer or marketing landing page**. The authenticated application opens directly into operational context with case context persisted globally.

### Primary Navigation Taxonomy
1. **COMMAND** — Central operational command answering *"What requires investigative attention now?"*
2. **CASES** — Case portfolio, jurisdiction, FIR registrations, case metadata.
3. **EVIDENCE** — Content-addressed artifact catalog, custody ledger, ingestion gateway.
4. **ENTITIES** — Resolved identity dossiers, phones, vehicles, bank accounts, persons.
5. **TIMELINE** — Spatiotemporal sequence with uncertainty intervals ($\pm \Delta t, \pm r$).
6. **CONTRADICTIONS** — Detected kinematic anomalies and conflicting statements.
7. **GAPS** — Formal deductive gaps (missing CAF, unverified counterparties).
8. **PROOF** — Bidirectional cryptographic lineage (Claim $\leftrightarrow$ CAS Artifact).
9. **SOURCES** — 11-family source adapter fabric telemetry and ingestion status.
10. **MEMORY** — Persistent case working memory, verified facts, investigator notes.
11. **REPORTS** — Court-ready Section 65B IEA / Section 63 BSA forensic dossiers.
12. **AUDIT** — Immutable append-only audit trail of all officer actions and tool executions.

---

## 7. Master Workspace Layout

The application viewport adheres to an **asymmetric, open analytical space**:

```
+----------------------------------------------------------------------------------------------------+
| TOP BAR: [Case ID] [Jurisdiction] [Classification] [Data Env] [Search Ctrl+K] [Officer Session]   |
+----+---------------------------------------------------------------+-------------------------------+
|    |                                                               |                               |
| N  |                                                               | CONTEXTUAL SENTINEL INSPECTOR |
| A  |                DOMINANT INVESTIGATIVE SURFACE                 |                               |
| V  |                                                               | Attached to active selection: |
|    |  • Command Attention Feed                                     | • Entity Dossier              |
| R  |  • Evidence Graph Projection                                  | • Evidence Lineage            |
| A  |  • Spatiotemporal Timeline                                    | • Claim Reasoning             |
| I  |  • Contradiction Center                                       | • Policy Gateway              |
| L  |  • Evidence Gap Center                                        | • Planning / Info Gain        |
|    |                                                               |                               |
+----+---------------------------------------------------------------+-------------------------------+
| BOTTOM DOCK: [Investigation State Telemetry] [Append-Only Delta] [Live Proof Drawer]              |
+----------------------------------------------------------------------------------------------------+
```

- **LEFT**: Compact collapsible navigation rail (48px collapsed, 200px expanded).
- **TOP**: Global orientation bar displaying Case ID, Jurisdiction, Security Classification, Data Environment, Search, and Session.
- **CENTER**: Dominant, unobstructed investigative surface.
- **RIGHT**: Contextual Sentinel inspector attached dynamically to the active object.
- **BOTTOM**: Collapsible tray for timeline, state telemetry, append-only delta, and Live Proof.

---

## 8. Anti-AI-Slop Code of Architecture

The following stylistic treatments are **strictly prohibited**:
- ❌ Generic AI cards with gradient backgrounds
- ❌ Purple-to-pink AI gradients
- ❌ AI sparkles (`✨`) or magic-wand icons
- ❌ Glassmorphism, backdrop blurs on analytical tables
- ❌ Glowing neon borders or pulsing sci-fi rings
- ❌ Cyberpunk / hacker terminal tropes
- ❌ 3D floating holograms or gaming HUD aesthetics
- ❌ Giant detached chatbot conversational windows
- ❌ Dense "badge forests" of meaningless decorative tags
- ❌ Card grids with identical equal-sized boxes
- ❌ Meaningless decorative force-directed graph loops
- ❌ Marketing hero sections
- ❌ Excessive pill buttons or overly rounded containers ($>4\text{px}$)

### Required Structural Patterns
- Direct, structured rows with tabular alignment
- Open canvas with asymmetric analytical focus
- Explicit evidence chains and step-by-step lineage
- Precise 1px structural dividers (`#283244`)
- Monospaced cryptographic metadata and timestamps
- Typographic grouping using font weight and clean hierarchy

---

## 9. Governed Intelligence Layer & Policy Gateway

Sentinel never executes unmonitored or un-audited autonomous actions. Every intelligence tool request flows through a strict **Policy Gateway**:

$$\text{User Objective} \longrightarrow \text{Policy Gateway} \longrightarrow \text{Authorized Tool} \longrightarrow \text{Evidence Retrieval} \longrightarrow \text{Investigation Planner} \longrightarrow \text{Information-Gain Analysis} \longrightarrow \text{Sentinel Reasoning} \longrightarrow \text{Evidence Verification} \longrightarrow \text{Human Action}$$

Every tool execution displays:
1. **WHO**: Officer ID and authorized role
2. **WHAT**: Action requested (e.g., CDR Tower Triangulation)
3. **WHY**: Grounded investigative justification
4. **CASE**: Scoped case identifier
5. **JURISDICTION**: Police station / territorial authority
6. **AUTHORITY**: Statutory citation (e.g., Section 91 CrPC / Section 94 BNSS)
7. **DATA CLASSIFICATION**: LE Sensitive / Restricted / Sealed
8. **PURPOSE**: Specific evidential purpose

Policy Gateway Verdicts:
- `ALLOW`: Pre-authorized statutory extraction within case scope.
- `DENY`: Out-of-jurisdiction, unsealed wiretap without judicial order, or scope violation.
- `REQUIRES CONFIRMATION`: High-impact action (subpoena issuance, warrant requisition, external agency query).

---

## 10. Voice Modality Standards

Voice navigation operates as a **first-class, governed modality** engineered for Indian investigative realities (supporting English, Indian names, transliteration, phone numbers, vehicle registrations, and case IDs).

### Explicit Voice States
1. `READY` — System standby; microphone idle.
2. `LISTENING` — Active capture; clear visual recording indicator (Coral Crimson `#FF4F41`).
3. `TRANSCRIBING` — Speech-to-text decoding.
4. `UNDERSTANDING` — Intent extraction and slot filling.
5. `RETRIEVING` — Ingestion gateway query.
6. `ANALYZING` — Knowledge graph traversal.
7. `VERIFYING` — Cryptographic hash and custody check.
8. `CONFIRMATION` — Modal requiring officer signature/approval for sensitive queries.
9. `RESPONDING` — Crisp technical audio synthesis or visual prompt.

*Hidden or background listening is strictly forbidden. A persistent visual state badge must always reflect the exact microphone state.*

---

## 11. India-First Forensic Realities

Interfaces and data structures natively model:
- Police FIRs with sections of Indian Penal Code (IPC) / Bharatiya Nyaya Sanhita (BNS 2023).
- CCTNS and ICJS interoperable record schemas.
- Electronic evidence compliance with Section 65B Indian Evidence Act (IEA) and Section 63 Bharatiya Sakshya Adhiniyam (BSA 2023).
- Procedural requisitions under Section 91 Code of Criminal Procedure (CrPC) and Section 94 Bharatiya Nagarik Suraksha Sanhita (BNSS 2023).
- Complex Indian name handling (honorifics, caste/community surnames, aliases, Latin-Indic transliteration).
- Vehicle registrations under the Bharat Motor Vehicle Act / Vahan database format.
- E.164 phone numbering with telecom circle and circle nodal officer routing.

---

## 12. Final Acceptance Checklist

Before accepting any interface or component, verify:
- [x] Does it look AI-generated? *(If yes, reject immediately)*
- [x] Does it look like a generic SaaS dashboard? *(If yes, reject immediately)*
- [x] Does every container and column have a specific evidentiary reason?
- [x] Is the investigator's most critical information visually dominant?
- [x] Can a first-time investigator understand the state without ML knowledge?
- [x] Can an expert complete deep forensic analysis without context switching?
- [x] Does evidence visually outrank AI inferences?
- [x] Are uncertainty bounds ($\pm \Delta t, \pm r$) explicit and readable?
- [x] Is the legal authorization and policy gateway visible?

**DESIGN LOCK ACTIVATED.**
