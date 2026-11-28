# TARKA — OFFICIAL WHATSAPP BUSINESS PLATFORM INTEGRATION ARCHITECTURE
**Document ID:** TARKA-WA-ARCH-2026-V6  
**Classification:** Cloud Ingestion Architecture & Statutory Integration  
**Platform:** Meta WhatsApp Business Platform / Cloud API (v20.0+)  
**Status:** IMPLEMENTED, CONSTITUTIONALLY CONSTRAINED & VERIFIED  

---

## 1. Statutory Architectural Boundary & Invariants

TARKA integrates exclusively with the **Official WhatsApp Business Platform (Cloud API)** hosted on Meta's official Graph API infrastructure.

### Non-Negotiable Invariants:
1. **No Citizen Business Accounts Required:** Ordinary citizens and crime victims can message the official TARKA police helpline number from their regular WhatsApp consumer accounts.
2. **Zero Unofficial Scraping:** No unofficial WhatsApp Web scrapers, Puppeteer browser automation, or reverse-engineered third-party clients are permitted.
3. **Identity Non-Inference Rule (Section 63 BSA & DPDPA):** A sender's incoming E.164 phone number (`from`) **never** constitutes legal proof of identity. Phone numbers can be spoofed, SIM-swapped, or operated by mules.
4. **Explicit Case Linkage:** Incoming messages and media are **never** automatically associated with a case based solely on phone proximity. An explicit, unambiguous case identifier (e.g. `CASE-2026-001`, `1930-ACK-123456`) is required in the message body. Unlinked messages are classified as `UNASSIGNED_PENDING_TRIAGE` requiring secondary officer verification.
5. **Fail-Closed Safety Switch:** The integration remains inert (`WHATSAPP_ENABLED=False`) until verified production credentials are provided.

---

## 2. Inbound Ingestion Pipeline Architecture

```
[ Citizen WhatsApp User ]
           |
           v (HTTPS Message / Media)
[ Meta Cloud API Servers ]
           |
           v POST /api/v1/connectors/whatsapp/webhook
+-----------------------------------------------------------------------+
|  TARKA WHATSAPP GATEWAY                                               |
|                                                                       |
|  1. X-Hub-Signature-256 HMAC-SHA256 Verification                     |
|     - Secret: WHATSAPP_APP_SECRET                                     |
|     - Fail Closed: HTTP 401 on tampered bytes                         |
|                                                                       |
|  2. Replay & Rate-Limit Defense                                       |
|     - Unique WAMID deduplication                                      |
|     - Sliding window token bucket (80 rps ceiling)                    |
|                                                                       |
|  3. Explicit Case Extractor                                           |
|     - CASE_REF_REGEX matches CASE-\d{4}-\d{3}                         |
|     - If missing: triage_status="UNASSIGNED_PENDING_TRIAGE"           |
|                                                                       |
|  4. Secure Media Stream & Bitstream Preservation                      |
|     - Downloads raw bytes via authenticated Meta Graph endpoint       |
|     - Computes immutable SHA-256 bitstream hash                      |
|     - Emits EvidenceArtifact & Communication entities to CAS          |
+-----------------------------------------------------------------------+
```

---

## 3. Endpoints & Webhook Lifecycle

### 3.1 Verification Handshake (`GET /api/v1/connectors/whatsapp/webhook`)
- Verified against `hub.verify_token == settings.WHATSAPP_WEBHOOK_VERIFY_TOKEN`.
- Echoes integer `hub.challenge` with `Content-Type: text/plain` (HTTP 200).
- Rejects unauthorized handshakes with HTTP 403 Forbidden.

### 3.2 Inbound Event Processor (`POST /api/v1/connectors/whatsapp/webhook`)
- Cryptographically verified against `X-Hub-Signature-256`.
- Extracts message text, image receipts, statement PDFs, audio recordings.
- Dispatches parsed records into the Evidence Ledger and Triage Queue.
