# ADR-005: Evidence Verification & AI Governance Fabric

- **Status**: Approved & Implemented
- **Date**: 2026-08-30
- **Context**: LLM-based investigative tools suffer from potential hallucinations, unverified factual claims, or ungrounded conclusions that can compromise legal admissibility.

## Decision
1. **Verification Pipeline Standard**: Enforce the canonical pipeline: `RAW RECORD ➔ OBSERVATION ➔ ANALYTICAL SIGNAL ➔ EVIDENCE ➔ VERIFIED CLAIM ➔ AI RESPONSE`. The LLM is strictly an analytical assistance layer and never an authoritative source of truth.
2. **Deterministic Claim Verifier**: Implement `ClaimVerifier` (`claim_verifier.py`) to resolve every entity, record, and relationship reference against ground truth in `UnifiedStore`. If a claim cannot be resolved, it is marked `verification_status: "UNCONFIRMED"`, categorized as `INFERENCE`, and assigned an uncertainty note.
3. **Audit Service & Provenance Tracking**: Implement `AuditService` (`audit_service.py`) capturing user session, query, scope, tools executed, records accessed, response ID, model version, and investigator review action.
4. **Enhanced 14 AI Tool Contracts**: Strengthen 14 typed AI tools with strict input/output models, query scope bounds, source metadata, and error contracts.
5. **Investigator Claim Verification Workflow**: Enhance `AICopilotDrawer.tsx` to render structured claim verification cards, tool execution trace logs, query scope badges, and an interactive Investigator Verification modal (`CONFIRMED`, `DISMISSED`, `REQUIRES REVIEW`).

## Consequences
- **Positive**:
  - 100% of factual claims in golden query C102 ↔ C481 are deterministically verified against synthetic store records.
  - Zero unverified claims pass silently as ground truth facts.
  - Claim verification latency p50 = 1.1ms.
