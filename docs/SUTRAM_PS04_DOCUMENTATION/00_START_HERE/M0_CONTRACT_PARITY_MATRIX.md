# TARKA SUTRAM 2026 PS04: M0 CONTRACT PARITY MATRIX
## Detailed Field-by-Field Parity: Python Pydantic v2 vs. TypeScript Interfaces

**Document Version:** 1.0.0-PS04-PARITY-MATRIX  
**Date:** November 5, 2026  
**Status:** 100% TYPED PARITY VERIFIED  
**Backend Reference:** `backend/tarka/contracts/canonical_v1.py`  
**Frontend Reference:** `frontend/src/types/contracts/canonicalV1.ts`  

---

# 1. PARITY AUDIT SUMMARY

```
+---------------------------------------------------------------------------------------------------------+
| CANONICAL CONTRACT PARITY TABLE                                                                         |
+----+-----------------------------+-----------------------+-----------------------+----------+-----------+
| #  | Contract Name               | Python Pydantic Model | TypeScript Interface  | Fields   | Parity    |
+----+-----------------------------+-----------------------+-----------------------+----------+-----------+
| 01 | Case Contract               | `CanonicalCase`       | `CanonicalCase`       | 13 / 13  | 100% MATCH|
| 02 | Evidence Contract           | `CanonicalEvidence`   | `CanonicalEvidence`   | 17 / 17  | 100% MATCH|
| 03 | Entity Contract             | `CanonicalEntity`     | `CanonicalEntity`     | 12 / 12  | 100% MATCH|
| 04 | Relationship Contract       | `CanonicalRelationship| `CanonicalRelationship| 12 / 12  | 100% MATCH|
| 05 | Transaction Contract        | `CanonicalTransaction`| `CanonicalTransaction`| 19 / 19  | 100% MATCH|
| 06 | Claim Compiler Contract     | `CanonicalClaim`      | `CanonicalClaim`      | 15 / 15  | 100% MATCH|
| 07 | Institution Event Contract  | `CanonicalInstitution*| `CanonicalInstitution*| 15 / 15  | 100% MATCH|
| 08 | PSI Request Contract        | `CanonicalPSIRequest` | `CanonicalPSIRequest` | 12 / 12  | 100% MATCH|
| 09 | PSI Result Contract         | `CanonicalPSIResult`  | `CanonicalPSIResult`  | 9 / 9    | 100% MATCH|
| 10 | ZK Proof Metadata Contract  | `CanonicalZKProofMeta*| `CanonicalZKProofMeta*| 12 / 12  | 100% MATCH|
| 11 | AI Annotation Contract      | `CanonicalAIAnnotation| `CanonicalAIAnnotation| 13 / 13  | 100% MATCH|
| 12 | Benchmark Result Contract   | `CanonicalBenchmark*  | `CanonicalBenchmark*  | 12 / 12  | 100% MATCH|
+----+-----------------------------+-----------------------+-----------------------+----------+-----------+
|    | COMMON ENVELOPES & PRIMS                                                                            |
+----+-----------------------------+-----------------------+-----------------------+----------+-----------+
| 13 | API Response Envelope       | `APIResponse[T]`      | `APIResponse<T>`      | 3 / 3    | 100% MATCH|
| 14 | API Error Response Envelope | `APIErrorResponse`    | `APIErrorResponse`    | 2 / 2    | 100% MATCH|
| 15 | Paginated Response Envelope | `PaginatedResponse[T]`| `PaginatedResponse<T>`| 4 / 4    | 100% MATCH|
+----+-----------------------------+-----------------------+-----------------------+----------+-----------+
```

---

# 2. ENUM AND SPECIAL VALIDATOR PARITY

1. **`TrustTier`**: `T1`, `T2`, `T3` (both).
2. **`CaseStatus`**: `OPEN`, `INVESTIGATION`, `ADJUDICATION`, `CHARGESHEET_FILED`, `CLOSED` (both).
3. **`EvidenceSourceType`**: `BANK_STATEMENT`, `UPI_GATEWAY`, `IPDR_LOG`, `CDR_TELECOM`, `DEVICE_EXTRACTION`, `WHATSAPP_EXPORT`, `CELL_TOWER_DUMP`, `MANUAL_DEPOSITION` (both).
4. **`IntegrityState`**: `INTACT`, `TAMPERED`, `UNVERIFIED`, `DISPUTED` (both).
5. **`EvidenceClassification`**: `PRIMARY`, `SECONDARY`, `CORROBORATIVE`, `HEARSAY` (both).
6. **`EntityType`**: `INDIVIDUAL`, `COMPANY`, `MULE_ACCOUNT`, `TELECOM_SUBSCRIBER`, `DEVICE`, `MERCHANT` (both).
7. **`ReviewState`**: `PENDING_REVIEW`, `CONFIRMED_MERGE`, `REJECTED_MERGE`, `VERIFIED`, `REJECTED`, `DISPUTED`, `INSUFFICIENT_EVIDENCE` (both).
8. **`RelationshipType`**: `TRANSFERRED_FUNDS`, `COMMUNICATED_WITH`, `SHARED_DEVICE`, `GEO_PROXIMATE_TO`, `BENEFICIARY_OF`, `NOMINEE_OF` (both).
9. **`RelationshipNature`**: `OBSERVED`, `INFERRED` (both).
10. **`TransactionType`**: `UPI_P2P`, `UPI_P2M`, `NEFT`, `RTGS`, `IMPS`, `ATM_CASH_WITHDRAWAL`, `POS_PURCHASE`, `CRYPTO_ONRAMP` (both).
11. **`TransactionValidationState`**: `VALID`, `INVALID_CHECKSUM`, `DUPLICATE_SUSPECT`, `MALFORMED` (both).
12. **`ReconciliationStatus`**: `UNRECONCILED`, `MATCHED_BOTH_BANKS`, `ORPHAN_DEBIT`, `ORPHAN_CREDIT`, `CONTRADICTORY_AMOUNTS` (both).
13. **`ClaimType`**: `ALIBI`, `FUND_DISSIPATION`, `MULE_SYNDICATE`, `IDENTITY_THEFT`, `UNAUTHORIZED_ACCESS`, `PRESENCE_AT_CRIME_SCENE` (both).
14. **`ClaimState`**: `SUPPORTED`, `CONTRADICTED`, `UNCERTAIN`, `UNSUPPORTED`, `NOT_EVALUATED` (both).
15. **`InstitutionEventType`**: `EVIDENCE_INGESTED`, `TRANSACTION_FLAGGED`, `FREEZE_DIRECTIVE_ISSUED`, `IDENTITY_LINK_PROPOSED`, `CASE_STATE_UPDATED`, `AUDIT_CHECKPOINT` (both).
16. **`EventValidationState`**: `COMMITTED`, `PENDING`, `CONFLICTED`, `QUARANTINED` (both).
17. **`PSIIdentifierType`**: `MSISDN`, `PAN`, `UPI_VPA`, `BANK_ACCOUNT`, `AADHAAR_HASH` (both).
18. **`PSIPermittedOutput`**: `CARDINALITY_ONLY`, `BLINDED_INTERSECTION`, `MUTUAL_INTERSECTION` (both).
19. **`PSIResultState`**: `SUCCESS`, `UNAUTHORIZED`, `TIMEOUT`, `PARAM_MISMATCH` (both).
20. **`ZKProvingSystem`**: `GROTH16_BN254`, `PLONK_CIRCOM`, `BULLETPROOFS` (both).
21. **`AnnotationTargetType`**: `EVIDENCE`, `TRANSACTION`, `ENTITY`, `TIMELINE_INTERVAL` (both).
22. **`HumanApprovalState`**: `PROPOSED`, `ACCEPTED_BY_IO`, `REJECTED_BY_IO`, `MODIFIED_BY_IO` (both).
23. **`BenchmarkWorkstream`**: `MEMBER_A_GRAPH`, `MEMBER_B_CRYPTO_DISTRIBUTED`, `MEMBER_C_EVALUATION` (both).

### Semantic Parity Verification:
- **Nullability:** Optional fields in Pydantic (`Optional[T] = None`) correspond to optional nullable fields in TypeScript (`fieldName?: T | null`).
- **Hashes:** 64-character hex validator on `sha256_digest` and `payload_commitment` matches strict 64-char string types.
- **Amounts:** Amounts are non-negative floats in Pydantic (`Field(ge=0.0)`) and numbers in TypeScript.

