# M2 TEST EVIDENCE & VERIFICATION LOGS
## Comprehensive Test Execution Transcripts, Assertion Metrics, and Performance Benchmarks

**Milestone:** M2 (Distributed Event Fabric, BFT Consensus, and Vector Clock Ordering)  
**Status:** IMPLEMENTED & VERIFIED  
**Track:** SUTRAM 2026 — Problem Statement PS04  
**Date:** November 5, 2026  
**Governing Doctrine:** AI Proposes. Evidence Verifies. Human Decides.

---

# 1. SUMMARY OF VERIFICATION RUNS

All verification was executed inside `c:\PROJECTS\tarka_v5` against the verified codebase.

| Test Suite / Build Target | Target Scope | Tests Run | Passed | Failed | Execution Time | Status |
|:---|:---|:---:|:---:|:---:|:---:|:---:|
| **M2 Dedicated Suite** | `backend/tests/test_m2_distributed_event_fabric.py` | 18 | 18 | 0 | 0.50s | **PASSED** |
| **Foundation Suite (M0+M1+M2)** | Canonical Contracts, TAIE Foundation, Event Fabric | 45 | 45 | 0 | 1.96s | **PASSED** |
| **Specialized PS04 Suite** | `backend/tests/test_ps04_*.py` | 41 | 41 | 0 | 21.41s | **PASSED** |
| **Frontend Unit / Component Suite** | `frontend/src/**/*.test.tsx` (Vitest) | 40 | 40 | 0 | 0.84s | **PASSED** |
| **Frontend Production Build** | `npm run build` (Vite + TypeScript) | 2,901 modules | — | 0 | 3.95s | **PASSED** |
| **Browser Runtime Verification** | Chrome DevTools MCP via `http://127.0.0.1:5173` | UI & Network | — | 0 | — | **PASSED (0 ERRORS)** |

---

# 2. M2 DEDICATED TEST SUITE TRANSCRIPT

Command:
```powershell
Set-Location "c:\PROJECTS\tarka_v5\backend"; $env:PYTHONPATH=".;backend"; pytest tests/test_m2_distributed_event_fabric.py -v
```

Output:
```text
============================= test session starts =============================
platform win32 -- Python 3.12.1, pytest-8.3.4, pluggy-1.5.0
cachedir: .pytest_cache
rootdir: C:\PROJECTS\tarka_v5\backend
configfile: pytest.ini
plugins: anyio-4.8.0, asyncio-0.25.2
asyncio: mode=Mode.STRICT, default_loop_scope=None
collected 18 items

tests/test_m2_distributed_event_fabric.py::test_01_canonical_contract_bi_directional_conversion PASSED [  5%]
tests/test_m2_distributed_event_fabric.py::test_02_idempotency_duplicate_rejection PASSED [ 11%]
tests/test_m2_distributed_event_fabric.py::test_03_append_only_hash_chain_integrity PASSED [ 16%]
tests/test_m2_distributed_event_fabric.py::test_04_causal_dependency_buffering_and_auto_drain PASSED [ 22%]
tests/test_m2_distributed_event_fabric.py::test_05_multi_node_vector_clock_advancement PASSED [ 27%]
tests/test_m2_distributed_event_fabric.py::test_06_vector_clock_4way_comparison PASSED [ 33%]
tests/test_m2_distributed_event_fabric.py::test_07_temporal_consistency_clock_skew_paradox PASSED [ 38%]
tests/test_m2_distributed_event_fabric.py::test_08_dynamic_vector_clock_pruning PASSED [ 44%]
tests/test_m2_distributed_event_fabric.py::test_09_bft_silent_node_tolerance PASSED [ 50%]
tests/test_m2_distributed_event_fabric.py::test_10_bft_equivocation_detected_and_rejected PASSED [ 55%]
tests/test_m2_distributed_event_fabric.py::test_11_bft_invalid_signature_rejection PASSED [ 61%]
tests/test_m2_distributed_event_fabric.py::test_12_bft_network_partition_and_heal PASSED [ 66%]
tests/test_m2_distributed_event_fabric.py::test_13_bft_leader_failure_and_view_change PASSED [ 72%]
tests/test_m2_distributed_event_fabric.py::test_14_institution_tenant_isolation PASSED [ 77%]
tests/test_m2_distributed_event_fabric.py::test_15_deterministic_state_replay_domain_summary PASSED [ 83%]
tests/test_m2_distributed_event_fabric.py::test_16_deterministic_state_replay_sequence_slice PASSED [ 88%]
tests/test_m2_distributed_event_fabric.py::test_17_claim_bridge_balance_conservation_verified PASSED [ 94%]
tests/test_m2_distributed_event_fabric.py::test_18_claim_bridge_balance_conservation_violation_counterexample PASSED [100%]

============================== 18 passed in 0.50s ==============================
```

---

# 3. COMBINED FOUNDATION REGRESSION SUITE (M0 + M1 + M2)

Command:
```powershell
Set-Location "c:\PROJECTS\tarka_v5\backend"; $env:PYTHONPATH=".;backend"; pytest tests/test_canonical_contracts_v1.py tests/test_taie_integration_foundation.py tests/test_m2_distributed_event_fabric.py -v
```

Output:
```text
============================= test session starts =============================
platform win32 -- Python 3.12.1, pytest-8.3.4, pluggy-1.5.0
cachedir: .pytest_cache
rootdir: C:\PROJECTS\tarka_v5\backend
configfile: pytest.ini
plugins: anyio-4.8.0, asyncio-0.25.2
asyncio: mode=Mode.STRICT, default_loop_scope=None
collected 45 items

tests/test_canonical_contracts_v1.py::test_canonical_contracts_exist_and_import PASSED [  2%]
tests/test_canonical_contracts_v1.py::test_canonical_case_schema PASSED [  4%]
tests/test_canonical_contracts_v1.py::test_canonical_evidence_schema PASSED [  6%]
tests/test_canonical_contracts_v1.py::test_canonical_institution_event_schema PASSED [  8%]
tests/test_canonical_contracts_v1.py::test_canonical_claim_schema PASSED [ 11%]
tests/test_canonical_contracts_v1.py::test_all_14_json_payloads_validate_against_pydantic PASSED [ 13%]
tests/test_canonical_contracts_v1.py::test_deterministic_serialization_reproducible_sha256 PASSED [ 15%]
tests/test_canonical_contracts_v1.py::test_validation_boundary_rejects_malformed_input PASSED [ 17%]
tests/test_canonical_contracts_v1.py::test_domain_field_mapping_preserves_forensic_integrity PASSED [ 20%]
tests/test_canonical_contracts_v1.py::test_immutability_of_provenance_records PASSED [ 22%]
tests/test_canonical_contracts_v1.py::test_error_envelope_standardization PASSED [ 24%]
tests/test_canonical_contracts_v1.py::test_canonical_synthetic_fixture_ground_truth PASSED [ 26%]
tests/test_canonical_contracts_v1.py::test_cross_platform_typescript_python_contract_parity PASSED [ 28%]
tests/test_canonical_contracts_v1.py::test_statutory_reference_preservation PASSED [ 31%]
tests/test_canonical_contracts_v1.py::test_event_envelope_causality_ordering PASSED [ 33%]
tests/test_taie_integration_foundation.py::test_adapter_manifest_schema_and_registration PASSED [ 35%]
tests/test_taie_integration_foundation.py::test_mock_adapters_generate_valid_events PASSED [ 37%]
tests/test_taie_integration_foundation.py::test_field_mapping_transforms_to_canonical_contract PASSED [ 40%]
tests/test_taie_integration_foundation.py::test_provenance_attestation_records_sha256_accurately PASSED [ 42%]
tests/test_taie_integration_foundation.py::test_circuit_breaker_trips_after_consecutive_failures PASSED [ 44%]
tests/test_taie_integration_foundation.py::test_circuit_breaker_resets_after_timeout PASSED [ 46%]
tests/test_taie_integration_foundation.py::test_idempotency_manager_prevents_duplicate_processing PASSED [ 48%]
tests/test_taie_integration_foundation.py::test_schema_evolution_manager_detects_breaking_changes PASSED [ 51%]
tests/test_taie_integration_foundation.py::test_schema_evolution_permits_backward_compatible_changes PASSED [ 53%]
tests/test_taie_integration_foundation.py::test_claim_impact_evaluator_identifies_affected_claims PASSED [ 55%]
tests/test_taie_integration_foundation.py::test_partner_simulation_harness_generates_reproducible_streams PASSED [ 57%]
tests/test_taie_integration_foundation.py::test_taie_health_endpoint_reports_adapter_statuses PASSED [ 60%]
tests/test_m2_distributed_event_fabric.py::test_01_canonical_contract_bi_directional_conversion PASSED [ 62%]
tests/test_m2_distributed_event_fabric.py::test_02_idempotency_duplicate_rejection PASSED [ 64%]
tests/test_m2_distributed_event_fabric.py::test_03_append_only_hash_chain_integrity PASSED [ 66%]
tests/test_m2_distributed_event_fabric.py::test_04_causal_dependency_buffering_and_auto_drain PASSED [ 68%]
tests/test_m2_distributed_event_fabric.py::test_05_multi_node_vector_clock_advancement PASSED [ 71%]
tests/test_m2_distributed_event_fabric.py::test_06_vector_clock_4way_comparison PASSED [ 73%]
tests/test_m2_distributed_event_fabric.py::test_07_temporal_consistency_clock_skew_paradox PASSED [ 75%]
tests/test_m2_distributed_event_fabric.py::test_08_dynamic_vector_clock_pruning PASSED [ 77%]
tests/test_m2_distributed_event_fabric.py::test_09_bft_silent_node_tolerance PASSED [ 80%]
tests/test_m2_distributed_event_fabric.py::test_10_bft_equivocation_detected_and_rejected PASSED [ 82%]
tests/test_m2_distributed_event_fabric.py::test_11_bft_invalid_signature_rejection PASSED [ 84%]
tests/test_m2_distributed_event_fabric.py::test_12_bft_network_partition_and_heal PASSED [ 86%]
tests/test_m2_distributed_event_fabric.py::test_13_bft_leader_failure_and_view_change PASSED [ 88%]
tests/test_m2_distributed_event_fabric.py::test_14_institution_tenant_isolation PASSED [ 91%]
tests/test_m2_distributed_event_fabric.py::test_15_deterministic_state_replay_domain_summary PASSED [ 93%]
tests/test_m2_distributed_event_fabric.py::test_16_deterministic_state_replay_sequence_slice PASSED [ 95%]
tests/test_m2_distributed_event_fabric.py::test_17_claim_bridge_balance_conservation_verified PASSED [ 97%]
tests/test_m2_distributed_event_fabric.py::test_18_claim_bridge_balance_conservation_violation_counterexample PASSED [100%]

============================== 45 passed in 1.96s ==============================
```

---

# 4. SPECIALIZED PS04 SUITE TRANSCRIPT

Command:
```powershell
Set-Location "c:\PROJECTS\tarka_v5\backend"; $env:PYTHONPATH=".;backend"; pytest tests/ -k ps04
```

Output:
```text
============================= test session starts =============================
platform win32 -- Python 3.12.1, pytest-8.3.4, pluggy-1.5.0
collected 110 items / 69 deselected / 41 selected

tests/test_ps04_api_routes.py::test_ps04_health PASSED
tests/test_ps04_api_routes.py::test_ingest_telecom_cdr PASSED
tests/test_ps04_api_routes.py::test_cross_institution_alert PASSED
tests/test_ps04_api_routes.py::test_smt_verification_route PASSED
tests/test_ps04_api_routes.py::test_distributed_event_fabric_route PASSED
tests/test_ps04_api_routes.py::test_full_attribution_workflow PASSED
tests/test_ps04_api_routes.py::test_invalid_cdr_payload PASSED
tests/test_ps04_api_routes.py::test_metrics_route PASSED
tests/test_ps04_claim_compiler.py::test_claim_creation PASSED
tests/test_ps04_claim_compiler.py::test_claim_verification PASSED
tests/test_ps04_claim_compiler.py::test_claim_falsification PASSED
tests/test_ps04_claim_compiler.py::test_contradiction_detection PASSED
tests/test_ps04_claim_compiler.py::test_counterexample_generation PASSED
tests/test_ps04_claim_compiler.py::test_claim_graph_export PASSED
tests/test_ps04_distributed_events.py::test_event_creation PASSED
tests/test_ps04_distributed_events.py::test_event_store_append PASSED
tests/test_ps04_distributed_events.py::test_hash_chain_integrity PASSED
tests/test_ps04_distributed_events.py::test_event_replay PASSED
tests/test_ps04_distributed_events.py::test_vector_clock_comparison PASSED
tests/test_ps04_distributed_events.py::test_pbft_consensus PASSED
tests/test_ps04_distributed_events.py::test_byzantine_fault_tolerance PASSED
tests/test_ps04_e2e_verification.py::test_e2e_evidence_to_attribution PASSED
tests/test_ps04_e2e_verification.py::test_multi_jurisdiction_chain PASSED
tests/test_ps04_e2e_verification.py::test_adversarial_tampering_detection PASSED
tests/test_ps04_e2e_verification.py::test_provenance_chain_export PASSED
tests/test_ps04_e2e_verification.py::test_system_recovery PASSED
tests/test_ps04_graph_attribution.py::test_entity_resolution PASSED
tests/test_ps04_graph_attribution.py::test_community_detection PASSED
tests/test_ps04_graph_attribution.py::test_flow_network_max_flow PASSED
tests/test_ps04_graph_attribution.py::test_subgraph_extraction PASSED
tests/test_ps04_graph_attribution.py::test_cross_layer_correlation PASSED
tests/test_ps04_graph_attribution.py::test_attribution_scoring PASSED
tests/test_ps04_smt_verifier.py::test_financial_conservation PASSED
tests/test_ps04_smt_verifier.py::test_temporal_consistency PASSED
tests/test_ps04_smt_verifier.py::test_identity_uniqueness PASSED
tests/test_ps04_smt_verifier.py::test_sim_swap_temporal_paradox PASSED
tests/test_ps04_smt_verifier.py::test_mule_ring_conservation PASSED
tests/test_ps04_smt_verifier.py::test_contradiction_extraction PASSED
tests/test_ps04_smt_verifier.py::test_proof_generation PASSED
tests/test_ps04_smt_verifier.py::test_unsat_core PASSED
tests/test_ps04_smt_verifier.py::test_performance_benchmarks PASSED

====================== 41 passed, 69 deselected in 21.41s ======================
```

---

# 5. FRONTEND TEST SUITE TRANSCRIPT (VITEST)

Command:
```powershell
Set-Location "c:\PROJECTS\tarka_v5\frontend"; npx vitest run --isolate false
```

Output:
```text
 ✓ src/features/investigations/EvidenceTable.test.tsx (7 tests) 166ms
 ✓ src/features/evidence/EvidenceChainTimeline.test.tsx (6 tests) 184ms
 ✓ src/features/graph/FraudGraphCanvas.test.tsx (6 tests) 140ms
 ✓ src/features/timeline/InvestigationTimeline.test.tsx (7 tests) 154ms
 ✓ src/features/attribution/AttributionCard.test.tsx (7 tests) 188ms
 ✓ src/features/export/CourtExportDialog.test.tsx (7 tests) 172ms

 Test Files  6 passed (6)
      Tests  40 passed (40)
   Start at  17:34:57
   Duration  840ms (transform 210ms, setup 180ms, collect 220ms, tests 1.00s, environment 0ms, prepare 240ms)
```

---

# 6. FRONTEND PRODUCTION BUILD TRANSCRIPT

Command:
```powershell
Set-Location "c:\PROJECTS\tarka_v5\frontend"; npm run build
```

Output:
```text
> tarka-frontend@0.1.0 build
> tsc -b && vite build

vite v8.0.16 building for production...
transforming...
✓ 2901 modules transformed.
rendering chunks...
computing gzip size...
dist/index.html                   1.42 kB │ gzip:   0.68 kB
dist/assets/index-D_nCqYc7.css   34.20 kB │ gzip:   7.14 kB
dist/assets/index-B7VjM2_z.js   612.45 kB │ gzip: 184.22 kB
✓ built in 3.95s
```

---

# 7. CHROME DEVTOOLS BROWSER RUNTIME VERIFICATION

- **Backend Target:** `http://127.0.0.1:8080` (FastAPI / Uvicorn)
- **Frontend Target:** `http://127.0.0.1:5173/?case=upi_payment_discrepancy&nav=investigations` (Vite Proxy forwarding `/api` to port 8080)
- **DevTools Console Log:**
  ```text
  [Page Navigated] -> http://127.0.0.1:5173/?case=upi_payment_discrepancy&nav=investigations
  [Console Messages] -> 0 Fatal errors, 0 Unhandled promise rejections, 0 Network connection refused errors
  [Network Requests] -> GET /api/v1/health -> 200 OK {"status":"healthy","application":"SentinelX"}
  ```
- **Visual Capture Artifact:**
  Screenshot captured and verified at:
  `C:/Users/Administrator/.gemini/antigravity/brain/915dc6ec-ddde-403a-80da-cba89a31ec35/.system_generated/steps/2880/media_0.png`

