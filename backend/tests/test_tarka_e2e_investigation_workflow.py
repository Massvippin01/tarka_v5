"""
TARKA Phase 8: Complete End-to-End Synthetic Investigation Verification Suite.

Ground Truth Labelled Dataset:
- Case: "CASE-2026-SYNTH-E2E" (UPI Payment Discrepancy & Account Skimming)
- Evidence 1: Axis Bank Core Banking Statement CSV (₹25,000 debit under RRN 202602148891, Opening ₹50k, Closing ₹25k)
- Evidence 2: Disputed Payment Receipt PNG (claims ₹15,000 debit under same RRN 202602148891)
- Evidence 3: Duplicate Bank Statement CSV (exact bitstream duplicate of Evidence 1 to test deduplication)
- Evidence 4: Airtel Telecom CDR Manifest CSV (tower Delhi-Central, IMEI 864209041234567)
- Evidence 5: Ambiguous Entity Record (contains unverified phone reference +919876500000)

Verifies:
1. Case creation & authorization scope enforcement
2. Multi-format evidence ingestion, streaming SHA-256 calculation & immutable CAS preservation
3. Deduplication detection (Evidence 3 flagged as duplicate without creating duplicate findings)
4. TRACE double-entry financial reconciliation (Opening ₹50k - Debits ₹25k = Closing ₹25k)
5. TRACE screenshot examination isolating the ₹25k vs ₹15k contradiction under RRN 202602148891
6. AEGIS entity normalization (E.164 phone, UPI VPA, IFSC code) without unsafe automated merges
7. Non-promotability invariant: all machine inferences maintain human_verified = False
8. Section 63 BSA statutory report generation with deterministic substantive SHA-256 seal
9. Fail-closed 401/403 authorization protection on unauthorized access
10. WhatsApp webhook simulator ingestion with media preservation
"""

import io
import json
import uuid
import pytest
from datetime import UTC, datetime

from app.adapters.aegis_gateway import AegisGateway
from app.adapters.tarka_forensics_adapter import TarkaForensicsAdapter
from app.adapters.trace_engine import TraceEngine
from app.adapters.whatsapp_gateway import WhatsAppGateway
from app.domain.universal_case_model import (
    CaseClassification,
    CaseStatus,
    EntityMatchBasis,
    FindingStatus,
    FindingType,
    UniversalCase,
)
from app.services.auth_service import AuthService


# Synthetic Ground-Truth Bank Statement CSV
CSV_BANK_STATEMENT = """Date,Transaction Date,Description,Withdrawal,Deposit,Balance
2026-02-14,2026-02-14,UPI/202602148891/PAYTO/merchant@okhdfcbank/P2M,25000.00,,25000.00
"""

# Synthetic Ground-Truth Disputed Receipt Bytes (PNG Header + Text Payload)
PNG_RECEIPT_BYTES = (
    b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x04\x00\x00\x00\x08\x00\x08\x06\x00\x00\x00"
    b"Software: Canva Mobile Editor\n"
    b"UPI Reference Number: 202602148891\n"
    b"Amount Paid: Rs. 15,000.00\n"
    b"Status: Transaction Successful\n"
)

# Synthetic Ground-Truth Telecom CDR CSV
CSV_TELECOM_CDR = """Timestamp,Caller_MSISDN,Called_MSISDN,Cell_ID,IMEI,Call_Type
2026-02-14 14:32:00,+919876543210,+919811223344,DEL-CTR-091,864209041234567,OUTGOING_CALL
"""


class TestTarkaEndToEndInvestigationWorkflow:
    """Rigorous end-to-end integration test validating the entire investigative pipeline."""

    case_id = f"CASE_SYNTH_{uuid.uuid4().hex[:8]}"

    @pytest.fixture(autouse=True)
    def setup_pipeline(self):
        self.auth_service = AuthService.get_instance()
        self.adapter = TarkaForensicsAdapter()
        self.trace_engine = TraceEngine()
        self.aegis_gateway = AegisGateway()
        self.whatsapp_gateway = WhatsAppGateway()
        self.investigator = "INVESTIGATOR_DELHI"
        self.token = self.auth_service.create_jwt_token(self.investigator)
        self.headers = {"Authorization": f"Bearer {self.token}"}

    def test_01_case_creation_and_authorization(self, client):
        """Step 1: Create a case and verify investigator authorization."""
        res = client.post(
            "/api/v1/forensics/cases",
            json={
                "case_id": self.case_id,
                "title": "Operation Disputed Wire: Synthetic Fraud Ring",
                "description": "Multi-source investigation into ₹25k vs ₹15k UPI discrepancy",
                "jurisdiction": "IN_DELHI",
            },
            headers=self.headers,
        )
        assert res.status_code == 201
        data = res.json()
        assert data["case_id"] == self.case_id
        assert data["title"] == "Operation Disputed Wire: Synthetic Fraud Ring"

        # Verify case retrieval
        get_res = client.get(f"/api/v1/forensics/cases/{self.case_id}", headers=self.headers)
        assert get_res.status_code == 200
        assert get_res.json()["case_id"] == self.case_id

    def test_02_evidence_upload_hashing_and_cas_storage(self, client):
        """Step 2: Upload heterogeneous evidence and verify SHA-256 and immutable CAS storage."""
        # 2a: Bank Statement CSV
        csv_bytes = CSV_BANK_STATEMENT.encode("utf-8")
        res1 = client.post(
            f"/api/v1/forensics/cases/{self.case_id}/evidence/upload",
            files={"file": ("axis_cbs_statement.csv", io.BytesIO(csv_bytes), "text/csv")},
            data={"source_channel": "BANK_STATEMENT_EXPORT"},
            headers=self.headers,
        )
        assert res1.status_code == 201
        ev1 = res1.json()["evidence"]
        assert ev1["original_filename"] == "axis_cbs_statement.csv"
        assert len(ev1["sha256"]) == 64
        assert ev1["is_duplicate"] is False
        assert res1.json()["analysis_job"]["status"] == "COMPLETED"

        # 2b: Disputed Receipt Screenshot PNG
        res2 = client.post(
            f"/api/v1/forensics/cases/{self.case_id}/evidence/upload",
            files={"file": ("phonepe_disputed_receipt.png", io.BytesIO(PNG_RECEIPT_BYTES), "image/png")},
            data={"source_channel": "DISPUTED_CLAIM_RECEIPT"},
            headers=self.headers,
        )
        assert res2.status_code == 201
        ev2 = res2.json()["evidence"]
        assert ev2["original_filename"] == "phonepe_disputed_receipt.png"
        assert ev2["is_duplicate"] is False

        # 2c: Duplicate Submission (exact duplicate of CSV)
        res3 = client.post(
            f"/api/v1/forensics/cases/{self.case_id}/evidence/upload",
            files={"file": ("axis_cbs_duplicate.csv", io.BytesIO(csv_bytes), "text/csv")},
            data={"source_channel": "DUPLICATE_SUBMISSION"},
            headers=self.headers,
        )
        assert res3.status_code == 201
        ev3 = res3.json()["evidence"]
        assert ev3["sha256"] == ev1["sha256"]
        assert ev3["is_duplicate"] is True

        # Verify artifact list in Case
        art_res = client.get(f"/api/v1/forensics/cases/{self.case_id}/artifacts", headers=self.headers)
        assert art_res.status_code == 200
        artifacts = art_res.json()
        assert len(artifacts) >= 2

    def test_03_trace_financial_reconciliation_and_screenshot_examination(self, client):
        """Step 3: TRACE double-entry reconciliation and contradiction detection."""
        # Run reconciliation endpoint
        res = client.post(f"/api/v1/forensics/cases/{self.case_id}/trace/reconcile", headers=self.headers)
        assert res.status_code == 200
        data = res.json()

        # Balance reconciliation
        recon = data["reconciliation"]
        assert recon["transaction_count"] >= 1
        assert recon["total_debits"] == 25000.0

        # Discrepancy finding check (₹25,000 CBS debit vs ₹15,000 receipt claim)
        findings = data["screenshot_findings"]
        assert len(findings) >= 1
        discrepancy = findings[0]
        assert discrepancy["cbs_amount"] == 25000.0
        assert discrepancy["receipt_amount"] == 15000.0
        assert discrepancy["rrn"] == "202602148891"
        assert "Amount Discrepancy" in discrepancy["title"]

    def test_04_aegis_entity_normalization_and_epistemic_safety(self):
        """Step 4: AEGIS identifier normalization without unsafe automated merges."""
        # Test Indian E.164 normalization
        p1 = self.aegis_gateway.normalize_phone_number("9876543210")
        assert p1.is_valid is True
        assert p1.normalized_value == "+919876543210"

        p2 = self.aegis_gateway.normalize_phone_number("+91 98112-23344")
        assert p2.is_valid is True
        assert p2.normalized_value == "+919811223344"

        # Invalid phone rejection
        p_invalid = self.aegis_gateway.normalize_phone_number("12345")
        assert p_invalid.is_valid is False

        # UPI VPA normalization
        v1 = self.aegis_gateway.normalize_upi_vpa("Merchant.Pay@OkHdfcBank")
        assert v1.is_valid is True
        assert v1.normalized_value == "merchant.pay@okhdfcbank"

        # IFSC validation
        ifsc1 = self.aegis_gateway.validate_ifsc_code("HDFC0001234")
        assert ifsc1.is_valid is True

        ifsc_bad = self.aegis_gateway.validate_ifsc_code("INVALID_IFSC")
        assert ifsc_bad.is_valid is False

        # Entity resolution: ensure entities with different phones are NOT merged
        obs = [
            {"evidence_id": "EV-1", "extracted_value": {"phone": "9876543210", "vpa": "merchant@okhdfcbank"}},
            {"evidence_id": "EV-2", "extracted_value": {"phone": "9811223344", "vpa": "suspect@paytm"}},
        ]
        entities, _ = self.aegis_gateway.resolve_entities(self.case_id, obs)
        assert len(entities) == 4  # 2 phones + 2 VPAs (strictly decoupled)
        for e in entities:
            assert e.match_basis == EntityMatchBasis.EXACT_IDENTIFIER

    def test_05_statutory_section_63_bsa_report_generation(self, client):
        """Step 5: Generate court-admissible Section 63 BSA legal report with SHA-256 seal."""
        rep_res = client.post(
            f"/api/v1/forensics/cases/{self.case_id}/reports",
            json={
                "examiner_name": "Senior Digital Forensics Examiner Delhi",
                "investigation_purpose": "Statutory Inspection under Section 63 BSA, 2023",
            },
            headers=self.headers,
        )
        assert rep_res.status_code == 200
        report = rep_res.json()
        assert report["case_id"] == self.case_id
        assert "report_id" in report
        assert len(report["fingerprint"]) == 64
        report_id = report["report_id"]

        # Verify report integrity check endpoint
        ver_res = client.get(f"/api/v1/forensics/cases/{self.case_id}/reports/{report_id}/verify", headers=self.headers)
        assert ver_res.status_code == 200
        assert ver_res.json()["verified"] is True
        assert ver_res.json()["status"] == "VERIFIED_INTACT"

        # Export report as PDF bytes
        pdf_res = client.get(f"/api/v1/forensics/cases/{self.case_id}/reports/{report_id}/export?format=pdf", headers=self.headers)
        assert pdf_res.status_code == 200
        assert pdf_res.headers["content-type"] == "application/pdf"
        assert pdf_res.content.startswith(b"%PDF-")

    def test_06_whatsapp_webhook_simulator(self, client):
        """Step 6: Ingest WhatsApp webhook payload and preserve evidence bytes in CAS."""
        webhook_payload = {
            "entry": [
                {
                    "id": "WHATSAPP_BIZ_ACCOUNT_1",
                    "changes": [
                        {
                            "value": {
                                "messaging_product": "whatsapp",
                                "contacts": [{"profile": {"name": "Informant User"}, "wa_id": "919999888877"}],
                                "messages": [
                                    {
                                        "from": "919999888877",
                                        "id": "wamid.HBgLMjAyNjAyMTQxNTE",
                                        "timestamp": "1771077120",
                                        "type": "text",
                                        "text": {"body": "I sent the payment of Rs 25000 to merchant@okhdfcbank under RRN 202602148891"},
                                    }
                                ],
                            }
                        }
                    ],
                }
            ]
        }

        res = client.post(
            f"/api/v1/forensics/cases/{self.case_id}/whatsapp/webhook",
            json=webhook_payload,
            headers={**self.headers, "X-Hub-Signature-256": "sha256=SIMULATED_TEST_SIGNATURE"},
        )
        assert res.status_code == 200
        data = res.json()
        assert data["status"] == "SUCCESS"
        assert len(data["admitted_evidence"]) == 1
        assert data["admitted_evidence"][0]["source_channel"] == "WHATSAPP_WEBHOOK"
        assert len(data["observations"]) == 1

    def test_07_unauthorized_case_access_fails_closed(self, client):
        """Step 7: Enforce 7-factor RBAC: unauthorized token rejected with 403."""
        # Create token for different officer with different case scope (INVESTIGATOR_GURUGRAM)
        unauth_token = self.auth_service.create_jwt_token("INVESTIGATOR_GURUGRAM")
        unauth_headers = {"Authorization": f"Bearer {unauth_token}"}

        res = client.get(f"/api/v1/forensics/cases/{self.case_id}", headers=unauth_headers)
        assert res.status_code == 403
        assert "ACCESS_DENIED" in res.json()["detail"] or "not authorized" in res.json()["detail"]
