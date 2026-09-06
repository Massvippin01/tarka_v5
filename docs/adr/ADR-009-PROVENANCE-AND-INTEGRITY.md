# ADR-009: Provenance Traceability & Audit Cryptographic Hash Chaining

- **Status**: Approved & Implemented
- **Date**: 2026-08-30
- **Context**: Investigative platform integrity requires end-to-end evidence provenance traceability and tamper-resistant audit logging.

## Decision
1. **Backward Traceability Standard**: Implement `ProvenanceService` (`provenance.py`, `provenance_service.py`) exposing full 6-stage lineage (`SOURCE RECORD ➔ OBSERVATION ➔ ER ➔ RELATIONSHIP ➔ SIGNAL ➔ EVIDENCE ➔ CLAIM ➔ AI RESPONSE`).
2. **SHA-256 Content Integrity Hashing**: Compute SHA-256 hashes for evidence payloads (`INTEGRITY_VERIFIED`).
3. **Audit Cryptographic Hash Chaining**: Upgrade `AuditService` (`audit_service.py`) with cryptographic SHA-256 hash chaining (`event_hash = SHA256(previous_hash + payload)`).
4. **Tamper Detection Verification**: Endpoint `GET /api/v1/investigation/audit/verify-integrity` validates 100% hash chain continuity.

## Consequences
- **Positive**:
  - 100% verifiable audit log integrity with cryptographic tamper detection.
  - Complete backward traceability from AI response to synthetic source record.
