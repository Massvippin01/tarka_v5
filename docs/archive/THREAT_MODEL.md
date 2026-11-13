# SENTINELX NEXUS — Threat Model & Security Controls (SIH 2026 — PS 26189)

| Threat ID | Threat Vector | Attack Surface | Impact | Mitigation / Security Control | Residual Risk | Automated Test |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **T1** | Unauthorized Investigator Access | REST API Endpoints | Unauthorized case/entity access | Server-side `UserIdentity` token authentication (`AuthService`) | Minimal | Pytest `test_identity_authentication` |
| **T2** | Stolen Session / Token | Auth Headers | Session impersonation | Session expiration & server-side token re-validation | Low | Unit test |
| **T3** | Malicious Search Query Injection | Search API (`/search`) | Data exfiltration / Cypher injection | Parameterized search queries & server-side scope filtering | Minimal | Pytest `test_federated_search_authorization` |
| **T4** | Graph Over-Expansion Leakage | Bounded Graph Projection API | Leakage of unauthorized nodes/edges | Server-side graph authorization *before* graph expansion | Minimal | Pytest `test_graph_authorization_filtering` |
| **T5** | Cross-Jurisdiction Data Leakage | Case API (`/analytics/signals/{case_id}`) | Unauthorized access to out-of-scope case | Server-side case scope validation (`validate_case_scope`). Returns `403 ACCESS_DENIED` | Minimal | Pytest `test_security_identity_and_case_scope_isolation` |
| **T6** | Copilot Prompt Injection | AI Copilot Chat | LLM execution bypassing scope | AI tools inherit active user scope and execute scoped store queries | Low | Pytest `test_copilot_tool_authorization` |
| **T7** | Voice Command Manipulation | Voice Overlay | Unauthorized/high-risk action | High-Risk Confirmation dialog (`YOU SAID / INTERPRETED / ACTION`) before execution | Minimal | Pytest `test_voice_command_interpreter` |
| **T8** | Realtime Event Leakage | SSE Stream (`/events/stream`) | Interception of non-scoped events | SSE stream subscriptions filtered server-side by user scope | Minimal | Pytest `test_realtime_event_dispatcher` |
| **T9** | Audit Log Tampering | Audit Service | Deletion of audit records | Cryptographic SHA-256 hash chaining (`event_hash = SHA256(prev_hash + payload)`) & `verify_integrity()` | Minimal | Pytest `test_audit_hash_chain_integrity` |
| **T10** | Synthetic vs Real Data Confusion | Operational UI | Confusion with live police data | Persistent `SYNTHETIC SIMULATION ENVIRONMENT` pill & explicit adapter status labels | None | Visual UI verification |
| **T11** | Credential Exposure | Source Code / `.env` | Credential leakage | Secrets removed from code; `.env.example` placeholders used | Minimal | Code audit |
| **T12** | Unauthorized Data Export | Export Endpoint | Uncontrolled data leakage | Export permissions checked against `AccessPermissionEnum.EXPORT_DATA` | Minimal | Unit test |
| **T13** | AI Inference Presented as Fact | Copilot Claims | Misleading legal assertions | Ground-truth claim verifier converts unverified assertions to `INFERENCE (UNCONFIRMED)` | Minimal | Pytest `test_claim_verifier_and_audit_logging` |
| **T14** | Stale Authorization State | Cached UI State | Outdated permissions active | Re-validate authorization on every state transition | Minimal | Frontend build |
