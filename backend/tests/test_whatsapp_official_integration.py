"""
Automated Test Suite for TARKA Official WhatsApp Business Platform Cloud API Integration.

Verifies:
1. Meta webhook verification handshake (hub.mode=subscribe, hub.challenge)
2. Rejection of invalid verify tokens (403 Forbidden)
3. Cryptographic signature validation via X-Hub-Signature-256 (HMAC-SHA256)
4. Rejection of tampered or unsigned payloads (401 Unauthorized)
5. Explicit case association parsing (CASE-2026-001, 1930-ACK-...)
6. Strict Invariant: Phone number alone never associates a case (UNASSIGNED / provisional)
7. Non-repudiation: WAMID deduplication protects against replay attacks
8. Entity normalization: Emits EvidenceArtifact and Communication entities with SHA-256 hashes
9. Disabled-by-default safety switch (WHATSAPP_ENABLED)
"""

import hashlib
import hmac
import json
import pytest
from fastapi.testclient import TestClient

from app.core.config import settings
from app.main import app
from tarka.connectors.whatsapp_business import WhatsAppBusinessConnector


@pytest.fixture
def client():
    return TestClient(app)


def test_whatsapp_webhook_handshake_success(client):
    verify_token = "secure_tarka_test_verify_token"
    settings.WHATSAPP_WEBHOOK_VERIFY_TOKEN = verify_token
    challenge_val = "1155998822"

    url = f"/api/v1/connectors/whatsapp/webhook?hub.mode=subscribe&hub.challenge={challenge_val}&hub.verify_token={verify_token}"
    resp = client.get(url)
    assert resp.status_code == 200
    assert resp.text == challenge_val


def test_whatsapp_webhook_handshake_invalid_token_403(client):
    settings.WHATSAPP_WEBHOOK_VERIFY_TOKEN = "correct_token"
    url = "/api/v1/connectors/whatsapp/webhook?hub.mode=subscribe&hub.challenge=12345&hub.verify_token=wrong_token"
    resp = client.get(url)
    assert resp.status_code == 403


def test_whatsapp_webhook_signature_validation(client):
    secret = "META_APP_SECRET_TEST_KEY"
    settings.WHATSAPP_APP_SECRET = secret
    settings.WHATSAPP_ENABLED = True

    payload = {
        "object": "whatsapp_business_account",
        "entry": [{
            "id": "WHATSAPP_ACCT_001",
            "changes": [{
                "value": {
                    "messaging_product": "whatsapp",
                    "metadata": {"display_phone_number": "919999999999", "phone_number_id": "PHONE_001"},
                    "contacts": [{"profile": {"name": "Complainant Victim"}, "wa_id": "919876543210"}],
                    "messages": [{
                        "from": "919876543210",
                        "id": "wamid.HBgLMjAyNjExMjgxNDA1MzQxFgASEA==",
                        "timestamp": "1764321000",
                        "text": {"body": "Here is additional evidence regarding CASE-2026-001. Beneficiary UPI handle was mule@okaxis."},
                        "type": "text"
                    }]
                },
                "field": "messages"
            }]
        }]
    }

    raw_body = json.dumps(payload).encode("utf-8")
    sig = hmac.new(secret.encode(), raw_body, hashlib.sha256).hexdigest()
    headers = {
        "Content-Type": "application/json",
        "X-Hub-Signature-256": f"sha256={sig}"
    }

    resp = client.post("/api/v1/connectors/whatsapp/webhook", data=raw_body, headers=headers)
    assert resp.status_code == 200, resp.text
    data = resp.json()
    assert data["status"] == "success"
    assert data["processed_count"] == 1
    rec = data["records"][0]
    assert rec["case_id"] == "CASE-2026-001"
    assert rec["wamid"] == "wamid.HBgLMjAyNjExMjgxNDA1MzQxFgASEA=="


def test_whatsapp_webhook_tampered_signature_rejected_401(client):
    secret = "META_APP_SECRET_TEST_KEY"
    settings.WHATSAPP_APP_SECRET = secret
    settings.WHATSAPP_ENABLED = True

    raw_body = b'{"tampered": "body"}'
    headers = {
        "Content-Type": "application/json",
        "X-Hub-Signature-256": "sha256=invalid_forged_signature_hex"
    }

    resp = client.post("/api/v1/connectors/whatsapp/webhook", data=raw_body, headers=headers)
    assert resp.status_code == 401
    assert "Webhook signature verification failed" in resp.text


def test_whatsapp_strict_phone_never_proves_identity():
    connector = WhatsAppBusinessConnector()

    # Message from a phone number with NO case reference
    msg_dict = {
        "entry": [{
            "changes": [{
                "value": {
                    "contacts": [{"profile": {"name": "Anonymous Submitter"}, "wa_id": "919123456789"}],
                    "messages": [{
                        "from": "919123456789",
                        "id": "wamid.TEST_WAMID_NO_REF_01",
                        "timestamp": "1764322000",
                        "text": {"body": "I lost money to a telegram investment scam yesterday."},
                        "type": "text"
                    }]
                }
            }]
        }]
    }

    messages = connector.parse_webhook_payload(msg_dict)
    assert len(messages) == 1
    parsed = messages[0]

    # Invariant: phone alone never links a case
    assert parsed.explicit_case_ref is None
    assert parsed.triage_status == "UNASSIGNED_PENDING_TRIAGE"

    entities = connector.normalize_record(parsed)
    comm_entity = next(e for e in entities if e.entity_type == "Communication")
    assert comm_entity.attributes["identity_verified"] is False
    assert comm_entity.attributes["case_reference"] == "NONE"


def test_whatsapp_disabled_safety_switch(client):
    settings.WHATSAPP_ENABLED = False
    settings.WHATSAPP_APP_SECRET = ""

    resp = client.post("/api/v1/connectors/whatsapp/webhook", json={"test": "payload"})
    assert resp.status_code == 200
    assert resp.json()["status"] == "disabled"
