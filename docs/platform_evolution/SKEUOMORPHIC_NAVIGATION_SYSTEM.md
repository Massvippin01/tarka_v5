# TARKA | SKEUOMORPHIC NAVIGATION SYSTEM
## Curved Glass Sidebar, Tactile Depth & Hierarchical Ergonomics

**Design References:**  
- Curved Sidebar Reference (`media_1794840860217_e1ee28a3.jpg`)  
- Skeuomorphism Dashboard (`media_1794840860217_e3fd6ebb.jpg` & `media_1794840860218_7dc5eedd.jpg`)  
**Implementation Files:** `frontend/src/v6/shell/V6Rail.tsx` & `frontend/src/v6/styles/v6-tokens.css`  

---

## 1. Visual Architecture & Curved Glass Silhouette

Inspired directly by the user's reference photograph, the TARKA navigation rail transitions away from generic flat boxes toward a **sculpted curved silhouette** with physical depth and restrained specular highlights:

```
┌───────────────────────────────────────┐)
│ TARKA  [◂]                          │ )
│                                       │  )
│ ┌───────────────────────────────────┐ │   )
│ │ (RR) Insp. Rajeshwar Rao    [PRO] │ │    )  Curved Specular Right Edge
│ │      UID: 2026-IND-04             │ │   )   border-radius: 0 24px 24px 0
│ └───────────────────────────────────┘ │  )    box-shadow: 6px 0 28px -6px
│                                       │ )     linear-gradient(180deg, #1A1614...
│ PRIMARY                               │)
│  • Home (Orb Interface)               │)
│  • Command Centre                     │)
│  • Investigations (All Cases)         │)
│  • Evidence Ledger & Intake           │)
│  • Universal AI Copilot               │)
│  • Statutory Reports (§63 BSA)        │)
│                                       │)
│ INVESTIGATION TOOLS (Stage 4/6)       │)
│  ├── 1. Evidence & Ledger             │)
│  ├── 2. People & Accounts             │)
│  ├── 3. Money Trail                   │)
│  ├── 4. Fraud Network Graph (Active)  │)
│  ├── 5. Device, SIM & Claims          │)
│  └── 6. Actions & Recovery            │)
│                                       │)
│ LABORATORY                            │)
│  • Temporal Evidence Loom             │)
│  • Benchmark & Scale Lab (10k/s)      │)
│  • Privacy & Cryptographic ZKP        │)
│                                       │)
│ ADMINISTRATION                        │)
│  • Settings & Station                 │)
│  • Health & Diagnostics (100% Pulse)  │)
│                                       │)
│ ┌───────────────────────────────────┐ │)
│ │ 🔒 NOTICE: BSA §63 Hash Lockdown  │ │)
│ │ Verify Manifest →                 │ │)
│ └───────────────────────────────────┘ │)
└───────────────────────────────────────┘)
```

---

## 2. Component Taxonomy

### 2.1 Officer Profile Header (Nova PRO Equivalent)
Matches the top profile component in the reference photo:
- Circular avatar with green active status jewel.
- Officer Rank & Name: `Insp. Rajeshwar Rao`.
- Badge: `PRO` (high-contrast amber capsule).
- National Forensic Identifier: `UID: 2026-IND-04`.

### 2.2 Hierarchical Navigation Groups
1. **PRIMARY**:
   - `Home`: Enters the deep black particle orb interface.
   - `Command Centre`: Enters the warm ivory skeuomorphic operational overview.
   - `Investigations`: Multi-case registry and Golden Hour status.
   - `Evidence Ledger`: Admitted artifacts and streaming intake.
   - `Universal AI Copilot`: Keyboard-accessible (`A`) evidence-grounded assistant.
   - `Statutory Reports`: Section 63 BSA certificate exports.
2. **INVESTIGATION TOOLS**:
   - Features indented vertical tree lines (`border-l border-white/10`) connecting the 6 forensic investigation steps.
   - Visual step markers (1 to 6) with green checkmark circles for completed gates and pulsing amber indicators for active steps.
3. **LABORATORY**:
   - Temporal Evidence Loom, Benchmark Lab (calibrated to 10,000 transactions/second), and Privacy ZKP Merkle trees.
4. **ADMINISTRATION**:
   - Station settings and diagnostic health with 100% cryptographic integrity pulse.

### 2.3 Bottom Bulletin / Notice Card
Directly translates the "NOTICE" bulletin card from the reference image:
- Background: Dark walnut gradient (`from-[#2B231E] to-[#1C1714]`).
- Icon: Amber padlock / diamond emblem.
- Legal Notification: *"Section 63 BSA Hash Lockdown Active. All ingested artifacts cryptographically sealed."*
- Action Link: *"Verify Manifest →"*.

