# SUTRAM 2026 — PROBLEM STATEMENT PS04
# FINAL COMPETITION DOSSIER: 10. UI/UX FORENSIC WORKBENCH SPECIFICATION

**Problem Statement:** PS04 — AI-Powered Cyber Fraud Investigation & Attribution System  
**Frontend Stack:** React 18 + Vite 8.0.16 + TypeScript 5.x + TailwindCSS + WebCrypto API  
**Design Paradigm:** Bento Executive Design System with Air-Gapped Font Bundles  
**Governing Doctrine:** AI PROPOSES. EVIDENCE VERIFIES. HUMAN DECIDES.

---

## 1. THE 10-SCREEN INVESTIGATION WORKBENCH

The TARKA frontend is organized into 10 high-density forensic screens designed specifically for law enforcement officers:

```
+---------------------------------------------------------------------------------------------------------+
|                                    TARKA WORKBENCH NAVIGATION RAIL                                      |
+------+----------------------+---------------------------------------------------------------------------+
| Num  | Screen Name          | Core Forensic Capability                                                  |
+------+----------------------+---------------------------------------------------------------------------+
| 00   | Command Hub          | Bento multi-case workspace, Golden-Hour SLA tracker (118m), Air-gap status|
| 01   | Evidence Intake      | Double-entry conservation synthesis (Bal_k = Bal_{k-1} + Cr - Dr), RRN   |
|      |                      | Julian day validator, NTP clock drift caliper (±180s bound), 2 %%EOF PDF  |
| 02   | Entity Resolution    | Bipartite token-to-profile matrix (24 tokens -> 5 entities), Hard-veto    |
|      |                      | guardrail (Rohit Verma ↛ Apex Electronics), Section 94 BNSS requisition  |
| 03   | CGNAT Attribution    | Candidate port funnel (340 -> 41 -> 6 -> 1), Bayesian match odds          |
|      |                      | (P = 1.4e-7), GSMA TAC 86749206 hardware twin, Z3 SMT clock offset proof  |
| 04   | Fraud Network        | Controller cluster tethering to 4 mule accounts, IPv4 TTL=63 hotspot hop, |
|      |                      | Shared AP BSSID 74:DA:38:A2:11:BC, JA4 TLS client fingerprint t13d1516h2  |
| 05   | Taint Engine (DAG)   | Dinic Min-Cut freeze budget (K=3), 100% reachability sealed (0/4 exits),  |
|      |                      | LIBR Roscoe v. Winder commercial capital shield, Golden-Hour decay curve  |
| 06   | Court Dossier        | BSA 2023 §63(4) Part A & B certificates, Supreme Court Arjun Khotkar cite,|
|      |                      | Leave-One-Out defense stress tester (5/5 claims survive), RFC-3161 stamp  |
| 07A  | Institutional PSI    | Tripartite SECP256k1 ECDH-PSI, zero non-matching client exposure, DPDPA   |
| 07B  | ZKP Verifier         | Circom Groth16 BN254 threshold verifier (132 R1CS constraints),           |
|      |                      | Adversarial attack simulator (tampered group point π_A injection)         |
| 07C  | PBFT Consensus       | 4-node PBFT inter-bank freeze consensus, Quorum 2f+1=3, Byzantine forgery|
+------+----------------------+---------------------------------------------------------------------------+
```

---

## 2. AIR-GAP & ZERO-EXTERNAL-ASSET COMPLIANCE

In strict accordance with police air-gapped forensic laboratory requirements:
1. **Zero External Font Calls:** All typography (Inter Variable, JetBrains Mono Variable, IBM Plex Sans, IBM Plex Mono) is 100% locally packaged within `frontend/dist/assets/`. Zero calls to `fonts.googleapis.com` or third-party CDNs.
2. **Local WebCrypto Acceleration:** In-browser SHA-256 and HMAC calculations run via the native browser `window.crypto.subtle` API.
3. **Reactive Keyboard Navigation:** Complete accessibility support via shortcut keys: `Alt+W` (Workspaces), `Alt+1..6` (Workbench pipeline), `Alt+D` (Public Benchmarks), `Alt+B` (Lab Diagnostics), and `Ctrl+B` (Sidebar Rail Collapse).
