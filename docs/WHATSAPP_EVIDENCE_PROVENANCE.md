# TARKA WhatsApp Evidence Provenance & Statutory Compliance

## 1. Statutory Context: Bharatiya Sakshya Adhiniyam (BSA), 2023 & DPDPA 2023

Electronic evidence acquired through third-party messaging networks such as WhatsApp must meet strict statutory standards under Indian law before being admitted in financial cybercrime proceedings:

1. **Bharatiya Sakshya Adhiniyam (BSA), 2023 — Section 63:**
   - Admissibility of electronic records requires proof of the integrity of the device/system producing the record, custody chain, and un-tampered storage.
   - Requires generating an electronic record certificate detailing cryptographic integrity (SHA-256), acquisition timestamp, and system operational conditions.
2. **Digital Personal Data Protection Act (DPDPA), 2023:**
   - Requires purpose limitation and data minimization.
   - PII collected during victim reporting cannot be leaked or indexed outside authorized case parameters.

---

## 2. Invariant: Phone Number NEVER Proves Identity

### The Problem of Spoofing and Mule SIMs
In financial cybercrime (UPI scams, Part-Time job scams, investment frauds):
- Criminal syndicates frequently employ stolen SIM cards, corporate SIM farms, VoIP spoofing, or compromised citizen accounts.
- Conversely, victims contacting law enforcement via WhatsApp may be borrowing a relative's phone or using dual-SIM numbers unregistered in official records.

### Constitutional Invariant
Under Section 5 of the SentinelX Engineering Constitution:
> **AI PROPOSES. EVIDENCE VERIFIES. HUMAN DECIDES.**
> **Never classify a person as GUILTY or INNOCENT.**
> **Never infer guilt from association, centrality, similarity, or graph proximity.**
> **Never perform automatic identity merges.**

**Technical Rule:**
A WhatsApp message originating from phone number $+91\text{ }XXXXXXXXXX$ with profile display name $N$ does **NOT** constitute proof that person $N$ is the sender or owner of that number.
- `identity_verified` is strictly hardcoded to `False`.
- Automatic merge of citizen contact with any known suspect or victim entity is strictly **prohibited**.

---

## 3. Explicit Case Association vs. Provisional Submissions

Incoming WhatsApp messages are routed according to explicit case tokens:

| Case Token Pattern | Example | Classification | Action |
|:---|:---|:---|:---|
| `CASE-\d{4}-\d{3,6}` | `CASE-2026-001` | `CASE_ASSOCIATED_SUPPLEMENTARY` | Attached as unverified supplementary evidence to active case dossier; flagged for investigator review. |
| `1930-ACK-\d+` | `1930-ACK-8837192` | `NCRP_PORTAL_REFERENCE` | Linked to National Cybercrime Reporting Portal acknowledgment reference. |
| *No matching pattern* | *"I was scammed out of 50000 rupees yesterday"* | `UNASSIGNED_PENDING_TRIAGE` | Kept in unassigned evidence pool with `requires_human_escalation=True`. |

---

## 4. Cryptographic Non-Repudiation & Chain of Custody

Every admitted WhatsApp message follows an unbroken forensic custody chain:

1. **Raw Webhook Ingress Hash:**
   - Exact raw bytes received from Meta Cloud API are hashed:
     $$\text{Raw Body SHA-256} = \text{SHA256}(\text{raw\_bytes})$$
2. **WAMID Deduplication:**
   - Meta assigns a unique WhatsApp Message ID (`wamid.HBgL...`).
   - TARKA verifies the WAMID against the deduplication index to prevent replay or retransmission tampering.
3. **Evidence Artifact Normalization:**
   - Emits an `EvidenceArtifact` entity containing:
     - `artifact_type`: `"whatsapp_message"` or `"whatsapp_media"`
     - `sha256`: Digest of raw message content or media payload
     - `source_uri`: `"whatsapp://v20.0/{phone_number_id}/messages/{wamid}"`
     - `ingest_timestamp`: UTC ISO-8601 acquisition time
     - `statutory_cert_eligible`: `True` (eligible for Section 63 BSA certificate generation)
4. **Communication Entity:**
   - Emits a `Communication` entity with channel `"WHATSAPP"`, sender phone, message timestamp, and `identity_verified=False`.
