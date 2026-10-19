# SENTINELX 2026 — Golden Case Specification: Operation Triad Nexus
**Document ID**: `docs/adapters/GOLDEN_CASE_SPEC.md`  
**Case ID**: `CASE-2026-001`  
**Scenario Code**: `SCENARIO-TRIAD-001`  
**Data Path**: `data/fixtures/case_2026_001/`  
**Classification**: `SYNTHETIC_DATA` (Non-production demonstration environment)  

---

## 1. Investigative Scenario Summary

**Operation Triad Nexus** (`CASE-2026-001`) models an inter-state cybercrime and automobile theft syndicate operating across Delhi NCR and Haryana. It connects:
1. Online phishing scams generating illicit funds.
2. Layered UPI mule accounts routing money through non-bank payment interfaces.
3. Physical vehicle logistics moving stolen luxury vehicles across state toll corridors.
4. Digital footprints spanning mobile chats, cloud audit logs, and network C2 traffic.

Every fixture in this dataset belongs to this single coherent investigation.

---

## 2. Directory Layout & Fixture Inventory

```
data/fixtures/case_2026_001/
├── manifest.json                                # Central inventory & metadata
├── case.json                                    # Case envelope definition
├── cctns/
│   └── fir_2026_001.json                       # CCTNS FIR registered in North Delhi
├── icjs/
│   └── icjs_p044.json                          # ICJS Gurugram Sessions Court docket
├── efsl/
│   └── fsl_report_101.json                     # Forensic Science Laboratory digital examination
├── cdr/
│   └── cdr_delhi_gurugram.json                 # Telecom CDR call logs & tower coordinates
├── financial/
│   └── bank_ledger_upi.json                    # SBI & HDFC bank ledgers & UPI transfer logs
├── mobile/
│   └── oneplus11_whatsapp_dump.json            # Cellebrite UFED WhatsApp chat extraction
├── computer/
│   └── laptop_triage.json                      # Laptop forensic triage & darknet history
├── cloud/
│   └── aws_audit_mule_access.json              # AWS CloudTrail IAM authentication logs
├── cctv_anpr/
│   └── anpr_dnd_toll.json                      # ANPR camera toll plate sighting
├── network/
│   └── zeek_dns_traffic.json                   # Zeek network flow & malicious DNS queries
└── documents/
    └── witness_statement_alibi.json            # Witness CrPC 161 statement claiming alibi
```

---

## 3. Intentional Investigative Complexities & Contradictions

To test real reasoning rather than toy dashboards, the golden case incorporates:

### A. Transliteration & Spelling Variations
- Suspect **Vikram Singh** (`P001`) appears as:
  - `"Vikram Singh"` in CCTNS FIR
  - `"Vicky Don"` as alias
  - `"Bikram Sing"` in seized phone contact book
  - Handled by `LayeredEntityResolutionEngine` Stage 6 (Indic Transliteration) yielding candidate match `0.71` requiring human confirmation.

### B. Normalization Variations
- Phone: `"+91 99990-11223"` normalized to `919999011223` via `NormalizationService.normalize_phone`.
- Vehicle Plate: `"dl 01 ab 1888"` normalized to `DL01AB1888` via `NormalizationService.normalize_vehicle_registration`.

### C. Spatial & Temporal Contradictions (Wave 2 Preserves Independently)
- **Observation 1 (CDR)**: 09:38:00Z ping at `TOWER-DEL-SOUTH-88` (South Delhi).
- **Observation 2 (ANPR)**: 09:41:00Z sighting of Creta `DL-01-AB-1888` at DND Toll Plaza.
- **Conflict**: 14 km distance traversed in 3 minutes (~280 km/h) — physically impossible in urban traffic.
- **Wave 2 Rule**: Both observations are preserved as independent facts. No silent reconciliation.

### D. Contradictory Documentary Evidence (Alibi)
- Witness statement of **Alok Saxena** claims Vikram Singh was with him at a coffee shop in Connaught Place continuously from 09:00 to 10:15 AM.
- Directly contradicts physical sighting at DND Toll (09:41) and telecom movements.
- Preserved as a distinct fact of testimony with source reliability `B_USUALLY_RELIABLE`.

### E. Evidence Gaps
- Burner line `+91-9888044556` lacks verified Customer Application Form (CAF) biometric verification.
