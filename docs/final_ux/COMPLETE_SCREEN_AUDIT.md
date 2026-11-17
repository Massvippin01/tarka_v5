# TARKA | Complete Screen-by-Screen Technical & Forensic Audit

## Overview

This document provides a screen-by-screen technical, forensic, and statutory audit covering all 22 operational screens in the TARKA workbench.

---

## 1. Audit Summary Matrix

| # | Screen / Route ID | Title | Key Data Ingested | Primary Forensic Output | Statutory Authority |
| :--- | :--- | :--- | :--- | :--- | :--- |
| 1 | `home` | Particle Intelligence Home | Live Audio / Voice commands | Autonomous intent resolution | SUTRAM Core |
| 2 | `workspace` | Command Centre Workspace | Case metadata, active alerts | Real-time investigation status | BNSS §94 |
| 3 | `evidence` | Evidence Locker | Raw PDFs, CSVs, CDRs, PCAPs | Immutable SHA-256 artifacts | BSA §63 |
| 4 | `ledger` | Evidence Ledger | Admitted financial records | Conservation balance equation | PMLA §5 |
| 5 | `timeline` | Temporal Money Trail | Transaction timestamps, RRNs | Microsecond chronology & hops | BNSS §107 |
| 6 | `graph` | Fraud Network Graph | Neo4j projection, entity links | Mule hub community detection | IT Act §66D |
| 7 | `contradictions` | Discrepancy Matrix | Dual-party claims, statements | Surfaced conflicts & gaps | Indian Evidence Act |
| 8 | `device-telemetry` | Device & SIM Telemetry | CGNAT IP/Port, IMEI, IMSI | Subscriber identity attribution | DoT CGNAT Norms |
| 9 | `attribution` | Attribution & Syndicate | High-centrality clusters, IP pools | Threat actor syndicate profiling | MHA I4C Guidelines |
| 10 | `court-ready` | Judicial Proof & Actions | Case findings, hash audit log | Section 63 BSA legal certificate | BSA §63 |
| 11 | `claim-compiler` | Forensic Claim Compiler | Natural language hypotheses | Formally typed investigative claims | Coq / Z3 Logic |
| 12 | `dependency-lens` | Claim Dependency Lens | Provenance links, evidence IDs | Claim dependency DAG | SUTRAM PS04 |
| 13 | `flight-recorder` | Investigation Flight Recorder | All user/AI actions, hash chain | Append-only tamper-evident audit | ISO 27037 |
| 14 | `provenance-dag` | Cryptographic Provenance DAG | Artifact SHA-256 parent hashes | Merkle-DAG chain of custody | RFC 6962 |
| 15 | `benchmark-lab` | SUTRAM Benchmark Lab | Synthetic 10k-50k transaction feeds | Precision, Recall, Throughput | SUTRAM PS04 Eval |
| 16 | `entity-resolution` | Identity Resolution Station | Multi-source accounts, Aadhaar, PAN | Non-automatic identity merge queue | DPDP Act 2023 |
| 17 | `people-accounts` | Suspect & Account Registry | KYC exports, mule bank accounts | Account risk classification | RBI AML Directives |
| 18 | `money-trail` | Multi-State Waterfall | Cross-border and inter-bank flows | Flow recovery priority matrix | BNSS §107 |
| 19 | `taint-engine` | UTXO Taint Propagator | Deposit hops, split fractions | FIFO/Haircut taint distribution | AML/CFT Guidelines |
| 20 | `case-workspace` | Case Record Dossier | Notes, supervisor sign-offs | Signed case closure report | CrPC / BNSS |
| 21 | `health-diagnostics` | System Health & Integrity | Service ping, Neo4j, Postgres, S3 | Operational readiness status | ISO 27001 |
| 22 | `settings` | Sovereign Platform Config | Environment variables, API keys | Sovereign offline/cloud settings | SUTRAM PS04 |

---

## 2. Screen Detail Profiles (Selected Critical Screens)

### 2.1 Screen 01: Particle Intelligence Home (`home`)
- **Visual Design**: Strict black-first (`#07090D`) canvas with central 8,800-point Fibonacci sphere. Zero navigation rails, zero conventional headers.
- **Interactivity**: Push-to-talk (`Spacebar`), continuous hands-free listening with silence auto-commit ($1,200\text{ms}$ debounce), Indic language cycler (`[L]`), and quick keyboard commands (`[W]` for Workspace, `[O]` for Offline toggle).
- **Core Doctrine**: Serves as the conversational gateway where the investigator speaks intent without cognitive friction.

### 2.2 Screen 04: Evidence Ledger (`ledger`)
- **Mathematical Formula**:
  $$\sum \text{Debits}_{\text{Victim}} - \sum \text{Credits}_{\text{Mule}} = \Delta \text{Discrepancy}$$
- **Visual Highlight**: Rows with unresolved timestamp discrepancies (e.g., RRN `402918273645`) display amber glow borders and link to the source exhibit PDF.

### 2.3 Screen 08: Device & SIM Telemetry (`device-telemetry`)
- **Telecommunication Invariant**: Resolves Carrier-Grade NAT (CGNAT) by correlating:
  $$\text{Public IPv4} + \text{Source Port} + \text{Exact Microsecond UTC} \rightarrow \text{Unique Subscriber MSISDN}$$
- **Forensic Guarantee**: Prevents false arrest of innocent subscribers sharing the same public IP.

### 2.4 Screen 10: Judicial Proof & Actions Report (`court-ready`)
- **Statutory Output**: Generates digitally signed Section 63 Bharatiya Sakshya Adhiniyam (BSA) certificates containing:
  1. Primary device hash and acquisition hash.
  2. Operating system and hash algorithm (`SHA-256`).
  3. Officer declaration under penalty of perjury.
  4. Merkle root of the Investigation Flight Recorder audit chain.

