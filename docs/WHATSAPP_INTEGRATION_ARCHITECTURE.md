# TARKA Official WhatsApp Business Platform Cloud API Integration Architecture

## 1. Architectural Overview

The TARKA WhatsApp Business Platform integration provides a secure, audited ingestion gateway for citizen cyber-fraud submissions, victim complaints, and supplementary forensic evidence (transaction screenshots, mule account numbers, UPI handles, phishing messages).

```
[Citizen / Victim WhatsApp Client]
              │
              ▼ (TLS 1.3 End-to-End)
[Meta WhatsApp Business Cloud Infrastructure (Graph API v20.0)]
              │
              ▼ HTTPS POST (Webhook Notification)
       ┌─────────────────────────────────────────────────────────────┐
       │               TARKA Webhook Ingestion Boundary              │
       │             /api/v1/connectors/whatsapp/webhook             │
       └──────────────────────────────┬──────────────────────────────┘
                                      │
              ┌───────────────────────┴────────────────────────┐
              │ 1. Fail-Closed Switch: WHATSAPP_ENABLED?       │
              │    (If false -> Return 200 disabled response)   │
              └───────────────────────┬────────────────────────┘
                                      │
              ┌───────────────────────┴────────────────────────┐
              │ 2. Cryptographic Ingress Verification          │
              │    X-Hub-Signature-256 HMAC-SHA256 vs APP_SECRET│
              │    (If invalid/missing -> Return 401 Reject)   │
              └───────────────────────┬────────────────────────┘
                                      │
              ┌───────────────────────┴────────────────────────┐
              │ 3. Non-Repudiation & WAMID Deduplication      │
              │    Check processed_wamids (Replay Attack Guard)│
              └───────────────────────┬────────────────────────┘
                                      │
              ┌───────────────────────┴────────────────────────┐
              │ 4. Statutory Non-Identity Invariant Parser     │
              │    Extract explicit case reference:            │
              │    CASE-YYYY-NNN or 1930-ACK-NNNNNN            │
              │    (Phone number NEVER proves legal identity)  │
              └───────────────────────┬────────────────────────┘
                                      │
              ┌───────────────────────┴────────────────────────┐
              │ 5. Universal Connector & CAS Ingestion         │
              │    SHA-256 Content-Addressed Storage           │
              │    Emit Normalized Entities & Audit Log        │
              └────────────────────────────────────────────────┘
```

---

## 2. Webhook Ingress & Verification Lifecycle

### 2.1 Meta Webhook Verification Handshake (GET)
When configuring the webhook in the Meta App Dashboard, Meta dispatches an HTTP GET request with verification query parameters:
- `hub.mode`: Expected value `"subscribe"`
- `hub.verify_token`: Verified against `settings.WHATSAPP_WEBHOOK_VERIFY_TOKEN`
- `hub.challenge`: An opaque random challenge string

**Behavior:**
- If tokens match identically via constant-time comparison, TARKA responds with `HTTP 200` and the raw challenge integer string in `text/plain`.
- If tokens differ or `hub.mode != "subscribe"`, TARKA responds with `HTTP 403 Forbidden`.

### 2.2 Payload Signature Validation (POST)
For every incoming event, Meta includes an `X-Hub-Signature-256` HTTP header containing the HMAC-SHA256 digest of the raw request payload signed with the Meta Application Secret (`WHATSAPP_APP_SECRET`).

**Verification Contract:**
$$\text{Expected Signature} = \text{"sha256="} + \text{HMAC-SHA256}(\text{key} = \text{WHATSAPP\_APP\_SECRET}, \text{data} = \text{raw\_body})$$

- Verification uses `hmac.compare_digest` to prevent timing attacks.
- If the signature header is missing or does not match, TARKA immediately terminates the request with `HTTP 401 Unauthorized` without reading the JSON payload.

---

## 3. Inbound Processing & Media Acquisition

### 3.1 Supported Message Types
1. **Text Messages:** Extracted text is checked for explicit case identifiers (`CASE-\d{4}-\d{3,6}` or `1930-ACK-\d+`).
2. **Media Attachments (Images, PDFs, Audio):**
   - Inbound webhook contains Meta media ID (`image.id`, `document.id`).
   - TARKA queries `GET https://graph.facebook.com/v20.0/{media_id}` with Bearer Token (`WHATSAPP_ACCESS_TOKEN`) to retrieve temporary download URL.
   - The media stream is downloaded with strict size limits (Max 25MB).
   - Magic byte MIME verification is executed before admission.
   - Immutable SHA-256 digest is calculated in 64KB streaming chunks.

---

## 4. Operational Controls & Resilience

### 4.1 Fail-Closed Safety Switch
If `WHATSAPP_ENABLED=False` or `WHATSAPP_APP_SECRET` is unset:
- Incoming POST webhooks return `{ "status": "disabled", "message": "WhatsApp Cloud API integration is disabled in configuration." }` with `HTTP 200 OK` (to prevent Meta webhook subscription auto-revocation during maintenance).
- Zero entity extraction or graph ingestion occurs.

### 4.2 Rate Limiting and Backpressure
- Meta Cloud API allows up to 80 requests/second on standard tier.
- TARKA processes webhooks asynchronously, queuing heavy OCR and forensic extraction tasks so that the HTTP webhook endpoint responds in `< 200ms`.
- WAMID deduplication cache tracks received messages in an atomic memory buffer with an eviction window to guarantee idempotency.

---

## 5. Security & Secret Management

- `WHATSAPP_ACCESS_TOKEN` and `WHATSAPP_APP_SECRET` are never exposed in log outputs or the `/api/v1/connectors/whatsapp/status` diagnostic endpoint.
- All webhook communications are strictly TLS 1.3 enforced.
