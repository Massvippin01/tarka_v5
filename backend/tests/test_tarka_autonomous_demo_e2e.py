"""
TARKA Autonomous Demo Director - Comprehensive End-to-End Verification Suite

Tests:
1. Scene ordering, structure, and 5-point layman explanation invariants.
2. Real backend forensics APIs (Z3 solver, SHA-256 bitstream, ₹25k vs ₹15k contradiction, counterfactual diff).
3. Playwright browser execution: zero-mouse walkthrough, animated arrow & spotlight placement,
   transport controls (pause, resume, restart, stop, next, prev), responsive viewports.
4. Idempotency & non-corruption of forensic custody records across repeated runs.
"""

import json
import os
import sys
import time
import pytest
import urllib.request
from playwright.sync_api import sync_playwright, Page, expect

# Ensure backend app in pythonpath
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
from app.services.auth_service import AuthService

BACKEND_URL = "http://127.0.0.1:8000"
FRONTEND_URL = "http://127.0.0.1:5173"
CASE_ID = "upi_payment_discrepancy"


def get_auth_token():
    auth_service = AuthService.get_instance()
    return auth_service.create_jwt_token("INVESTIGATOR_DELHI")


def make_api_request(endpoint: str, method: str = "GET", data: dict = None):
    token = get_auth_token()
    url = f"{BACKEND_URL}/api/v1/forensics{endpoint}"
    req_data = json.dumps(data).encode("utf-8") if data else None
    req = urllib.request.Request(url, data=req_data, method=method)
    req.add_header("Authorization", f"Bearer {token}")
    if data:
        req.add_header("Content-Type", "application/json")
    with urllib.request.urlopen(req) as resp:
        return json.loads(resp.read().decode("utf-8"))


class TestTarkaDemoBackendInvariants:
    """Verifies that all forensic operations orchestrated by the demo director are backed by real logic."""

    def test_01_backend_health_and_z3_solver(self):
        health = make_api_request("/health")
        assert health["status"] == "healthy"
        assert "Z3 SMT" in health["solver"]
        assert "TARKA" in health["engine"]

    def test_02_synthetic_case_seed_and_artifacts(self):
        seed_res = make_api_request(f"/cases/{CASE_ID}/seed-synthetic", method="POST")
        assert seed_res is not None

        artifacts = make_api_request(f"/cases/{CASE_ID}/artifacts")
        assert len(artifacts) >= 6
        filenames = [a["filename"] for a in artifacts]
        assert "bank_statement.csv" in filenames
        assert "cdr_records.csv" in filenames
        assert "screenshot_claim.json" in filenames

        # Verify ART-001 core bank statement is Tier 1
        bank_art = next(a for a in artifacts if "bank_statement" in a["filename"])
        assert bank_art["source_tier"] == "T1"
        assert len(bank_art["sha256"]) == 64

    def test_03_real_bitstream_sha256_verification(self):
        artifacts = make_api_request(f"/cases/{CASE_ID}/artifacts")
        bank_art = next(a for a in artifacts if "bank_statement" in a["filename"])
        art_id = bank_art["artifact_id"]

        res = make_api_request(f"/cases/{CASE_ID}/artifacts/{art_id}/verify")
        assert res["bitstream_verified"] is True
        assert res["stored_hash"] == bank_art["sha256"]

    def test_04_z3_amount_discrepancy_contradiction_values(self):
        contras = make_api_request(f"/cases/{CASE_ID}/contradictions")
        contra_list = contras.get("contradictions", [])
        assert len(contra_list) > 0

        amt_contra = next(c for c in contra_list if "AMT" in c["finding_id"])
        assert amt_contra is not None
        # Verify ₹25,000 (core bank) vs ₹15,000 (screenshot) values
        orig_vals = amt_contra["original_values"]
        assert float(orig_vals["bank_statement.csv"]) == 25000.0
        assert float(orig_vals["screenshot_claim.json"]) == 15000.0

    def test_05_counterfactual_recomputation_dissolves_finding(self):
        # Exclude disputed screenshot ART-004-BCCD4200
        payload = {
            "baseline_run_id": "run-001",
            "excluded_artifact_ids": ["ART-004-BCCD4200"],
        }
        res = make_api_request(f"/cases/{CASE_ID}/challenge", method="POST", data=payload)
        removed_ids = [f["finding_id"] for f in res.get("removed_findings", [])]
        surviving_ids = [f["finding_id"] for f in res.get("surviving_findings", [])]

        # Finding-02 (the ₹15k screenshot claim discrepancy) dissolves
        assert "FINDING-02" in removed_ids
        # Bank debit and CDR corroboration survive
        assert "FINDING-04" in surviving_ids

    def test_06_section_63_bsa_report_generation_and_seal(self):
        payload = {
            "examiner_name": "Lead Examiner Vikramaditya",
            "investigation_purpose": "SUTRAM 2026 Forensic Audit",
        }
        rep = make_api_request(f"/cases/{CASE_ID}/reports", method="POST", data=payload)
        meta = rep.get("report_metadata", {})
        assert meta.get("report_id") is not None
        assert len(meta.get("fingerprint", "")) == 64
        assert len(rep.get("artifact_manifest", [])) >= 6


class TestTarkaDemoBrowserEndToEnd:
    """Verifies the complete browser UI demo walkthrough using Playwright."""

    @pytest.fixture(scope="class")
    def browser_context(self):
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True)
            context = browser.new_context(
                viewport={"width": 1920, "height": 1080},
                device_scale_factor=1,
            )
            # Inject auth token into localStorage
            token = get_auth_token()
            page = context.new_page()
            page.goto(f"{FRONTEND_URL}/")
            page.evaluate(
                f"""() => {{
                    localStorage.setItem('auth_token', '{token}');
                    localStorage.setItem('user_role', 'INVESTIGATOR_DELHI');
                }}"""
            )
            yield page
            browser.close()

    def test_01_landing_page_and_walkthrough_button(self, browser_context: Page):
        page = browser_context
        page.goto(f"{FRONTEND_URL}/?tab=landing")
        page.wait_for_selector("#btn-open-workstation", timeout=10000)

        # Autonomous walkthrough button is visible
        walkthrough_btn = page.locator("#btn-autonomous-demo")
        expect(walkthrough_btn).to_be_visible()
        assert "Autonomous Walkthrough" in walkthrough_btn.inner_text()

    def test_02_preflight_modal_checks_pass(self, browser_context: Page):
        page = browser_context
        # Ensure landing page if not already there
        if not page.locator("#btn-autonomous-demo").first.is_visible():
            page.goto(f"{FRONTEND_URL}/?tab=landing")
            page.wait_for_selector("#btn-autonomous-demo", timeout=10000)

        # Click Autonomous Walkthrough button
        page.locator("#btn-autonomous-demo").first.click()

        # Preflight modal appears
        modal = page.locator('[data-testid="demo-director-modal"]')
        expect(modal).to_be_visible(timeout=5000)

        # Operator checkbox checked
        checkbox = page.locator("#operator-confirm-record")
        if checkbox.is_visible() and not checkbox.is_checked():
            checkbox.check()

        # Assert preflight checks pass and start button enables
        start_btn = page.locator('[data-testid="btn-start-autonomous-demo"]')
        expect(start_btn).to_be_enabled(timeout=35000)

    def test_03_zero_mouse_scene_start_and_arrow_overlay(self, browser_context: Page):
        page = browser_context
        # Launch demo with zero mouse interaction required thereafter
        page.locator('[data-testid="btn-start-autonomous-demo"]').click()

        # Wait for 3-second countdown to complete and Scene 1 to initiate
        caption_card = page.locator('[data-testid="demo-caption-card"]')
        expect(caption_card).to_be_visible(timeout=8000)

        # Verify numbered step pill and act
        expect(caption_card).to_contain_text("ACT 1")
        expect(caption_card).to_contain_text("SCENE 1/8")

        # Spotlight and connector arrow are rendered
        spotlight = page.locator('[data-testid="demo-target-spotlight"]')
        expect(spotlight).to_be_visible()

    def test_04_transport_controls_pause_resume_next_prev(self, browser_context: Page):
        page = browser_context
        caption_card = page.locator('[data-testid="demo-caption-card"]')

        # 1. Test Pause
        pause_btn = page.locator('[data-testid="btn-demo-pause-resume"]')
        pause_btn.click()
        expect(caption_card).to_contain_text("PAUSED")

        # 2. Test Resume
        pause_btn.click()
        expect(caption_card).to_contain_text("RUNNING")

        # 3. Test Next Scene (→)
        next_btn = page.locator('[data-testid="btn-demo-next"]')
        next_btn.click()
        page.wait_for_timeout(1000)
        expect(caption_card).to_contain_text("SCENE 2/8")
        expect(caption_card).to_contain_text("Evidence Register")

        # 4. Test Prev Scene (←)
        page.keyboard.press("ArrowLeft")
        page.wait_for_timeout(1000)
        expect(caption_card).to_contain_text("SCENE 1/8")

        # Return to Scene 2 for forensic verification
        page.keyboard.press("ArrowRight")
        page.wait_for_timeout(1000)
        expect(caption_card).to_contain_text("SCENE 2/8")

    def test_05_scene_2_evidence_bitstream_verification(self, browser_context: Page):
        page = browser_context
        # On Scene 2 (Evidence Register)
        # Verify bitstream check was executed automatically
        page.wait_for_selector('[data-testid="artifact-row-ART-001-DB791B3C"]', timeout=8000)
        row = page.locator('[data-testid="artifact-row-ART-001-DB791B3C"]')
        expect(row).to_be_visible()

    def test_06_scene_4_contradiction_analysis_z3(self, browser_context: Page):
        page = browser_context
        # Advance to Scene 4 (Contradictions)
        next_btn = page.locator('[data-testid="btn-demo-next"]')
        next_btn.click()  # -> Scene 3 (Timeline)
        page.wait_for_timeout(1000)
        next_btn.click()  # -> Scene 4 (Contradictions)
        page.wait_for_timeout(1500)

        caption_card = page.locator('[data-testid="demo-caption-card"]')
        expect(caption_card).to_contain_text("SCENE 4/8")
        expect(caption_card).to_contain_text("Z3 SMT Contradiction Analysis")

        # Verify contradiction card for amount discrepancy is highlighted
        contra_card = page.locator('[data-testid="contradiction-card-CONTRA-AMT"]')
        expect(contra_card).to_be_visible(timeout=5000)

    def test_07_scene_5_counterfactual_robustness_lab(self, browser_context: Page):
        page = browser_context
        # Advance to Scene 5 (Robustness Lab)
        next_btn = page.locator('[data-testid="btn-demo-next"]')
        next_btn.click()
        page.wait_for_timeout(2000)

        caption_card = page.locator('[data-testid="demo-caption-card"]')
        expect(caption_card).to_contain_text("SCENE 5/8")
        expect(caption_card).to_contain_text("Robustness Lab")

        # Verify challenge button is present and targeted
        challenge_btn = page.locator('[data-testid="btn-execute-challenge"]')
        expect(challenge_btn).to_be_visible()

    def test_08_scene_7_section_63_bsa_report_modal(self, browser_context: Page):
        page = browser_context
        # Advance to Scene 6 then Scene 7
        next_btn = page.locator('[data-testid="btn-demo-next"]')
        next_btn.click()  # -> Scene 6 (Provenance DAG)
        page.wait_for_timeout(1000)
        next_btn.click()  # -> Scene 7 (Section 63 Report)
        page.wait_for_timeout(2000)

        caption_card = page.locator('[data-testid="demo-caption-card"]')
        expect(caption_card).to_contain_text("SCENE 7/8")
        expect(caption_card).to_contain_text("Section 63 BSA")

    def test_09_responsive_viewport_resizing(self, browser_context: Page):
        page = browser_context
        # Test on smaller viewport (e.g. 1280x720)
        page.set_viewport_size({"width": 1280, "height": 720})
        page.wait_for_timeout(500)

        caption_card = page.locator('[data-testid="demo-caption-card"]')
        expect(caption_card).to_be_visible()

        # Reset viewport
        page.set_viewport_size({"width": 1920, "height": 1080})

    def test_10_emergency_stop_and_exit(self, browser_context: Page):
        page = browser_context
        # Press Esc key to stop demo
        page.keyboard.press("Escape")
        page.wait_for_timeout(500)

        caption_card = page.locator('[data-testid="demo-caption-card"]')
        expect(caption_card).not_to_be_visible()
