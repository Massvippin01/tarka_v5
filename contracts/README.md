# TARKA SUTRAM 2026 PS04: CANONICAL CONTRACTS V1 VAULT

This directory contains the canonical v1 contracts and validated example JSON payloads governing cross-workstream interoperability between Member A, Member B, and Member C.

### Directory Structure:
```
contracts/
└── canonical_v1/
    └── examples/
        ├── 01_canonical_case.json
        ├── 02_canonical_evidence.json
        ├── 03_canonical_entity.json
        ├── 04_canonical_relationship.json
        ├── 05_canonical_transaction.json
        ├── 06_canonical_claim.json
        ├── 07_canonical_institution_event.json
        ├── 08_canonical_psi_request.json
        ├── 09_canonical_psi_result.json
        ├── 10_canonical_zk_proof_metadata.json
        ├── 11_canonical_ai_annotation.json
        ├── 12_canonical_benchmark_result.json
        ├── 13_api_error_response.json
        └── synthetic_case_fixture.json
```

### Implementations:
- **Backend (Python / Pydantic v2):** `backend/tarka/contracts/canonical_v1.py`
- **Frontend (TypeScript):** `frontend/src/types/contracts/canonicalV1.ts`
- **Mock Interfaces:** `backend/tarka/contracts/mocks.py`
- **Synthetic Fixture Generator:** `backend/tarka/contracts/synthetic_fixture.py`
- **Automated Tests:** `backend/tests/test_canonical_contracts_v1.py` and `frontend/src/types/contracts/__tests__/canonicalV1.test.ts`

