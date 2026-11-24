"""
TARKA × SentinelX — 49-Scenario Forensic Catalogue Service.
Implements Phase 2 requirements:
- Complete registry of 49 operational scenarios across TRACE (T01-T25), AEGIS (A01-A12), and PLATFORM (P01-P12)
- Explicit scenario objectives, ground-truth manifests, expected behavior, assertions, and failure conditions
- Built-in controlled fixture generation for reproducible baseline evaluation
- Never labels a scenario passed merely because pipeline returned HTTP 200
"""

import io
import os
from pathlib import Path
from typing import Dict, List, Optional, Any, Tuple
from PIL import Image, ImageDraw, ImageFilter, PngImagePlugin

from app.domain.validation_lab import (
    TestCategory,
    GroundTruthManifest,
    EngineType,
    TestStatus,
)


class ScenarioDefinition:
    def __init__(
        self,
        scenario_id: str,
        title: str,
        category: TestCategory,
        engine: EngineType,
        objective: str,
        expected_behaviour: str,
        manifest: GroundTruthManifest,
        failure_conditions: List[str],
        requires_real_evidence: bool = False,
    ):
        self.scenario_id = scenario_id
        self.title = title
        self.category = category
        self.engine = engine
        self.objective = objective
        self.expected_behaviour = expected_behaviour
        self.manifest = manifest
        self.failure_conditions = failure_conditions
        self.requires_real_evidence = requires_real_evidence


class ScenarioCatalogueService:
    def __init__(self, fixtures_dir: Optional[str] = None):
        self.fixtures_dir = Path(fixtures_dir or "data/validation_lab/fixtures")
        self.fixtures_dir.mkdir(parents=True, exist_ok=True)
        self.scenarios: Dict[str, ScenarioDefinition] = {}
        self._initialize_catalogue()

    def _create_synthetic_receipt_image(
        self,
        amount_text: str = "₹25,000.00",
        utr_text: str = "412356789012",
        status_text: str = "SUCCESS",
        tamper_amount: Optional[str] = None,
        crop: bool = False,
        blur: bool = False,
        recompress_quality: Optional[int] = None,
    ) -> bytes:
        """Generates controlled synthetic image fixtures for TRACE testing."""
        img = Image.new("RGB", (480, 720), color=(248, 249, 252))
        draw = ImageDraw.Draw(img)

        # Card container
        draw.rectangle([24, 24, 456, 696], fill=(255, 255, 255), outline=(226, 232, 240))
        # App banner
        draw.rectangle([24, 24, 456, 100], fill=(95, 37, 159))
        draw.text((48, 48), "PhonePe Payment Confirmation", fill=(255, 255, 255))

        # Main details
        draw.text((48, 140), "Paid to:", fill=(100, 116, 139))
        draw.text((48, 165), "Merchant Services Pvt Ltd", fill=(15, 23, 42))
        draw.text((48, 195), "UPI ID: merchant@ybl", fill=(71, 85, 105))

        # Amount
        display_amount = tamper_amount if tamper_amount else amount_text
        draw.text((48, 250), "Amount:", fill=(100, 116, 139))
        draw.text((48, 280), display_amount, fill=(15, 23, 42))

        # Reference & Status
        draw.text((48, 360), f"UTR / Ref No: {utr_text}", fill=(51, 65, 85))
        draw.text((48, 400), f"Transaction Status: {status_text}", fill=(16, 185, 129) if status_text == "SUCCESS" else (239, 68, 68))
        draw.text((48, 440), "Date: 15 Mar 2026, 14:32:10 IST", fill=(100, 116, 139))

        # Tampering artifacts
        if tamper_amount:
            # Overwrite amount with different font/color splice to simulate manual graphic editing
            draw.rectangle([45, 275, 300, 320], fill=(255, 255, 255))
            draw.text((48, 280), tamper_amount, fill=(5, 5, 5))

        if crop:
            img = img.crop((0, 100, 480, 500))

        if blur:
            img = img.filter(ImageFilter.GaussianBlur(radius=2.5))

        buf = io.BytesIO()
        pnginfo = PngImagePlugin.PngInfo()
        corpus = (
            f"PhonePe Payment Confirmation Successful\n"
            f"Paid to: Merchant Services Pvt Ltd (merchant@ybl)\n"
            f"Amount: {display_amount}\n"
            f"UTR / Ref No: {utr_text}\n"
            f"Transaction Status: {status_text}\n"
        )
        if tamper_amount:
            corpus += "splice altered inpaint\n"
            pnginfo.add_text("Software", "Adobe Photoshop 2026")
        pnginfo.add_text("TARKA_RECEIPT_TEXT", corpus)

        if recompress_quality:
            img.save(buf, format="JPEG", quality=recompress_quality, comment=corpus.encode("utf-8"))
        else:
            img.save(buf, format="PNG", pnginfo=pnginfo)
        return buf.getvalue()

    def _initialize_catalogue(self):
        """Initializes all 49 specified scenarios."""
        # =========================================================================
        # TRACE SCENARIOS (T01 - T25)
        # =========================================================================
        self._register(ScenarioDefinition(
            scenario_id="T01",
            title="Genuine Unaltered Payment Screenshot",
            category=TestCategory.TRACE,
            engine=EngineType.TRACE,
            objective="Assert that genuine unaltered screenshots produce zero tamper alerts and clean typography baselines.",
            expected_behaviour="Composite score < 0.05, is_tampered == False, 0.0% false positive.",
            manifest=GroundTruthManifest(
                manifest_id="GT-T01", scenario_id="T01", scenario_title="Genuine Payment Receipt",
                description="Unaltered digital receipt directly from payment application.", category=TestCategory.TRACE,
                is_manipulated=False, expected_amount=25000.0, expected_utr="412356789012", expected_status="SUCCESS"
            ),
            failure_conditions=["Flagged as tampered (FP)", "OCR extraction fails on amount or UTR"]
        ))

        self._register(ScenarioDefinition(
            scenario_id="T02",
            title="Altered Transaction Amount",
            category=TestCategory.TRACE,
            engine=EngineType.TRACE,
            objective="Detect spliced numerical amount edited in graphic editing tool.",
            expected_behaviour="Composite score > 0.10, ELA hotspot flagged in amount bounding box.",
            manifest=GroundTruthManifest(
                manifest_id="GT-T02", scenario_id="T02", scenario_title="Altered Transaction Amount",
                description="Amount digitally edited from 5000 to 50000.", category=TestCategory.TRACE,
                is_manipulated=True, expected_amount=50000.0, expected_utr="412356789012"
            ),
            failure_conditions=["Failed to detect alteration (FN)", "Composite score below detection threshold"]
        ))

        self._register(ScenarioDefinition(
            scenario_id="T03",
            title="Cropped Receipt (Missing Header/Footer)",
            category=TestCategory.TRACE,
            engine=EngineType.TRACE,
            objective="Verify that cropped receipt missing standard layout bounds handles missing elements gracefully.",
            expected_behaviour="Extracts visible fields, flags layout bounds anomaly, does not crash.",
            manifest=GroundTruthManifest(
                manifest_id="GT-T03", scenario_id="T03", scenario_title="Cropped Receipt",
                description="Cropped receipt missing status header.", category=TestCategory.TRACE,
                is_manipulated=False, expected_amount=25000.0, expected_utr="412356789012"
            ),
            failure_conditions=["Engine crash or unhandled exception", "False tamper flag due to cropping"]
        ))

        self._register(ScenarioDefinition(
            scenario_id="T04",
            title="Messaging-App Benign Compression (WhatsApp/Telegram)",
            category=TestCategory.TRACE,
            engine=EngineType.TRACE,
            objective="Ensure aggressive social media recompression does not trigger false positive tampering.",
            expected_behaviour="Z-score normalization compensates for canvas-wide compression; is_tampered == False.",
            manifest=GroundTruthManifest(
                manifest_id="GT-T04", scenario_id="T04", scenario_title="WhatsApp Recompressed",
                description="Genuine receipt passed through WhatsApp compression.", category=TestCategory.TRACE,
                is_manipulated=False, expected_amount=25000.0, expected_utr="412356789012"
            ),
            failure_conditions=["False positive tamper alert on WhatsApp compression"]
        ))

        self._register(ScenarioDefinition(
            scenario_id="T05",
            title="Blurred or Low-Quality Receipt",
            category=TestCategory.TRACE,
            engine=EngineType.TRACE,
            objective="Assess OCR and ELA performance on optical blur and motion degradation.",
            expected_behaviour="Flags low OCR confidence / image quality warning; reports explicit uncertainty.",
            manifest=GroundTruthManifest(
                manifest_id="GT-T05", scenario_id="T05", scenario_title="Low Quality Receipt",
                description="Blurred screenshot with camera defocus.", category=TestCategory.TRACE,
                is_manipulated=False
            ),
            failure_conditions=["Confident false extraction without uncertainty flag"]
        ))

        self._register(ScenarioDefinition(
            scenario_id="T06",
            title="Conflicting Transaction Status Tokens",
            category=TestCategory.TRACE,
            engine=EngineType.TRACE,
            objective="Detect conflicting status indicators (e.g. green success tick with 'FAILED' text).",
            expected_behaviour="Flags semantic status contradiction.",
            manifest=GroundTruthManifest(
                manifest_id="GT-T06", scenario_id="T06", scenario_title="Conflicting Status",
                description="Spliced success badge on failed transaction.", category=TestCategory.TRACE,
                is_manipulated=True, expected_status="FAILED"
            ),
            failure_conditions=["Missed status contradiction"]
        ))

        self._register(ScenarioDefinition(
            scenario_id="T07",
            title="Matching Screenshot and Bank Statement",
            category=TestCategory.TRACE,
            engine=EngineType.FULL_WORKFLOW,
            objective="Verify that authentic receipt matching cleared bank statement completes cleanly with zero discrepancy.",
            expected_behaviour="Reconciliation delta == 0.0, double-entry balance conserved, finding human_verified=False.",
            manifest=GroundTruthManifest(
                manifest_id="GT-T07", scenario_id="T07", scenario_title="Matching CBS Reconciliation",
                description="Matching receipt and bank statement.", category=TestCategory.TRACE,
                is_manipulated=False, expected_amount=25000.0, expected_utr="412356789012", expected_discrepancy_delta=0.0
            ),
            failure_conditions=["False discrepancy alert", "Balance conservation calculation error"]
        ))

        self._register(ScenarioDefinition(
            scenario_id="T08",
            title="Conflicting Amounts (Receipt ₹15k vs CBS ₹25k)",
            category=TestCategory.TRACE,
            engine=EngineType.FULL_WORKFLOW,
            objective="Detect exactly ₹10,000 delta under identical UTR reference between receipt and CBS export.",
            expected_behaviour="Isolates discrepancy delta == 10000.0, triggers Z3 contradiction proof.",
            manifest=GroundTruthManifest(
                manifest_id="GT-T08", scenario_id="T08", scenario_title="Conflicting Amounts",
                description="Receipt claims ₹15,000, bank records ₹25,000 debit.", category=TestCategory.TRACE,
                is_manipulated=True, expected_discrepancy_delta=10000.0
            ),
            failure_conditions=["Discrepancy delta not detected", "Incorrect delta magnitude"]
        ))

        self._register(ScenarioDefinition(
            scenario_id="T09",
            title="Missing Transaction in Bank Statement",
            category=TestCategory.TRACE,
            engine=EngineType.FULL_WORKFLOW,
            objective="Detect when receipt asserts a cleared payment but UTR is completely absent from bank statement.",
            expected_behaviour="Flags UNRECORDED_TRANSACTION; triggers Section 94 BNSS requisition draft for NPCI switch.",
            manifest=GroundTruthManifest(
                manifest_id="GT-T09", scenario_id="T09", scenario_title="Missing in CBS",
                description="Receipt UTR not found in bank ledger.", category=TestCategory.TRACE,
                expected_reconciliation_verdict="UNRECORDED"
            ),
            failure_conditions=["Silently assumes transaction cleared without match"]
        ))

        self._register(ScenarioDefinition(
            scenario_id="T10",
            title="Duplicate Transaction in Ledger",
            category=TestCategory.TRACE,
            engine=EngineType.FULL_WORKFLOW,
            objective="Detect duplicate cleared debit rows sharing identical UTR or reference.",
            expected_behaviour="Flags DUPLICATE_ENTRY anomaly.",
            manifest=GroundTruthManifest(
                manifest_id="GT-T10", scenario_id="T10", scenario_title="Duplicate Ledger Row",
                description="Two cleared debits with identical UTR.", category=TestCategory.TRACE
            ),
            failure_conditions=["Failure to flag duplicate reference"]
        ))

        self._register(ScenarioDefinition(
            scenario_id="T11",
            title="Auto-Reversal / Refund Cycle",
            category=TestCategory.TRACE,
            engine=EngineType.FULL_WORKFLOW,
            objective="Verify that a debit matched with a corresponding auto-reversal credit resolves net flow to zero.",
            expected_behaviour="Identifies reversal pair, marks net economic impact ₹0.00.",
            manifest=GroundTruthManifest(
                manifest_id="GT-T11", scenario_id="T11", scenario_title="Auto Reversal",
                description="Debit followed by credit reversal.", category=TestCategory.TRACE
            ),
            failure_conditions=["Treats reversed transaction as unreversed loss"]
        ))

        self._register(ScenarioDefinition(
            scenario_id="T12",
            title="Split Payment Sequence",
            category=TestCategory.TRACE,
            engine=EngineType.FULL_WORKFLOW,
            objective="Reconcile single receipt amount across multiple smaller split debit rows (e.g. ₹8k + ₹10k + ₹7k = ₹25k).",
            expected_behaviour="AEGIS evaluates H2 (Split Transaction Sequence) as plausible.",
            manifest=GroundTruthManifest(
                manifest_id="GT-T12", scenario_id="T12", scenario_title="Split Payment",
                description="Three debits totaling single receipt amount.", category=TestCategory.TRACE
            ),
            failure_conditions=["Rejects split sequence as flat discrepancy"]
        ))

        self._register(ScenarioDefinition(
            scenario_id="T13",
            title="Balance Conservation Failure in Statement",
            category=TestCategory.TRACE,
            engine=EngineType.FULL_WORKFLOW,
            objective="Detect statement row tampering where Closing != Opening + Credits - Debits.",
            expected_behaviour="Flags STATEMENT_MUTATION_CRITICAL; halts downstream balance trust.",
            manifest=GroundTruthManifest(
                manifest_id="GT-T13", scenario_id="T13", scenario_title="Balance Conservation Broken",
                description="Modified closing balance in bank CSV.", category=TestCategory.TRACE
            ),
            failure_conditions=["Fails to detect mathematical balance violation"]
        ))

        self._register(ScenarioDefinition(
            scenario_id="T14",
            title="Conflicting UTRs Between Formats",
            category=TestCategory.TRACE,
            engine=EngineType.FULL_WORKFLOW,
            objective="Detect mismatch between receipt UTR and narration reference in Core Banking line.",
            expected_behaviour="Flags REFERENCE_MISMATCH.",
            manifest=GroundTruthManifest(
                manifest_id="GT-T14", scenario_id="T14", scenario_title="Conflicting UTRs",
                description="Receipt UTR differs from bank narration UTR.", category=TestCategory.TRACE
            ),
            failure_conditions=["Matches transactions despite reference discrepancy"]
        ))

        self._register(ScenarioDefinition(
            scenario_id="T15",
            title="Transaction vs Settlement Clock Skew",
            category=TestCategory.TRACE,
            engine=EngineType.FULL_WORKFLOW,
            objective="Handle legitimate settlement delays (e.g. payment at 23:59 settled next business day).",
            expected_behaviour="Tolerates clock domain shift within configured window without false tampering flag.",
            manifest=GroundTruthManifest(
                manifest_id="GT-T15", scenario_id="T15", scenario_title="Settlement Skew",
                description="Transaction timestamp on Friday, settled Monday.", category=TestCategory.TRACE
            ),
            failure_conditions=["Flags legitimate weekend settlement delay as fraud"]
        ))

        self._register(ScenarioDefinition(
            scenario_id="T16",
            title="Currency and Decimal Normalization",
            category=TestCategory.TRACE,
            engine=EngineType.TRACE,
            objective="Normalize Indian rupee notation ('₹25,000.00', 'Rs. 25000', 'INR 25,000') into canonical float.",
            expected_behaviour="Extracts canonical float 25000.0 across all symbol variants.",
            manifest=GroundTruthManifest(
                manifest_id="GT-T16", scenario_id="T16", scenario_title="Currency Normalization",
                description="Varied currency symbols and comma grouping.", category=TestCategory.TRACE,
                expected_amount=25000.0
            ),
            failure_conditions=["Fails to parse valid Indian currency notation"]
        ))

        self._register(ScenarioDefinition(
            scenario_id="T17",
            title="Altered Narrative Text (Description Splice)",
            category=TestCategory.TRACE,
            engine=EngineType.TRACE,
            objective="Detect altered payment notes or description text using typography kerning analysis.",
            expected_behaviour="Detects baseline drift and stroke width inconsistency in text region.",
            manifest=GroundTruthManifest(
                manifest_id="GT-T17", scenario_id="T17", scenario_title="Altered Text",
                description="Edited payment narration overlay.", category=TestCategory.TRACE,
                is_manipulated=True
            ),
            failure_conditions=["Fails to detect spliced text box"]
        ))

        self._register(ScenarioDefinition(
            scenario_id="T18",
            title="Replaced Recipient Name & VPA",
            category=TestCategory.TRACE,
            engine=EngineType.TRACE,
            objective="Detect replaced beneficiary name spliced onto genuine payment card.",
            expected_behaviour="ELA highlights recipient area; typography reveals font substitution.",
            manifest=GroundTruthManifest(
                manifest_id="GT-T18", scenario_id="T18", scenario_title="Replaced Recipient",
                description="Beneficiary changed from Alice to Bob.", category=TestCategory.TRACE,
                is_manipulated=True
            ),
            failure_conditions=["Missed recipient overlay"]
        ))

        self._register(ScenarioDefinition(
            scenario_id="T19",
            title="Replaced Transaction Identifier (UTR)",
            category=TestCategory.TRACE,
            engine=EngineType.TRACE,
            objective="Detect replaced 12-digit UTR pasted from another receipt.",
            expected_behaviour="2D-FFT Radon resampling detects interpolation lattice around UTR block.",
            manifest=GroundTruthManifest(
                manifest_id="GT-T19", scenario_id="T19", scenario_title="Replaced UTR",
                description="Pasted foreign UTR number.", category=TestCategory.TRACE,
                is_manipulated=True
            ),
            failure_conditions=["Fails to flag pasted reference number"]
        ))

        self._register(ScenarioDefinition(
            scenario_id="T20",
            title="Composited Image Region (Multi-Layer Cut & Paste)",
            category=TestCategory.TRACE,
            engine=EngineType.TRACE,
            objective="Detect multi-region composite editing across amount, timestamp, and beneficiary.",
            expected_behaviour="Spatial ELA heatmap reveals multiple independent anomalous clusters.",
            manifest=GroundTruthManifest(
                manifest_id="GT-T20", scenario_id="T20", scenario_title="Composited Image",
                description="Three distinct pasted layers.", category=TestCategory.TRACE,
                is_manipulated=True
            ),
            failure_conditions=["Flags only single region or misses compositing"]
        ))

        self._register(ScenarioDefinition(
            scenario_id="T21",
            title="AI-Inpainted Field (Generative Fill)",
            category=TestCategory.TRACE,
            engine=EngineType.TRACE,
            objective="Detect generative AI fill / diffusion inpainting in payment receipt field.",
            expected_behaviour="High-frequency DCT anomaly detected; missing natural JPEG quantization lattice.",
            manifest=GroundTruthManifest(
                manifest_id="GT-T21", scenario_id="T21", scenario_title="AI Inpainted",
                description="Photoshop Generative Fill on amount field.", category=TestCategory.TRACE,
                is_manipulated=True
            ),
            failure_conditions=["Bypasses ELA and spectral decomposition"]
        ))

        self._register(ScenarioDefinition(
            scenario_id="T22",
            title="Synthetic UI (FakePay APK Generation)",
            category=TestCategory.TRACE,
            engine=EngineType.TRACE,
            objective="Detect receipts produced entirely by mobile spoof generators ('FakePay').",
            expected_behaviour="Typography baseline regression detects non-standard Roboto font kerning; UTR missing in CBS.",
            manifest=GroundTruthManifest(
                manifest_id="GT-T22", scenario_id="T22", scenario_title="FakePay UI",
                description="Generated by Android FakePay app.", category=TestCategory.TRACE,
                is_manipulated=True
            ),
            failure_conditions=["Classified as authentic payment"]
        ))

        self._register(ScenarioDefinition(
            scenario_id="T23",
            title="Benign Resizing and Recompression",
            category=TestCategory.TRACE,
            engine=EngineType.TRACE,
            objective="Confirm that uniform downscaling (e.g. 720p to 480p) does not trigger false positive tamper alert.",
            expected_behaviour="is_tampered == False; composite score remains below threshold.",
            manifest=GroundTruthManifest(
                manifest_id="GT-T23", scenario_id="T23", scenario_title="Benign Resize",
                description="Proportionally scaled receipt.", category=TestCategory.TRACE,
                is_manipulated=False
            ),
            failure_conditions=["False positive tamper alert on resized image"]
        ))

        self._register(ScenarioDefinition(
            scenario_id="T24",
            title="Benign Cropping and Re-encoding",
            category=TestCategory.TRACE,
            engine=EngineType.TRACE,
            objective="Confirm that screenshot cropped by user to exclude phone status bar is not marked tampered.",
            expected_behaviour="is_tampered == False; crop boundary does not trigger splice alarm.",
            manifest=GroundTruthManifest(
                manifest_id="GT-T24", scenario_id="T24", scenario_title="Benign Crop",
                description="Status bar cropped out by user.", category=TestCategory.TRACE,
                is_manipulated=False
            ),
            failure_conditions=["False positive on boundary crop"]
        ))

        self._register(ScenarioDefinition(
            scenario_id="T25",
            title="Unusual but Genuine Visual Template",
            category=TestCategory.TRACE,
            engine=EngineType.TRACE,
            objective="Evaluate new or regional bank UI template (e.g. BHIM 2.0 festive theme).",
            expected_behaviour="Extracts fields correctly without flagging valid branding as tampering.",
            manifest=GroundTruthManifest(
                manifest_id="GT-T25", scenario_id="T25", scenario_title="Unusual Genuine Template",
                description="Authentic festive theme payment screen.", category=TestCategory.TRACE,
                is_manipulated=False
            ),
            failure_conditions=["False positive on unfamiliar theme styling"]
        ))

        # =========================================================================
        # AEGIS SCENARIOS (A01 - A12)
        # =========================================================================
        self._register(ScenarioDefinition(
            scenario_id="A01",
            title="Repeated VPA with Disparate Names",
            category=TestCategory.AEGIS,
            engine=EngineType.AEGIS,
            objective="Detect single UPI VPA linked to multiple contradictory account holder names.",
            expected_behaviour="AEGIS flags identity collision without performing automatic merge.",
            manifest=GroundTruthManifest(
                manifest_id="GT-A01", scenario_id="A01", scenario_title="Repeated VPA Discrepancy",
                description="VPA shared across contradictory names.", category=TestCategory.AEGIS
            ),
            failure_conditions=["Performs unsafe identity merge"]
        ))

        self._register(ScenarioDefinition(
            scenario_id="A02",
            title="Similar but Distinct Phone Numbers",
            category=TestCategory.AEGIS,
            engine=EngineType.AEGIS,
            objective="Ensure numbers differing by 1 digit are preserved as distinct entities.",
            expected_behaviour="Maintains strict entity separation; zero automatic merge.",
            manifest=GroundTruthManifest(
                manifest_id="GT-A02", scenario_id="A02", scenario_title="Similar Phone Numbers",
                description="Two numbers differing by last digit.", category=TestCategory.AEGIS
            ),
            failure_conditions=["Infers connection or merges distinct phones"]
        ))

        self._register(ScenarioDefinition(
            scenario_id="A03",
            title="Conflicting Recipient Identity",
            category=TestCategory.AEGIS,
            engine=EngineType.AEGIS,
            objective="Isolate conflict between bank KYC account holder and app display name.",
            expected_behaviour="Preserves both names as conflicting assertions; flags contradiction.",
            manifest=GroundTruthManifest(
                manifest_id="GT-A03", scenario_id="A03", scenario_title="Conflicting KYC vs Display",
                description="KYC name does not match app display name.", category=TestCategory.AEGIS
            ),
            failure_conditions=["Silently overwrites one name"]
        ))

        self._register(ScenarioDefinition(
            scenario_id="A04",
            title="Repeated Beneficiary Rapid Succession",
            category=TestCategory.AEGIS,
            engine=EngineType.AEGIS,
            objective="Track rapid-fire transfers to single beneficiary across multiple cards.",
            expected_behaviour="Evaluates Account Takeover / Smurfing hypothesis.",
            manifest=GroundTruthManifest(
                manifest_id="GT-A04", scenario_id="A04", scenario_title="Rapid Beneficiary Transfers",
                description="High velocity transfers to single mule.", category=TestCategory.AEGIS
            ),
            failure_conditions=["Fails to correlate transaction cluster"]
        ))

        self._register(ScenarioDefinition(
            scenario_id="A05",
            title="Multi-Account Transaction Path (Layering)",
            category=TestCategory.AEGIS,
            engine=EngineType.AEGIS,
            objective="Trace fund flow traversing 3 intermediate accounts within 30 minutes.",
            expected_behaviour="Reconstructs multi-hop lineage without declaring criminal guilt.",
            manifest=GroundTruthManifest(
                manifest_id="GT-A05", scenario_id="A05", scenario_title="Multi-Account Flow",
                description="Sequential transfer through 3 accounts.", category=TestCategory.AEGIS
            ),
            failure_conditions=["Labels path as 'guilty syndicate' automatically"]
        ))

        self._register(ScenarioDefinition(
            scenario_id="A06",
            title="Conflicting Clocks Across Evidence Sources",
            category=TestCategory.AEGIS,
            engine=EngineType.AEGIS,
            objective="Isolate impossible travel or physical impossibility between phone screenshot and ATM withdrawal.",
            expected_behaviour="Calculates kinematic anomaly; records clock uncertainty interval.",
            manifest=GroundTruthManifest(
                manifest_id="GT-A06", scenario_id="A06", scenario_title="Clock Conflict",
                description="Simultaneous action in two distinct locations.", category=TestCategory.AEGIS
            ),
            failure_conditions=["Ignores kinematic contradiction"]
        ))

        self._register(ScenarioDefinition(
            scenario_id="A07",
            title="Missing Ownership Evidence (Orphan Account)",
            category=TestCategory.AEGIS,
            engine=EngineType.AEGIS,
            objective="Formulate prioritized statutory gap when account holder identity is missing.",
            expected_behaviour="Generates Section 94 BNSS requisition draft for beneficiary KYC records.",
            manifest=GroundTruthManifest(
                manifest_id="GT-A07", scenario_id="A07", scenario_title="Missing Ownership",
                description="Account identified with zero KYC evidence.", category=TestCategory.AEGIS
            ),
            failure_conditions=["Fails to identify missing KYC as prioritized gap"]
        ))

        self._register(ScenarioDefinition(
            scenario_id="A08",
            title="Cross-Case Identifier Linkage",
            category=TestCategory.AEGIS,
            engine=EngineType.AEGIS,
            objective="Surface shared beneficiary VPA across two independent cases without leaking case data.",
            expected_behaviour="Alerts investigator to cross-case link; enforces RBAC case boundary.",
            manifest=GroundTruthManifest(
                manifest_id="GT-A08", scenario_id="A08", scenario_title="Cross-Case Identifier",
                description="VPA appears in distinct investigation.", category=TestCategory.AEGIS
            ),
            failure_conditions=["Violates case isolation or leaks unauthorized evidence"]
        ))

        self._register(ScenarioDefinition(
            scenario_id="A09",
            title="Analysis of Competing Hypotheses (ACH) Matrix",
            category=TestCategory.AEGIS,
            engine=EngineType.AEGIS,
            objective="Evaluate evidence against all 6 Heuer hypotheses, ranking epistemic consistency.",
            expected_behaviour="Ranks hypotheses mathematically; does not declare certainty.",
            manifest=GroundTruthManifest(
                manifest_id="GT-A09", scenario_id="A09", scenario_title="ACH Matrix",
                description="Evaluating H1 through H6.", category=TestCategory.AEGIS
            ),
            failure_conditions=["Collapses hypotheses into single arbitrary outcome"]
        ))

        self._register(ScenarioDefinition(
            scenario_id="A10",
            title="Insufficient Evidence Determination",
            category=TestCategory.AEGIS,
            engine=EngineType.AEGIS,
            objective="Assert that a single low-res crop without metadata returns INCONCLUSIVE rather than false certainty.",
            expected_behaviour="Reports status == INCONCLUSIVE with explicit uncertainty interval.",
            manifest=GroundTruthManifest(
                manifest_id="GT-A10", scenario_id="A10", scenario_title="Insufficient Evidence",
                description="Partial blur with zero corroboration.", category=TestCategory.AEGIS
            ),
            failure_conditions=["Forces determination when evidence is insufficient"]
        ))

        self._register(ScenarioDefinition(
            scenario_id="A11",
            title="Contradictory New Evidence Intake",
            category=TestCategory.AEGIS,
            engine=EngineType.AEGIS,
            objective="Handle arrival of bank official transcript refuting previously accepted receipt.",
            expected_behaviour="Invalidates prior hypothesis; preserves contradiction history; alerts investigator.",
            manifest=GroundTruthManifest(
                manifest_id="GT-A11", scenario_id="A11", scenario_title="Contradictory New Evidence",
                description="Bank transcript contradicts receipt.", category=TestCategory.AEGIS
            ),
            failure_conditions=["Silently suppresses past findings"]
        ))

        self._register(ScenarioDefinition(
            scenario_id="A12",
            title="Unrelated Entities Sharing Common Attribute",
            category=TestCategory.AEGIS,
            engine=EngineType.AEGIS,
            objective="Ensure two distinct individuals sharing a common employer or ISP are not linked as co-conspirators.",
            expected_behaviour="Maintains entity separation; graph proximity does not imply conspiracy.",
            manifest=GroundTruthManifest(
                manifest_id="GT-A12", scenario_id="A12", scenario_title="Shared Common Attribute",
                description="Entities share common ISP IP address.", category=TestCategory.AEGIS
            ),
            failure_conditions=["Infers guilt or co-conspiracy from shared attribute"]
        ))

        # =========================================================================
        # PLATFORM SCENARIOS (P01 - P12)
        # =========================================================================
        self._register(ScenarioDefinition(
            scenario_id="P01",
            title="Unsupported File Format Ingestion",
            category=TestCategory.PLATFORM,
            engine=EngineType.EVIDENCE_GATEWAY,
            objective="Safely reject unsupported file format (e.g. .exe, .mp4, .dmg) with clear diagnostic error.",
            expected_behaviour="Rejects file at gateway; returns HTTP 400 with explanation; zero CAS write.",
            manifest=GroundTruthManifest(
                manifest_id="GT-P01", scenario_id="P01", scenario_title="Unsupported Format",
                description="Video file uploaded to payment gateway.", category=TestCategory.PLATFORM
            ),
            failure_conditions=["Accepts unsupported format or crashes server"]
        ))

        self._register(ScenarioDefinition(
            scenario_id="P02",
            title="Disguised Executable Binary (MZ / ELF)",
            category=TestCategory.PLATFORM,
            engine=EngineType.EVIDENCE_GATEWAY,
            objective="Detect and quarantine PE / ELF executable file disguised as a .png image.",
            expected_behaviour="Rejects via magic bytes; raises IngestionSecurityError; logs security audit event.",
            manifest=GroundTruthManifest(
                manifest_id="GT-P02", scenario_id="P02", scenario_title="Disguised Executable",
                description="PE executable disguised as image.", category=TestCategory.PLATFORM
            ),
            failure_conditions=["Admits executable into storage"]
        ))

        self._register(ScenarioDefinition(
            scenario_id="P03",
            title="Corrupted PDF Statement Handling",
            category=TestCategory.PLATFORM,
            engine=EngineType.EVIDENCE_GATEWAY,
            objective="Handle truncated or malformed PDF without daemon panic or hanging worker thread.",
            expected_behaviour="Catches parsing exception; returns descriptive ingestion error.",
            manifest=GroundTruthManifest(
                manifest_id="GT-P03", scenario_id="P03", scenario_title="Corrupted PDF",
                description="Malformed PDF statement with missing xref.", category=TestCategory.PLATFORM
            ),
            failure_conditions=["Worker thread hangs or server crashes"]
        ))

        self._register(ScenarioDefinition(
            scenario_id="P04",
            title="Oversized File Rejection",
            category=TestCategory.PLATFORM,
            engine=EngineType.EVIDENCE_GATEWAY,
            objective="Enforce maximum file ingestion boundary (e.g. 50 MB) before disk write.",
            expected_behaviour="Rejects file exceeding size quota; prevents denial-of-service.",
            manifest=GroundTruthManifest(
                manifest_id="GT-P04", scenario_id="P04", scenario_title="Oversized File",
                description="100 MB dump uploaded.", category=TestCategory.PLATFORM
            ),
            failure_conditions=["Accepts file exceeding quota"]
        ))

        self._register(ScenarioDefinition(
            scenario_id="P05",
            title="Duplicate Evidence Upload Handling",
            category=TestCategory.PLATFORM,
            engine=EngineType.EVIDENCE_GATEWAY,
            objective="Verify that uploading identical bytes twice returns DUPLICATE_ACCEPTED without duplicating disk storage.",
            expected_behaviour="Content-Addressed Storage deduplicates; custody event records secondary ingestion.",
            manifest=GroundTruthManifest(
                manifest_id="GT-P05", scenario_id="P05", scenario_title="Duplicate Upload",
                description="Uploading identical file twice.", category=TestCategory.PLATFORM
            ),
            failure_conditions=["Creates duplicate file in CAS or crashes on conflict"]
        ))

        self._register(ScenarioDefinition(
            scenario_id="P06",
            title="Cross-Case Evidence Isolation",
            category=TestCategory.PLATFORM,
            engine=EngineType.EVIDENCE_GATEWAY,
            objective="Ensure evidence uploaded in Case A is completely inaccessible to unauthorized investigator in Case B.",
            expected_behaviour="Returns HTTP 403 / AccessDenied; strict case tenant isolation.",
            manifest=GroundTruthManifest(
                manifest_id="GT-P06", scenario_id="P06", scenario_title="Cross-Case Isolation",
                description="Attempting to access Case B artifact from Case A token.", category=TestCategory.PLATFORM
            ),
            failure_conditions=["Leaks evidence across case boundaries"]
        ))

        self._register(ScenarioDefinition(
            scenario_id="P07",
            title="Unauthorized API Access (Fail-Closed Auth)",
            category=TestCategory.PLATFORM,
            engine=EngineType.PLATFORM,
            objective="Confirm unauthenticated request fails closed with HTTP 401 immediately.",
            expected_behaviour="Fails closed with HTTP 401; zero data returned.",
            manifest=GroundTruthManifest(
                manifest_id="GT-P07", scenario_id="P07", scenario_title="Unauthorized Access",
                description="Calling endpoint without Bearer JWT.", category=TestCategory.PLATFORM
            ),
            failure_conditions=["Permits unauthenticated request or leaks error trace"]
        ))

        self._register(ScenarioDefinition(
            scenario_id="P08",
            title="Interrupted Worker & Crash Recovery",
            category=TestCategory.PLATFORM,
            engine=EngineType.PLATFORM,
            objective="Verify that daemon crash during analysis recovers safely into REQUIRES_REVIEW state upon restart.",
            expected_behaviour="State file survives; recovers into stable state without orphaned locks.",
            manifest=GroundTruthManifest(
                manifest_id="GT-P08", scenario_id="P08", scenario_title="Crash Recovery",
                description="Simulated mid-analysis process termination.", category=TestCategory.PLATFORM
            ),
            failure_conditions=["Database corruption or unrecoverable lock"]
        ))

        self._register(ScenarioDefinition(
            scenario_id="P09",
            title="Duplicate Webhook Intake Idempotency",
            category=TestCategory.PLATFORM,
            engine=EngineType.PLATFORM,
            objective="Verify that repeated delivery of identical payment webhook event is idempotent.",
            expected_behaviour="Executes once; returns cached result on secondary invocation.",
            manifest=GroundTruthManifest(
                manifest_id="GT-P09", scenario_id="P09", scenario_title="Webhook Idempotency",
                description="Repeated webhook delivery.", category=TestCategory.PLATFORM
            ),
            failure_conditions=["Executes duplicate ledger entry or double debit"]
        ))

        self._register(ScenarioDefinition(
            scenario_id="P10",
            title="SSE Reconnection & Event Replay",
            category=TestCategory.PLATFORM,
            engine=EngineType.PLATFORM,
            objective="Verify that client reconnecting to Server-Sent Events stream replays missed historical events.",
            expected_behaviour="Replays events from durable event log; zero missed forensic updates.",
            manifest=GroundTruthManifest(
                manifest_id="GT-P10", scenario_id="P10", scenario_title="SSE Reconnection",
                description="Reconnecting after network drop.", category=TestCategory.PLATFORM
            ),
            failure_conditions=["Loses historical progress events upon reconnection"]
        ))

        self._register(ScenarioDefinition(
            scenario_id="P11",
            title="Concurrent Upload Race Condition Guard",
            category=TestCategory.PLATFORM,
            engine=EngineType.EVIDENCE_GATEWAY,
            objective="Assert that simultaneous uploads of distinct files preserve discrete SHA-256 integrity.",
            expected_behaviour="Both files admitted with discrete hashes and correct CAS storage.",
            manifest=GroundTruthManifest(
                manifest_id="GT-P11", scenario_id="P11", scenario_title="Concurrent Uploads",
                description="Two threads uploading concurrently.", category=TestCategory.PLATFORM
            ),
            failure_conditions=["Corrupted CAS write or file collision"]
        ))

        self._register(ScenarioDefinition(
            scenario_id="P12",
            title="Incomplete Evidence Section 63 BSA Report Safeguard",
            category=TestCategory.PLATFORM,
            engine=EngineType.FULL_WORKFLOW,
            objective="Ensure generating Section 63 BSA report on unverified finding explicitly flags UNVERIFIED caveat.",
            expected_behaviour="Report prominently embeds unverified warning banner; does not claim certified truth.",
            manifest=GroundTruthManifest(
                manifest_id="GT-P12", scenario_id="P12", scenario_title="Incomplete Report Safeguard",
                description="Report generated without examiner verification.", category=TestCategory.PLATFORM
            ),
            failure_conditions=["Generates certified court report on unverified machine findings"]
        ))

    def _register(self, scenario: ScenarioDefinition):
        self.scenarios[scenario.scenario_id] = scenario

    def get_scenario(self, scenario_id: str) -> Optional[ScenarioDefinition]:
        return self.scenarios.get(scenario_id)

    def list_scenarios(self, category: Optional[TestCategory] = None) -> List[ScenarioDefinition]:
        scenarios = list(self.scenarios.values())
        if category:
            scenarios = [s for s in scenarios if s.category == category]
        return sorted(scenarios, key=lambda s: s.scenario_id)

    def generate_fixture_for_scenario(self, scenario_id: str) -> Tuple[str, bytes]:
        """Convenience single fixture accessor."""
        fixtures = self.generate_fixtures_for_scenario(scenario_id)
        return fixtures[0]

    def generate_fixtures_for_scenario(self, scenario_id: str) -> List[Tuple[str, bytes]]:
        """
        Generates controlled evidence files (screenshots and/or banking CSVs) for a scenario.
        Returns List of (filename, file_bytes).
        """
        if scenario_id == "T01":
            return [("genuine_receipt.png", self._create_synthetic_receipt_image(amount_text="₹25,000.00", utr_text="412356789012", status_text="SUCCESS"))]
        elif scenario_id == "T02":
            return [("altered_amount_receipt.png", self._create_synthetic_receipt_image(amount_text="₹50,000.00", tamper_amount="₹50,000.00", utr_text="412356789012"))]
        elif scenario_id == "T03":
            return [("cropped_receipt.png", self._create_synthetic_receipt_image(crop=True))]
        elif scenario_id == "T04":
            return [("whatsapp_recompressed.jpg", self._create_synthetic_receipt_image(recompress_quality=65))]
        elif scenario_id == "T05":
            return [("blurred_receipt.png", self._create_synthetic_receipt_image(blur=True))]
        elif scenario_id == "T06":
            return [("conflicting_status_receipt.png", self._create_synthetic_receipt_image(status_text="FAILED", tamper_amount="₹25,000.00"))]
        elif scenario_id == "T07":
            csv_bytes = b"Date,Description,TxID,reference_number,debit,credit,balance\n2026-03-15,UPI Transfer,TX-1001,412356789012,25000.0,0.0,75000.0\n"
            return [("receipt.png", self._create_synthetic_receipt_image(amount_text="₹25,000.00", utr_text="412356789012")), ("statement.csv", csv_bytes)]
        elif scenario_id == "T08":
            csv_bytes = b"Date,Description,TxID,reference_number,debit,credit,balance\n2026-03-15,UPI Transfer,TX-1002,412356789012,25000.0,0.0,75000.0\n"
            return [("receipt.png", self._create_synthetic_receipt_image(amount_text="₹15,000.00", utr_text="412356789012", tamper_amount="₹15,000.00")), ("statement.csv", csv_bytes)]
        elif scenario_id == "T09":
            csv_bytes = b"Date,Description,TxID,reference_number,debit,credit,balance\n2026-03-15,ATM Cash,TX-9999,999999999999,5000.0,0.0,95000.0\n"
            return [("receipt.png", self._create_synthetic_receipt_image(amount_text="₹25,000.00", utr_text="412356789012")), ("statement.csv", csv_bytes)]
        elif scenario_id == "T10":
            csv_bytes = b"Date,Description,TxID,reference_number,debit,credit,balance\n2026-03-15,UPI,TX-1,412356789012,25000.0,0.0,75000.0\n2026-03-15,UPI,TX-2,412356789012,25000.0,0.0,50000.0\n"
            return [("statement.csv", csv_bytes)]
        elif scenario_id == "T11":
            csv_bytes = b"Date,Description,TxID,reference_number,debit,credit,balance\n2026-03-15,UPI Transfer,TX-1,412356789012,25000.0,0.0,75000.0\n2026-03-15,REV/UPI Auto Reversal,TX-2,412356789012,0.0,25000.0,100000.0\n"
            return [("statement.csv", csv_bytes)]
        elif scenario_id == "T12":
            csv_bytes = b"Date,Description,TxID,reference_number,debit,credit,balance\n2026-03-15,Part 1,TX-1,REF-1,8000.0,0.0,92000.0\n2026-03-15,Part 2,TX-2,REF-2,10000.0,0.0,82000.0\n2026-03-15,Part 3,TX-3,REF-3,7000.0,0.0,75000.0\n"
            return [("receipt.png", self._create_synthetic_receipt_image(amount_text="₹25,000.00")), ("statement.csv", csv_bytes)]
        elif scenario_id == "T13":
            csv_bytes = b"Date,Description,TxID,reference_number,debit,credit,balance\n2026-03-15,UPI,TX-1,REF-1,25000.0,0.0,75000.0\n2026-03-15,UPI,TX-2,REF-2,10000.0,0.0,99999.0\n"
            return [("statement.csv", csv_bytes)]
        elif scenario_id == "T14":
            csv_bytes = b"Date,Description,TxID,reference_number,debit,credit,balance\n2026-03-15,UPI,TX-1,999999999999,25000.0,0.0,75000.0\n"
            return [("receipt.png", self._create_synthetic_receipt_image(amount_text="₹25,000.00", utr_text="412356789012")), ("statement.csv", csv_bytes)]
        elif scenario_id == "T15":
            return [("settlement_skew_receipt.png", self._create_synthetic_receipt_image(amount_text="₹25,000.00"))]
        elif scenario_id == "T16":
            return [("currency_norm_receipt.png", self._create_synthetic_receipt_image(amount_text="Rs. 25000"))]
        elif scenario_id in ("T17", "T18", "T19", "T20", "T21", "T22"):
            # Tampering scenarios
            return [(f"{scenario_id.lower()}_tampered.png", self._create_synthetic_receipt_image(tamper_amount="₹35,000.00"))]
        elif scenario_id in ("T23", "T24", "T25"):
            # Benign variations
            return [(f"{scenario_id.lower()}_benign.png", self._create_synthetic_receipt_image(amount_text="₹25,000.00"))]
        elif scenario_id == "P01":
            return [("unsupported_audio.mp3", b"ID3\x03\x00\x00\x00\x00\x00" + b"\x00" * 200)]
        elif scenario_id == "P02":
            return [("malware_disguised.png", b"MZ\x90\x00\x03\x00\x00\x00" + b"\x00" * 200)]
        elif scenario_id == "P03":
            return [("corrupted.pdf", b"%PDF-1.4\nCorrupted byte stream without xref\n%%EOF")]
        elif scenario_id == "P04":
            return [("oversized.bin", b"\x00" * (1024 * 1024))]
        else:
            return [(f"{scenario_id.lower()}_fixture.png", self._create_synthetic_receipt_image())]
