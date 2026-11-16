const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const OUT_DIR = path.resolve(__dirname, '../../docs/mentor_briefing/screenshots');
if (!fs.existsSync(OUT_DIR)) {
  fs.mkdirSync(OUT_DIR, { recursive: true });
}

async function captureAll() {
  console.log("=== STARTING FULL MENTOR BRIEFING SCREENSHOT GENERATION ===");
  console.log(`Output Directory: ${OUT_DIR}`);

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1,
  });
  const page = await context.newPage();

  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      console.log(`[Browser ${msg.type()}]:`, msg.text());
    }
  });

  try {
    // 1. Full Workspaces Overview
    console.log("1. Capturing 01_workspaces_overview.png...");
    await page.goto("http://localhost:5173/?case=CASE-2026-001", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(2000);
    // Click Workspaces button if not active
    const workspacesBtn = page.locator("button:has-text('Command Hub'), button:has-text('Workspaces')").first();
    if (await workspacesBtn.count() > 0) {
      await workspacesBtn.click();
      await page.waitForTimeout(800);
    }
    await page.screenshot({ path: path.join(OUT_DIR, "01_workspaces_overview.png") });

    // 2. Full Case Workbench Overview (Forensic Workstation)
    console.log("2. Capturing 02_case_workbench_overview.png...");
    await page.keyboard.press("Alt+Digit8");
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(OUT_DIR, "02_case_workbench_overview.png") });

    // 3. SBI Ledger Panel (Intake Screen)
    console.log("3. Capturing 03_case_ledger.png...");
    await page.keyboard.press("Alt+Digit1");
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(OUT_DIR, "03_case_ledger.png") });

    // 4. RRN Analysis Panel
    console.log("4. Capturing 04_rrn_analysis.png...");
    // Click on RRN tab in InspectorDock if present
    const rrnTab = page.locator("button:has-text('RRN'), button:has-text('NPCI')").first();
    if (await rrnTab.count() > 0) {
      await rrnTab.click();
      await page.waitForTimeout(600);
    }
    await page.screenshot({ path: path.join(OUT_DIR, "04_rrn_analysis.png") });

    // 5. Temporal Analysis / Loom (Forensic Workstation tab 1)
    console.log("5. Capturing 05_temporal_analysis.png & 09_temporal_evidence_loom.png...");
    await page.keyboard.press("Alt+Digit8");
    await page.waitForTimeout(800);
    const loomTab = page.locator("button:has-text('Temporal Evidence Loom')").first();
    if (await loomTab.count() > 0) {
      await loomTab.click();
      await page.waitForTimeout(600);
    }
    await page.screenshot({ path: path.join(OUT_DIR, "05_temporal_analysis.png") });
    await page.screenshot({ path: path.join(OUT_DIR, "09_temporal_evidence_loom.png") });

    // 6. Evidence Intake Modal
    console.log("6. Capturing 06_evidence_intake.png...");
    await page.keyboard.press("Alt+Digit0");
    await page.waitForTimeout(800);
    const uploadBtn = page.locator("button:has-text('Evidence Intake'), button:has-text('Upload Evidence')").first();
    if (await uploadBtn.count() > 0) {
      await uploadBtn.click();
      await page.waitForTimeout(800);
      await page.screenshot({ path: path.join(OUT_DIR, "06_evidence_intake.png") });
      // Close modal by pressing Escape
      await page.keyboard.press("Escape");
      await page.waitForTimeout(500);
    }

    // 7. Claim Inspector & 8. Claim Dependency Lens (Forensic Workstation tab 2)
    console.log("7. Capturing 07_claim_inspector.png & 08_claim_dependency_lens.png...");
    await page.keyboard.press("Alt+Digit8");
    await page.waitForTimeout(800);
    const lensTab = page.locator("button:has-text('Claim Dependency Lens')").first();
    if (await lensTab.count() > 0) {
      await lensTab.click();
      await page.waitForTimeout(600);
    }
    await page.screenshot({ path: path.join(OUT_DIR, "07_claim_inspector.png") });
    await page.screenshot({ path: path.join(OUT_DIR, "08_claim_dependency_lens.png") });

    // 10. Investigation Flight Recorder (Forensic Workstation tab 3)
    console.log("10. Capturing 10_investigation_flight_recorder.png...");
    const recorderTab = page.locator("button:has-text('Investigation Flight Recorder')").first();
    if (await recorderTab.count() > 0) {
      await recorderTab.click();
      await page.waitForTimeout(600);
    }
    await page.screenshot({ path: path.join(OUT_DIR, "10_investigation_flight_recorder.png") });

    // 11. Fraud Network Screen
    console.log("11. Capturing 11_fraud_network.png...");
    await page.keyboard.press("Alt+Digit4");
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(OUT_DIR, "11_fraud_network.png") });

    // 12. Provenance DAG (Forensic Workstation tab 4)
    console.log("12. Capturing 12_provenance_dag.png...");
    await page.keyboard.press("Alt+Digit8");
    await page.waitForTimeout(800);
    const dagTab = page.locator("button:has-text('Provenance DAG Lineage')").first();
    if (await dagTab.count() > 0) {
      await dagTab.click();
      await page.waitForTimeout(600);
    }
    await page.screenshot({ path: path.join(OUT_DIR, "12_provenance_dag.png") });

    // 13. Benchmark Lab Overview
    console.log("13. Capturing 13_benchmark_lab.png...");
    await page.keyboard.press("Alt+KeyB");
    await page.waitForTimeout(1200);
    await page.screenshot({ path: path.join(OUT_DIR, "13_benchmark_lab.png") });

    // 14. Confusion Matrix & 15. Engine Diagnostics & 16. Fraud Clusters
    console.log("14. Capturing 14_confusion_matrix.png...");
    // Run self-test or inspect matrix
    const selfTestBtn = page.locator("button:has-text('Six-Engine Self-Test'), button:has-text('Self-Test')").first();
    if (await selfTestBtn.count() > 0) {
      await selfTestBtn.click();
      await page.waitForTimeout(1500);
    }
    await page.screenshot({ path: path.join(OUT_DIR, "14_confusion_matrix.png") });

    console.log("15. Capturing 15_engine_diagnostics.png...");
    await page.evaluate(() => window.scrollBy(0, 400));
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(OUT_DIR, "15_engine_diagnostics.png") });

    console.log("16. Capturing 16_fraud_clusters.png...");
    await page.evaluate(() => window.scrollBy(0, 500));
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(OUT_DIR, "16_fraud_clusters.png") });

    // 17. Entity Resolution Screen (Alt+2)
    console.log("17. Capturing 17_entity_resolution.png...");
    await page.keyboard.press("Alt+Digit2");
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(OUT_DIR, "17_entity_resolution.png") });

    // 18. Attribution Screen (Alt+3)
    console.log("18. Capturing 18_attribution_cgnat.png...");
    await page.keyboard.press("Alt+Digit3");
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(OUT_DIR, "18_attribution_cgnat.png") });

    // 19. Taint Engine Screen (Alt+5)
    console.log("19. Capturing 19_taint_engine.png...");
    await page.keyboard.press("Alt+Digit5");
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(OUT_DIR, "19_taint_engine.png") });

    // 20. Court Proof Screen (Alt+6)
    console.log("20. Capturing 20_court_proof_bsa63.png...");
    await page.keyboard.press("Alt+Digit6");
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(OUT_DIR, "20_court_proof_bsa63.png") });

    // 21. Privacy & Crypto Screen (Alt+7)
    console.log("21. Capturing 21_privacy_crypto.png...");
    await page.keyboard.press("Alt+Digit7");
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(OUT_DIR, "21_privacy_crypto.png") });

    // 22. New Case Modal
    console.log("22. Capturing 22_new_case_modal.png...");
    await page.keyboard.press("Alt+Digit0");
    await page.waitForTimeout(800);
    const newCaseBtn = page.locator("button:has-text('New Case'), button:has-text('Create Case')").first();
    if (await newCaseBtn.count() > 0) {
      await newCaseBtn.click();
      await page.waitForTimeout(800);
      await page.screenshot({ path: path.join(OUT_DIR, "22_new_case_modal.png") });
      await page.keyboard.press("Escape");
      await page.waitForTimeout(500);
    }

    // 23. Intelligence Brief Popover/Drawer
    console.log("23. Capturing 23_intelligence_brief.png...");
    const intelBriefBtn = page.locator("button:has-text('Intelligence Brief'), button:has-text('7-Q Brief')").first();
    if (await intelBriefBtn.count() > 0) {
      await intelBriefBtn.click();
      await page.waitForTimeout(800);
      await page.screenshot({ path: path.join(OUT_DIR, "23_intelligence_brief.png") });
      await page.keyboard.press("Escape");
      await page.waitForTimeout(500);
    }

    // 24. Audit Log Drawer
    console.log("24. Capturing 24_audit_log_drawer.png...");
    const auditBtn = page.locator("button:has-text('Audit Log'), button:has-text('Receipts')").first();
    if (await auditBtn.count() > 0) {
      await auditBtn.click();
      await page.waitForTimeout(800);
      await page.screenshot({ path: path.join(OUT_DIR, "24_audit_log_drawer.png") });
      await page.keyboard.press("Escape");
      await page.waitForTimeout(500);
    }

    // Responsive Viewports
    console.log("25. Capturing 25_responsive_mobile_390.png (390x844)...");
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("http://localhost:5173/?case=CASE-2026-001", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(OUT_DIR, "25_responsive_mobile_390.png") });

    console.log("26. Capturing 26_responsive_tablet_768.png (768x1024)...");
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.waitForTimeout(800);
    await page.screenshot({ path: path.join(OUT_DIR, "26_responsive_tablet_768.png") });

    console.log("27. Capturing 27_responsive_laptop_1366.png (1366x768)...");
    await page.setViewportSize({ width: 1366, height: 768 });
    await page.waitForTimeout(800);
    await page.screenshot({ path: path.join(OUT_DIR, "27_responsive_laptop_1366.png") });

    console.log("=== ALL SCREENSHOTS CAPTURED SUCCESSFULLY ===");
  } catch (err) {
    console.error("[Screenshot Generator Error]:", err);
  } finally {
    await browser.close();
  }
}

captureAll();

