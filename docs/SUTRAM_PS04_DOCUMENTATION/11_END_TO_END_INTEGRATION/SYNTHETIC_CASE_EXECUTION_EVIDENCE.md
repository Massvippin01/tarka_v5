# TARKA SUTRAM 2026 — PROBLEM STATEMENT PS04
# CANONICAL SYNTHETIC CASE EXECUTION EVIDENCE & REPLAY LOG

**Document Reference:** `docs/SUTRAM_PS04_DOCUMENTATION/11_END_TO_END_INTEGRATION/SYNTHETIC_CASE_EXECUTION_EVIDENCE.md`  
**Execution Timestamp:** 2026-11-05T19:48:00+05:30  
**Fixture Reference:** `CASE_SUTRAM_2026_001` (*Operation GhostLayer: Multi-Jurisdictional UPI Mule Syndicate*)  
**Ground Truth Specification:** `GT_SUTRAM_PS04_001`  
**Governing Doctrine:** AI PROPOSES. EVIDENCE VERIFIES. HUMAN DECIDES.

---

## 1. CANONICAL INPUT FIXTURE SPECIFICATION

The canonical synthetic case `CASE_SUTRAM_2026_001` provides a deterministic ground-truth dataset designed to thoroughly evaluate digital fraud investigation systems without privacy leakage or synthetic artifacts.

### 1.1 Case Metadata
- **Case Identifier:** `CASE_SUTRAM_2026_001`
- **FIR Number:** `FIR #149/2026 Cyber Crime PS (Special Cell)`
- **Title:** Operation GhostLayer: Multi-Jurisdictional UPI Mule Syndicate
- **Primary Investigating Officer:** Insp. Vikram Sharma (Badge: `DL-CYBER-8842`)
- **Jurisdiction:** Cyber Crime Police Station, South District, New Delhi
- **Incident Window:** 2026-10-15T08:30:00Z to 2026-10-15T10:45:00Z (14:00 to 16:15 IST)
- **Total Loss Incurred:** ₹15,00,000.00 INR (Siphoned via deceptive overlay APK)

### 1.2 Primary Evidence Exhibits
| Exhibit ID | Source Type | Institution ID | Original Object Reference | SHA-256 Digest | Officer Badge |
|---|---|---|---|---|---|
| `EVID_HDFC_001` | `BANK_STATEMENT` | `INST_HDFC_01` | `vault://cases/149/raw/hdfc_acct_1092837465.csv` | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` | `DL-CYBER-8842` |
| `EVID_SBI_001` | `BANK_STATEMENT` | `INST_SBI_01` | `vault://cases/149/raw/sbi_mule_3399448822.csv` | `ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad` | `DL-CYBER-8842` |
| `EVID_AIRTEL_001` | `IPDR_LOG` | `INST_AIRTEL_01` | `vault://cases/149/raw/airtel_ipdr_9876543210.log` | `ca978112ca1bbdcafac231b39a23dc4da786eff8147c4e72b9807785afee48bb` | `DL-CYBER-9912` |

---

## 2. DETAILED STAGE EXECUTION LOG & EVIDENCE OUTPUTS

```json
{
  "execution_run_id": "RUN_M4_20261105_1948",
  "test_suite": "backend/tests/test_m4_end_to_end_integration.py",
  "status": "SUCCESS",
  "total_stages": 25,
  "passed_stages": 25,
  "failed_stages": 0,
  "execution_duration_seconds": 9.89,
  "stage_verifications": [
    {
      "stage": 1,
      "name": "create_synthetic_case",
      "verdict": "PASSED",
      "output": {
        "case_id": "CASE_SUTRAM_2026_001",
        "primary_io": "Insp. Vikram Sharma (DL-CYBER-8842)",
        "statutory_scopes": ["BNS §318(4)", "BNS §319(2)", "IT Act §66C", "IT Act §66D"]
      }
    },
    {
      "stage": 2,
      "name": "register_simulated_institutions",
      "verdict": "PASSED",
      "output": {
        "adapters_registered": 3,
        "institutions": ["HDFC_BANK_MOCK", "SBI_CBS_MOCK", "AXIS_BATCH_MOCK"]
      }
    },
    {
      "stage": 3,
      "name": "ingest_synthetic_evidence",
      "verdict": "PASSED",
      "output": {
        "evidence_items_ingested": 3,
        "trust_tiers": ["T1_HIGH", "T1_HIGH", "T1_HIGH"]
      }
    },
    {
      "stage": 4,
      "name": "preserve_original_records",
      "verdict": "PASSED",
      "output": {
        "storage_mode": "APPEND_ONLY_VAULT",
        "all_vault_uris_valid": true
      }
    },
    {
      "stage": 5,
      "name": "compute_and_verify_integrity_metadata",
      "verdict": "PASSED",
      "output": {
        "all_integrity_states": "INTACT",
        "sha256_checksum_verified": true
      }
    },
    {
      "stage": 6,
      "name": "record_provenance",
      "verdict": "PASSED",
      "output": {
        "transformation_steps_logged": 2,
        "intermediate_hashes_verified": true
      }
    },
    {
      "stage": 7,
      "name": "normalize_heterogeneous_records_taie",
      "verdict": "PASSED",
      "output": {
        "canonical_transactions_produced": 2,
        "currency_normalized": "INR",
        "timestamp_standard": "ISO8601_UTC"
      }
    },
    {
      "stage": 8,
      "name": "identify_entities_and_candidate_relationships",
      "verdict": "PASSED",
      "output": {
        "entities_identified": 3,
        "hard_veto_enforced": true,
        "uncertain_match_state": "PENDING_REVIEW"
      }
    },
    {
      "stage": 9,
      "name": "reconstruct_transaction_flows",
      "verdict": "PASSED",
      "output": {
        "flows_reconstructed": 2,
        "total_inflow": 500000.0,
        "layer_1_amount": 500000.0,
        "layer_2_cashout": 50000.0
      }
    },
    {
      "stage": 10,
      "name": "build_temporal_investigation_graph",
      "verdict": "PASSED",
      "output": {
        "relationships_created": 2,
        "predicates": ["TRANSFERRED_FUNDS", "SHARED_DEVICE"]
      }
    },
    {
      "stage": 11,
      "name": "identify_contradictory_observations",
      "verdict": "PASSED",
      "output": {
        "contradiction_type": "SPATIO_TEMPORAL_IMPOSSIBILITY",
        "observation_a": "SBI ATM Bandra West Mumbai (14:15:00 IST)",
        "observation_b": "Airtel BTS Nehru Place Delhi (14:16:30 IST)",
        "velocity_required_km_h": 45920.0
      }
    },
    {
      "stage": 12,
      "name": "generate_candidate_investigative_claims",
      "verdict": "PASSED",
      "output": {
        "claim_id": "CLAIM_ALIBI_CONTRADICTION_001",
        "claim_state": "CONTRADICTED",
        "adjudication_required": true
      }
    },
    {
      "stage": 13,
      "name": "construct_claim_dependency_graphs",
      "verdict": "PASSED",
      "output": {
        "dag_nodes": 2,
        "dag_edges": 1,
        "evaluation_verdict": "SUPPORTED"
      }
    },
    {
      "stage": 14,
      "name": "evaluate_formal_constraints",
      "verdict": "PASSED",
      "output": {
        "smt_solver": "Z3_4.12.2",
        "invariant": "FINANCIAL_CONSERVATION",
        "satisfied": true,
        "discrepancy": 0.0
      }
    },
    {
      "stage": 15,
      "name": "generate_counterexamples_where_applicable",
      "verdict": "PASSED",
      "output": {
        "smt_solver": "Z3_4.12.2",
        "invariant": "FINANCIAL_CONSERVATION",
        "satisfied": false,
        "counterexample": "Unaccounted discrepancy of ₹-500,000.0"
      }
    },
    {
      "stage": 16,
      "name": "perform_controlled_institutional_psi",
      "verdict": "PASSED",
      "output": {
        "protocol": "ECDH_SECP256K1_PSI",
        "institutions": ["BANK_HDFC", "BANK_SBI", "TELCO_AIRTEL"],
        "intersection_found": ["+919844455566"],
        "privacy_leakage": "ZERO"
      }
    },
    {
      "stage": 17,
      "name": "demonstrate_independently_verified_zk_proof",
      "verdict": "PASSED",
      "output": {
        "proving_system": "GROTH16_BN254",
        "public_threshold": 1500000.0,
        "verification_result": true,
        "witness_confidentiality_preserved": true
      }
    },
    {
      "stage": 18,
      "name": "demonstrate_four_validator_bft_coordination",
      "verdict": "PASSED",
      "output": {
        "protocol": "PBFT_PRACTICAL_BYZANTINE_FAULT_TOLERANCE",
        "total_nodes": 4,
        "quorum_size": 3,
        "consensus_achieved": true,
        "action_committed": "FREEZE_MULE_ACCOUNTS"
      }
    },
    {
      "stage": 19,
      "name": "demonstrate_vector_clock_ordering_and_concurrency",
      "verdict": "PASSED",
      "output": {
        "causal_precedence_detected": "HAPPENS_BEFORE",
        "true_concurrency_detected": "CONCURRENT",
        "no_forced_total_order": true
      }
    },
    {
      "stage": 20,
      "name": "inject_controlled_evidence_modification",
      "verdict": "PASSED",
      "output": {
        "tamper_detected": true,
        "sha256_mismatch_raised": true,
        "injection_prevented": true
      }
    },
    {
      "stage": 21,
      "name": "verify_downstream_claim_invalidation",
      "verdict": "PASSED",
      "output": {
        "initial_claim_state": "SUPPORTED",
        "post_invalidation_claim_state": "UNSUPPORTED",
        "cascade_complete": true
      }
    },
    {
      "stage": 22,
      "name": "recompute_affected_claims",
      "verdict": "PASSED",
      "output": {
        "bridge": "ClaimRecomputationBridge",
        "impacted_claims": 1,
        "recomputed_state": "SUPPORTED",
        "solver_invariant_verified": true
      }
    },
    {
      "stage": 23,
      "name": "record_investigator_decisions",
      "verdict": "PASSED",
      "output": {
        "decision": "CONFIRMED_DECOUPLED_ACCOMPLICE",
        "adjudicator": "Insp. Vikram Sharma (DL-CYBER-8842)",
        "review_status": "HUMAN_CONFIRMED"
      }
    },
    {
      "stage": 24,
      "name": "generate_evidence_linked_investigative_report",
      "verdict": "PASSED",
      "output": {
        "statutory_act": "Bharatiya Sakshya Adhiniyam 2023 §63",
        "exhibit_count": 3,
        "certificate_status": "VALID_SHA256_LINEAGE_ATTESTED"
      }
    },
    {
      "stage": 25,
      "name": "replay_investigation_deterministic",
      "verdict": "PASSED",
      "output": {
        "ledger_blocks_replayed": 3,
        "chain_integrity_verified": true,
        "deterministic_reconstruction": true
      }
    }
  ]
}
```

---

## 3. INDEPENDENT DETERMINISTIC REPLAY VERIFICATION

To verify that the investigation is 100% reproducible on any clean machine:

```powershell
Set-Location "C:\PROJECTS\tarka_v5\backend"
$env:PYTHONPATH=".;backend"
pytest tests/test_m4_end_to_end_integration.py -v
```

Expected output:
```
tests\test_m4_end_to_end_integration.py::test_stage_01_create_synthetic_case PASSED
tests\test_m4_end_to_end_integration.py::test_stage_02_register_simulated_institutions PASSED
...
tests\test_m4_end_to_end_integration.py::test_stage_25_replay_investigation_deterministic PASSED
============================= 25 passed in 9.89s ==============================
```

The investigation state at every millisecond is completely reconstructed by evaluating the signed ledger stream from genesis. No database mutation or foreign state injection is required.

