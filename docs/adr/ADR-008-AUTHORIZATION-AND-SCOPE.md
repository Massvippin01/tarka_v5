# ADR-008: Server-Side Authorization & Case Scope Architecture

- **Status**: Approved & Implemented
- **Date**: 2026-08-30
- **Context**: Access control in law enforcement systems must enforce strict role-based permissions and case/jurisdiction scope boundaries server-side before returning records to the browser.

## Decision
1. **Server-Side Authorization Boundary**: Authorization and case scope validation occur strictly on the backend (`SERVER-SIDE AUTHORIZATION`). Client code never receives out-of-scope graph nodes, search results, or evidence records.
2. **Identity Directory & RBAC**: Implement `AuthService` (`auth.py`, `auth_service.py`) supporting 8 typed roles (`INVESTIGATOR`, `SUPERVISOR`, `ANALYST`, `FORENSIC_ANALYST`, `INTELLIGENCE_OFFICER`, `CASE_ADMINISTRATOR`, `AUDITOR`, `SYSTEM_ADMINISTRATOR`).
3. **Out-of-Scope Denial**: Requests targeting unauthorized cases return `403 ACCESS_DENIED` without revealing entity existence, node counts, or hidden metadata.

## Consequences
- **Positive**:
  - Complete server-side isolation between Delhi (`C102`, `C114`) and Gurugram (`C481`, `C512`) investigator scopes.
  - Zero leakage of out-of-scope entities or counts.
