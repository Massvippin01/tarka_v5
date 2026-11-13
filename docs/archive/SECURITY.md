# SENTINELX NEXUS — Security & Analytical Governance Standards

## 1. Human-in-the-Loop Safeguards
1. **Decision Aid Principle**: Analytical signals and AI outputs serve exclusively as intelligence aids for trained law enforcement officers.
2. **No Automated Actions**: System signals MUST NOT automatically initiate arrests, detain suspects, freeze assets, or make binding legal conclusions.
3. **Mandatory Review State**: Every analytical signal is labeled with `review_status: "UNREVIEWED"` until verified by a human investigator.

## 2. Non-Accusatory Epistemic Standards
1. `OBSERVATION` ≠ `INFERENCE` ≠ `HYPOTHESIS` ≠ `DECISION`.
2. Networks are labeled `CANDIDATE NETWORK` (never Criminal Gang unless backed by judicial charge-sheet).
3. Transfers are labeled `UNUSUAL FINANCIAL PATTERN` (never Criminal Money Laundering).
4. Routes are explicitly split into `OBSERVED` camera points vs `INFERRED ROUTE`.

## 3. Data Privacy & Safe Session URLs
- Workspace state serializes only non-sensitive safe identifiers into URL query strings (`?case=C102&entity=P001&mode=2D`).
- Raw PII, confidential wiretaps, or sensitive witness names are NEVER stored in URL query parameters.
