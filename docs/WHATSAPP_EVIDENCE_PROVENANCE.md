# TARKA — WHATSAPP EVIDENCE PROVENANCE & CUSTODY LINEAGE
**Document ID:** TARKA-WA-PROV-2026-V6  
**Classification:** Forensic Evidence Integrity & Custody Specification  
**Standard:** Section 63 Bharatiya Sakshya Adhiniyam (BSA) 2023  
**Status:** VERIFIED & COMPLIANT  

---

## 1. Evidentiary Invariants

Under Section 63 BSA 2023, electronic evidence transmitted over consumer messaging channels carries no legal presumption of authenticity without demonstrable provenance, unaltered bitstream custody, and explicit chain of custody:

> **Constitutional Rule:** Electronic records received via WhatsApp are DATA_ONLY. WhatsApp media is never accepted as canonical evidence merely because it arrived over a secured channel.

---

## 2. Provenance Record Schema

Every accepted WhatsApp artifact produces a dual entity in the Canonical Fraud Schema:

### 2.1 EvidenceArtifact Entity
```json
{
  "entity_type": "EvidenceArtifact",
  "entity_id": "ART-WA-HBgLMjAy",
  "attributes": {
    "wamid": "wamid.HBgLMjAyNjExMjgxNDA1MzQxFgASEA==",
    "sha256_hash": "3ee008a4389031846b41249b92eb295ff68f7b767ef2cbbe415b3c0e1e698888",
    "byte_count": 524288,
    "mime_type": "application/pdf",
    "file_name": "victim_hdfc_statement.pdf",
    "associated_case_id": "CASE-2026-001",
    "triage_status": "ASSIGNED_TO_CASE",
    "admitted_at_utc": "2026-11-28T14:47:00Z"
  },
  "provenance_connector": "CONN-COMM-WHATSAPP-01",
  "confidence": 0.92
}
```

### 2.2 Communication Observation Entity
```json
{
  "entity_type": "Communication",
  "entity_id": "COMM-WA-HBgLMjAy",
  "attributes": {
    "channel": "WHATSAPP",
    "sender_phone_masked": "+91******3210",
    "sender_phone_sha256": "8f4e2c1b9a...",
    "sender_display_name": "Sunil Kumar",
    "timestamp_utc": "2026-11-28T14:46:40Z",
    "identity_verified": false,
    "statutory_caveat": "Sender phone does not establish legal identity. Requires secondary verification under Section 63 BSA."
  },
  "provenance_connector": "CONN-COMM-WHATSAPP-01"
}
```

---

## 3. Statutory Rejection & Human Escalation Triggers

An inbound WhatsApp submission triggers mandatory human investigator escalation if:
1. **Unassigned Case Reference:** The message lacks an explicit valid FIR, case ID, or 1930 acknowledgment number.
2. **Exceeded Compression Threshold:** Received images have been severely compressed by consumer WhatsApp transcoding, obscuring UTR digits.
3. **Mule Conduit Self-Report:** The sender claims to have forwarded money under instruction (potential victim-to-mule conversion).
