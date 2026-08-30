# SENTINELX NEXUS — Security & Governance Specification

## Security Principles
1. **Synthetic Data Policy**: All operational data (names, registration plates, phone numbers, bank accounts) generated or processed by SENTINELX NEXUS is synthetic. No protected, classified, or real criminal records are ingested.
2. **Access Control & RBAC**: Role-based access control with least-privilege scoping across investigative workspaces.
3. **Audit Logging & Provenance**: Every entity creation, modification, graph query, and AI response logs `source`, `source_record_id`, `evidence_reference`, timestamp, and user ID.
4. **Non-Destructive Entity Resolution**: Uncertain matches are flagged as candidates requiring explicit human investigator approval before merging or linking.
5. **AI Reasoning Scoping**: AI responses must cite empirical backend records, confidence levels, and provenance tags; analytical inferences are marked with explicit review disclaimers.
