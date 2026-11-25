import { describe, it, expect } from "vitest";
import type {
  CanonicalCase,
  CanonicalEvidence,
  CanonicalEntity,
  CanonicalRelationship,
  CanonicalTransaction,
  CanonicalClaim,
  CanonicalInstitutionEvent,
  CanonicalPSIRequest,
  CanonicalPSIResult,
  CanonicalZKProofMetadata,
  CanonicalAIAnnotation,
  CanonicalBenchmarkResult,
  APIResponse,
  APIErrorResponse,
} from "../canonicalV1";

describe("Canonical V1 TypeScript Contracts", () => {
  it("constructs and validates CanonicalCase", () => {
    const c: CanonicalCase = {
      case_id: "CASE_2026_001",
      fir_number: "FIR #149/2026",
      title: "Test Cyber Fraud",
      description: "Test description",
      primary_io_name: "Insp. Vikram Sharma",
      primary_io_badge: "DL-CYBER-8842",
      jurisdiction: "Delhi Special Cell",
      created_timestamp_utc: "2026-10-15T11:00:00Z",
      status: "INVESTIGATION",
      schema_version: "v1.0.0",
    };
    expect(c.case_id).toBe("CASE_2026_001");
    expect(c.status).toBe("INVESTIGATION");
  });

  it("constructs and validates CanonicalEvidence with SHA-256", () => {
    const ev: CanonicalEvidence = {
      evidence_id: "EVID_001",
      case_id: "CASE_2026_001",
      source_type: "BANK_STATEMENT",
      source_identifier: "bank.csv",
      original_object_ref: "vault://bank.csv",
      sha256_digest: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
      acquisition_metadata: {
        officer_name: "Insp. Vikram Sharma",
        officer_badge: "DL-CYBER-8842",
        acquisition_tool: "TarkaVault",
        acquisition_timestamp_utc: "2026-10-15T11:30:00Z",
        storage_location: "/vault/raw/bank.csv",
      },
      received_timestamp_utc: "2026-10-15T11:30:00Z",
      parser_name: "BankParser",
      parser_version: "1.0",
      transformation_history: [],
      integrity_state: "INTACT",
      evidence_classification: "PRIMARY",
      access_restrictions: ["CONFIDENTIAL"],
      trust_tier: "T1",
      schema_version: "v1.0.0",
    };
    expect(ev.sha256_digest).toHaveLength(64);
    expect(ev.trust_tier).toBe("T1");
  });

  it("constructs and validates CanonicalEntity and CanonicalRelationship", () => {
    const ent: CanonicalEntity = {
      entity_id: "ENT_001",
      entity_type: "MULE_ACCOUNT",
      canonical_name: "Ramesh Kumar",
      normalised_identifiers: { msisdn: "+919876543210" },
      source_evidence_refs: ["EVID_001"],
      matching_factors: [{ attribute: "msisdn", similarity_score: 1.0, algorithm: "EXACT" }],
      confidence_score: 0.95,
      investigator_review_state: "PENDING_REVIEW",
      valid_time_interval: { start_iso: "2026-10-15T00:00:00Z" },
      schema_version: "v1.0.0",
    };
    expect(ent.entity_id).toBe("ENT_001");

    const rel: CanonicalRelationship = {
      relationship_id: "REL_001",
      source_entity_id: "ENT_001",
      target_entity_id: "ENT_002",
      relationship_type: "TRANSFERRED_FUNDS",
      nature: "OBSERVED",
      confidence_score: 1.0,
      source_evidence_refs: ["EVID_001"],
      matching_criteria: { amount: 50000 },
      valid_time_interval: {},
      contradictory_observations: [],
      investigator_review_state: "VERIFIED",
      schema_version: "v1.0.0",
    };
    expect(rel.relationship_type).toBe("TRANSFERRED_FUNDS");
  });

  it("constructs and validates CanonicalTransaction", () => {
    const txn: CanonicalTransaction = {
      transaction_id: "TXN_001",
      case_id: "CASE_2026_001",
      source_evidence_id: "EVID_001",
      origin_account_identifier: "HDFC_001",
      destination_account_identifier: "SBI_002",
      amount: 50000,
      currency: "INR",
      original_timestamp_raw: "15-10-2026 14:00:00 IST",
      normalised_timestamp_utc: "2026-10-15T08:30:00Z",
      timestamp_uncertainty_sec: 0.0,
      transaction_type: "UPI_P2P",
      is_reversal: false,
      validation_state: "VALID",
      reconciliation_status: "MATCHED_BOTH_BANKS",
      analytical_annotations: { taint_score: 1.0 },
      schema_version: "v1.0.0",
    };
    expect(txn.amount).toBe(50000);
  });

  it("constructs and validates CanonicalClaim with contradiction analysis", () => {
    const claim: CanonicalClaim = {
      claim_id: "CLAIM_001",
      claim_statement: "Suspect was in Mumbai during cashout",
      claim_type: "PRESENCE_AT_CRIME_SCENE",
      supporting_observations: [],
      contradictory_observations: [
        { observation_id: "OBS_01", detail: "Cell tower in Delhi" },
      ],
      assumptions: ["Single phone operator"],
      evidence_dependencies: ["EVID_001"],
      transformation_references: [],
      verification_constraints: ["velocity <= 1000 km/h"],
      counterexamples: [{ hypothesis: "Accomplice cashout" }],
      limitations: ["Requires ATM CCTV"],
      claim_state: "CONTRADICTED",
      version_and_replay_reference: "git:976a6e4",
      schema_version: "v1.0.0",
    };
    expect(claim.claim_state).toBe("CONTRADICTED");
    expect(claim.contradictory_observations).toHaveLength(1);
  });

  it("constructs and validates Distributed Event, PSI, ZKP, AI Annotation and Benchmark", () => {
    const evt: CanonicalInstitutionEvent = {
      event_id: "EVT_001",
      institution_id: "INST_HDFC_01",
      event_type: "TRANSACTION_FLAGGED",
      schema_version: "v1.0.0",
      sequence_number: 1,
      source_timestamp_utc: "2026-10-15T08:30:00Z",
      received_timestamp_utc: "2026-10-15T08:30:01Z",
      idempotency_key: "IDEM_001",
      payload_commitment: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
      correlation_id: "CORR_001",
      causality_metadata: { lamport_ts: 1, vector_clock: { INST_HDFC_01: 1 } },
      event_validation_state: "COMMITTED",
      payload: {},
    };
    expect(evt.event_id).toBe("EVT_001");

    const req: CanonicalPSIRequest = {
      request_id: "REQ_001",
      case_id: "CASE_001",
      requesting_institution_id: "INST_HDFC_01",
      participating_institution_ids: ["INST_HDFC_01", "INST_SBI_01"],
      identifier_type: "PAN",
      normalisation_profile: "CANONICAL_V1",
      protocol_identifier: "ECDH_SECP256K1_PSI",
      protocol_version: "1.0",
      permitted_output: "CARDINALITY_ONLY",
      statutory_authorisation_ref: "S63_WARRANT_001",
      audit_reference: "AUDIT_001",
      created_timestamp_utc: "2026-10-15T08:00:00Z",
      schema_version: "v1.0.0",
    };
    expect(req.identifier_type).toBe("PAN");

    const res: CanonicalPSIResult = {
      result_id: "RES_001",
      request_id: "REQ_001",
      participating_institution_ids: ["INST_HDFC_01", "INST_SBI_01"],
      result_state: "SUCCESS",
      intersection_cardinality: 1,
      matched_blinded_tokens: ["0279be66..."],
      execution_duration_ms: 45.0,
      audit_ledger_hash: "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
      timestamp_utc: "2026-10-15T08:00:05Z",
      schema_version: "v1.0.0",
    };
    expect(res.result_state).toBe("SUCCESS");

    const zkp: CanonicalZKProofMetadata = {
      proof_id: "ZKP_001",
      circuit_identifier: "solvency_v1",
      circuit_version: "1.0",
      public_inputs: {},
      commitment_reference: "sha256:4f83...",
      proving_system: "GROTH16_BN254",
      verification_key_reference: "vk.json",
      proof_size_bytes: 256,
      proving_duration_ms: 120,
      verification_duration_ms: 4,
      verification_result: true,
      setup_assumptions: "POWERS_OF_TAU",
      schema_version: "v1.0.0",
    };
    expect(zkp.verification_result).toBe(true);

    const ann: CanonicalAIAnnotation = {
      annotation_id: "ANN_001",
      case_id: "CASE_001",
      target_object_type: "TRANSACTION",
      target_object_id: "TXN_001",
      model_identifier: "tarka-v1",
      prompt_template_version: "v1",
      confidence_score: 0.9,
      investigative_rationale: "Mule indicator",
      supporting_evidence_ids: ["EVID_001"],
      contradictions_identified: [],
      human_approval_state: "PROPOSED",
      schema_version: "v1.0.0",
    };
    expect(ann.human_approval_state).toBe("PROPOSED");

    const bm: CanonicalBenchmarkResult = {
      benchmark_id: "BM_001",
      suite_name: "Suite1",
      workstream: "MEMBER_B_CRYPTO_DISTRIBUTED",
      timestamp_utc: "2026-11-04T12:00:00Z",
      total_cases_evaluated: 100,
      throughput_records_per_sec: 1500,
      latency_p50_ms: 1,
      latency_p95_ms: 3,
      latency_p99_ms: 8,
      hardware_environment: {},
      memory_peak_mb: 100,
      metrics_payload: {},
      schema_version: "v1.0.0",
    };
    expect(bm.throughput_records_per_sec).toBe(1500);
  });

  it("constructs and validates API response envelopes", () => {
    const res: APIResponse<{ count: number }> = {
      success: true,
      data: { count: 42 },
      metadata: {
        schema_version: "v1.0.0",
        timestamp_utc: "2026-10-15T12:00:00Z",
        correlation_id: "CORR_001",
      },
    };
    expect(res.success).toBe(true);
    expect(res.data.count).toBe(42);

    const err: APIErrorResponse = {
      success: false,
      error: {
        code: "UNAUTHORIZED",
        message: "Warrant required",
        details: [],
        timestamp_utc: "2026-10-15T12:00:00Z",
        correlation_id: "CORR_002",
      },
    };
    expect(err.success).toBe(false);
  });
});
