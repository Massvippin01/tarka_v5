# SENTINELX NEXUS — Data Governance & Provenance Specification

## 1. Provenance Chain Standard
Every canonical record exposes an auditable 6-stage provenance lineage:
```
SOURCE RECORD ➔ OBSERVATION ➔ ENTITY RESOLUTION ➔ RELATIONSHIP ➔ ANALYTICAL SIGNAL ➔ EVIDENCE ➔ VERIFIED CLAIM ➔ AI RESPONSE
```

## 2. Content Integrity Verification
1. **SHA-256 Content Hashing**: Synthetic evidence artifacts generate SHA-256 content hashes to prove integrity (`INTEGRITY_VERIFIED`).
2. **Cryptographic Audit Chaining**: Audit records are cryptographically linked using SHA-256 hash chains (`event_hash = SHA256(previous_hash + payload)`).
3. **Tamper Detection**: Endpoint `GET /api/v1/investigation/audit/verify-integrity` verifies 100% hash chain continuity.

## 3. Synthetic Simulation Boundary
- All data in SentinelX Nexus is explicitly generated synthetic data for SIH 2026 prototype evaluation.
- The UI displays a persistent `SYNTHETIC SIMULATION ENVIRONMENT` pill and explicit adapter labels (`CCTNS ADAPTER — SYNTHETIC`, `NCRP ADAPTER — SYNTHETIC`, `VAHAN ADAPTER — SYNTHETIC`, `CDR ADAPTER — SYNTHETIC`, `ANPR ADAPTER — SYNTHETIC`).
- No connection to live law enforcement production databases is claimed or simulated.
