# TARKA × SENTINELX — PHASE 13B: FOUNDER OUTREACH PLAN

**Document Code:** `PLAN-OUTREACH-2026-V1`  
**Classification:** FOUNDER & EXECUTIVE OPERATIONAL DIRECTIVE  
**Authority:** [SentinelX Wave 6 Engineering Constitution](file:///c:/PROJECTS/SentinelX/.agents/rules/sentinelx-wave-6-engineering-constitution.md)  
**Governing Standard:** Absolute Epistemic Integrity & Manual Approval Gate  
**Execution Lead:** TARKA Founder / Technical Delivery Lead  
**Date:** November 2026  

---

## 1. Operating Principle & Non-Negotiable Rules

The transition from software engineering to institutional adoption carries substantial legal, ethical, and professional exposure. All external communication is strictly governed by the following operational directives:

1. **Manual Founder Approval Invariant:** No email, message, letter, or inquiry may be dispatched by any automated script, subagent, or external tool. Every outbound message must be manually reviewed and dispatched by the founder.
2. **Truthful Outreach State:** Under no circumstances may an outreach record be marked `SENT` until the founder has physically sent the message from an official email account or an authenticated delivery receipt is logged.
3. **Zero Fabricated Engagements:** An institution cannot be classified as `MEETING_SCHEDULED`, `DEMONSTRATION_COMPLETED`, or `DESIGN_PARTNER` based on hopeful expectations or informal conversations. Status transitions require verifiable documentary evidence.
4. **Synthetic Data Exclusivity:** All initial demonstrations and technical evaluations must operate on **Model D (Synthetic Fixtures)**. No live or sensitive citizen casework may be ingested or requested during preliminary outreach.
5. **No Guilt Claims:** TARKA collateral must never claim the system detects "guilt" or "fraudsters". It surfaces mathematical contradictions, forensic anomalies, and double-entry discrepancies; human investigators decide.

---

## 2. Standardized Outreach Lifecycle & State Machine

Every prospective institutional engagement progresses through a deterministic, 12-state finite state machine:

```
[IDENTIFIED] 
     │
     ▼
[CONTACT_VERIFIED] 
     │
     ▼
[DRAFT_READY] 
     │
     ▼
[AWAITING_FOUNDER_APPROVAL] ──(Rejected/Needs Revision)──> [DRAFT_READY]
     │
     ▼ (Founder Manually Sends)
   [SENT]
     │
     ├─────────────────────────────────┐
     ▼ (No reply after 5-7 days)       ▼ (Reply received)
[FOLLOW_UP_REQUIRED]         [RESPONSE_RECEIVED]
     │                                 │
     │ (Follow-up sent)                ├────────────────────────┐
     └───────────┐                     ▼ (Declined)             ▼ (Interested)
                 │                 [DECLINED]           [MEETING_SCHEDULED]
                 │                                              │
                 ▼                                              ▼
              [SENT]                                  [DEMONSTRATION_COMPLETED]
                                                                │
                                                                ▼
                                                      [EVALUATION_INTEREST]
                                                                │
                                                                ▼
                                                        [DESIGN_PARTNER]
```

### Definitions of State Values:

| State | Definition & Evidence Requirement |
| :--- | :--- |
| **`IDENTIFIED`** | Organisation and relevant department identified as strategically aligned with TARKA capabilities. |
| **`CONTACT_VERIFIED`** | Official public domain, department portal, and official email channel confirmed via public directories. |
| **`DRAFT_READY`** | Fully customized, non-generic outreach text drafted incorporating specific institutional pain points. |
| **`AWAITING_FOUNDER_APPROVAL`** | Message placed in founder review queue. Software activity pauses pending human founder sign-off. |
| **`SENT`** | Founder has explicitly approved and dispatched the message from an authenticated mailbox. Date recorded. |
| **`RESPONSE_RECEIVED`** | Written response received from the prospect. Summary and next actions documented. |
| **`MEETING_SCHEDULED`** | Mutual confirmation of date, time, and video conference link / physical location for a 45-minute session. |
| **`DEMONSTRATION_COMPLETED`** | 45-minute structured walkthrough conducted using Model D synthetic fixtures; feedback form administered. |
| **`EVALUATION_INTEREST`** | Stakeholder requests local deployment, technical evaluation container, or benchmark access. |
| **`DESIGN_PARTNER`** | Non-binding Design Partner Discussion Framework executed; evaluation container deployed. |
| **`DECLINED`** | Institution formally declines participation. Reason recorded in tracking register. |
| **`FOLLOW_UP_REQUIRED`** | Staged follow-up window reached (T + 5 business days for academic; T + 7 for government) with zero response. |

---

## 3. The 3-Step Founder Dispatch Protocol

When the founder reviews and approves an outreach draft, the following 3-step protocol must be followed:

```
Step 1: FOUNDER INSPECTION
- Verify recipient name, official title, and email address against official portal.
- Confirm attachments: TARKA_ONE_PAGE_BRIEF.pdf and TARKA_TECHNICAL_CAPABILITY_STATEMENT.pdf.
- Ensure no claims of existing police/court endorsement are made.

Step 2: MANUAL DISPATCH
- Dispatch email from official founder email address (e.g. founder@tarka-forensics.in or authorized institution address).
- Record exact message-ID or sent timestamp.

Step 3: REGISTER UPDATE
- Update PHASE13_ENGAGEMENT_TRACKER.md: transition status from AWAITING_FOUNDER_APPROVAL to SENT.
- Record Date Sent, Message Subject, and set Follow-up Date (Date Sent + 5 or 7 business days).
```

---

## 4. Staged Rollout Calendar

```
+---------------+------------------------+------------------------------------+--------------------------+
| Cohort        | Target Institutions    | Campaign Focus                     | Founder Action Window    |
+---------------+------------------------+------------------------------------+--------------------------+
| **Cohort 1**  | NFSU Gandhinagar       | Academic Benchmark & Methodology   | Week 1: Day 1 (Immediate)|
|               | C3iHub, IIT Kanpur     | Formal SMT Invariant Verification  | Week 1: Day 1 (Immediate)|
|               | IIIT-Delhi (CERC)      | Adversarial Spoof & Typography     | Week 1: Day 2            |
+---------------+------------------------+------------------------------------+--------------------------+
| **Cohort 2**  | I4C, MHA               | Citizen Complaint 6s Triage        | Week 1: Day 4            |
|               | Maharashtra Cyber      | Section 94 BNSS Summons Drafting   | Week 1: Day 4            |
|               | IFSO Delhi Police      | Multi-Source Mule Reconciliation   | Week 2: Day 1            |
+---------------+------------------------+------------------------------------+--------------------------+
| **Cohort 3**  | CFSL CBI New Delhi     | Section 63 BSA Statutory Triage    | Week 2: Day 3            |
|               | State FSL Delhi        | High-Volume Exhibit Backlog        | Week 2: Day 3            |
|               | State FSL Mumbai       | Mobile Extraction Integration      | Week 2: Day 4            |
|               | State Bank of India    | CBS Streaming Reconciliation       | Week 2: Day 5            |
+---------------+------------------------+------------------------------------+--------------------------+
```

---
*TARKA × SentinelX — Controlled, Disciplined, and Auditable Institutional Engagement.*
