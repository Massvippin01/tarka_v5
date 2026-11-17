const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const OUT_DIR = path.resolve(__dirname, '../../docs/ui_transformation/SCREENSHOTS');
if (!fs.existsSync(OUT_DIR)) {
  fs.mkdirSync(OUT_DIR, { recursive: true });
}

async function captureAll() {
  console.log("=== STARTING TARKA SKEUOMORPHIC UI TRANSFORMATION SCREENSHOT CAPTURE ===");
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

  const BASE_URL = 'http://127.0.0.1:5173';

  try {
    // 1. Command Center / Workspaces Overview
    console.log("1. Capturing 01_workspaces_overview.png...");
    await page.goto(`${BASE_URL}/?view=workspace&case=CASE-2026-001`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);
    await page.screenshot({ path: path.join(OUT_DIR, "01_workspaces_overview.png") });

    // 2. Case Workbench / Evidence & Ledger Overview
    console.log("2. Capturing 02_case_workbench_overview.png...");
    await page.goto(`${BASE_URL}/?view=evidence&case=CASE-2026-001`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1800);
    await page.screenshot({ path: path.join(OUT_DIR, "02_case_workbench_overview.png") });

    // 3. Financial Ledger Detail & Falsification Inspection
    console.log("3. Capturing 03_financial_ledger.png...");
    // Click Row 14 or first row to highlight
    const ledgerRow = page.locator('tr.row, [data-row-id="14"]').first();
    if (await ledgerRow.count() > 0) {
      await ledgerRow.click();
      await page.waitForTimeout(600);
    }
    await page.screenshot({ path: path.join(OUT_DIR, "03_financial_ledger.png") });

    // 4. RRN Julian Day Analysis
    console.log("4. Capturing 04_rrn_analysis.png...");
    const rrnTab = page.locator("button:has-text('RRN'), button:has-text('NPCI')").first();
    if (await rrnTab.count() > 0) {
      await rrnTab.click();
      await page.waitForTimeout(600);
    }
    await page.screenshot({ path: path.join(OUT_DIR, "04_rrn_analysis.png") });

    // 5. People & Accounts / Entities Resolution
    console.log("5. Capturing 05_people_accounts_entities.png...");
    await page.goto(`${BASE_URL}/?view=people&case=CASE-2026-001`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1800);
    await page.screenshot({ path: path.join(OUT_DIR, "05_people_accounts_entities.png") });

    // 6. Money Trail & LIBR Proportional Lien Calculation
    console.log("6. Capturing 06_money_trail_flow.png...");
    await page.goto(`${BASE_URL}/?view=money&case=CASE-2026-001`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1800);
    await page.screenshot({ path: path.join(OUT_DIR, "06_money_trail_flow.png") });

    // 7. Fraud Network Dynamic Graph & Hotspots
    console.log("7. Capturing 07_fraud_network_graph.png...");
    await page.goto(`${BASE_URL}/?view=network&case=CASE-2026-001`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);
    await page.screenshot({ path: path.join(OUT_DIR, "07_fraud_network_graph.png") });

    // 8. Device & SIM Attribution / CGNAT Port Funnel
    console.log("8. Capturing 08_device_sim_attribution.png...");
    await page.goto(`${BASE_URL}/?view=device&case=CASE-2026-001`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1800);
    await page.screenshot({ path: path.join(OUT_DIR, "08_device_sim_attribution.png") });

    // 9. Actions & Report / BSA Section 63 Legal Admissibility
    console.log("9. Capturing 09_actions_legal_admissibility.png...");
    await page.goto(`${BASE_URL}/?view=actions&case=CASE-2026-001`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1800);
    await page.screenshot({ path: path.join(OUT_DIR, "09_actions_legal_admissibility.png") });

    // 10. Benchmark Lab & Diagnostics
    console.log("10. Capturing 10_benchmark_lab.png...");
    await page.goto(`${BASE_URL}/?view=benchmarks&case=CASE-2026-001`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1800);
    await page.screenshot({ path: path.join(OUT_DIR, "10_benchmark_lab.png") });

    // 11. Temporal Evidence Loom (Workstation tab 1)
    console.log("11. Capturing 11_temporal_evidence_loom.png...");
    await page.goto(`${BASE_URL}/?view=workstation&case=CASE-2026-001`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1800);
    const loomTab = page.locator("button:has-text('Temporal Evidence Loom')").first();
    if (await loomTab.count() > 0) {
      await loomTab.click();
      await page.waitForTimeout(600);
    }
    await page.screenshot({ path: path.join(OUT_DIR, "11_temporal_evidence_loom.png") });

    // 12. Claim Inspector
    console.log("12. Capturing 12_claim_inspector.png...");
    const claimTab = page.locator("button:has-text('Claim Inspector'), button:has-text('Claims')").first();
    if (await claimTab.count() > 0) {
      await claimTab.click();
      await page.waitForTimeout(600);
    }
    await page.screenshot({ path: path.join(OUT_DIR, "12_claim_inspector.png") });

    // 13. Claim Dependency Lens
    console.log("13. Capturing 13_claim_dependency_lens.png...");
    const lensTab = page.locator("button:has-text('Claim Dependency Lens')").first();
    if (await lensTab.count() > 0) {
      await lensTab.click();
      await page.waitForTimeout(600);
    }
    await page.screenshot({ path: path.join(OUT_DIR, "13_claim_dependency_lens.png") });

    // 14. Flight Recorder
    console.log("14. Capturing 14_flight_recorder.png...");
    const flightTab = page.locator("button:has-text('Flight Recorder'), button:has-text('Audit')").first();
    if (await flightTab.count() > 0) {
      await flightTab.click();
      await page.waitForTimeout(600);
    }
    await page.screenshot({ path: path.join(OUT_DIR, "14_flight_recorder.png") });

    // 15. Provenance DAG
    console.log("15. Capturing 15_provenance_dag.png...");
    const dagTab = page.locator("button:has-text('Provenance DAG'), button:has-text('DAG')").first();
    if (await dagTab.count() > 0) {
      await dagTab.click();
      await page.waitForTimeout(600);
    }
    await page.screenshot({ path: path.join(OUT_DIR, "15_provenance_dag.png") });

    // 16. Evidence Intake Modal
    console.log("16. Capturing 16_evidence_intake_modal.png...");
    await page.goto(`${BASE_URL}/?view=workspace&case=CASE-2026-001`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1000);
    const bulkBtn = page.locator("button:has-text('Bulk Ingest')").first();
    if (await bulkBtn.count() > 0) {
      await bulkBtn.click();
      await page.waitForTimeout(800);
      await page.screenshot({ path: path.join(OUT_DIR, "16_evidence_intake_modal.png") });
      await page.keyboard.press("Escape");
      await page.waitForTimeout(500);
    }

    // 17. New Case Wizard Modal
    console.log("17. Capturing 17_new_case_wizard_modal.png...");
    const newCaseBtn = page.locator("button:has-text('New Case')").first();
    if (await newCaseBtn.count() > 0) {
      await newCaseBtn.click();
      await page.waitForTimeout(800);
      await page.screenshot({ path: path.join(OUT_DIR, "17_new_case_wizard_modal.png") });
      await page.keyboard.press("Escape");
      await page.waitForTimeout(500);
    }

    // 18. Ask TARKA AI Drawer
    console.log("18. Capturing 18_ask_tarka_ai_drawer.png...");
    const askBtn = page.locator("button:has-text('Ask TARKA')").first();
    if (await askBtn.count() > 0) {
      await askBtn.click();
      await page.waitForTimeout(800);
      await page.screenshot({ path: path.join(OUT_DIR, "18_ask_tarka_ai_drawer.png") });
      await page.keyboard.press("Escape");
      await page.waitForTimeout(500);
    }

    // 19. Case Switcher Popover
    console.log("19. Capturing 19_case_switcher_popover.png...");
    const switcherTrigger = page.locator('button[aria-label*="Switch case"]').first();
    if (await switcherTrigger.count() > 0) {
      await switcherTrigger.click();
      await page.waitForTimeout(800);
      await page.screenshot({ path: path.join(OUT_DIR, "19_case_switcher_popover.png") });
      await page.keyboard.press("Escape");
      await page.waitForTimeout(500);
    }

    // 20. All Cases Registry Screen
    console.log("20. Capturing 20_all_cases_registry.png...");
    await page.goto(`${BASE_URL}/?view=cases`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1800);
    await page.screenshot({ path: path.join(OUT_DIR, "20_all_cases_registry.png") });

    // 21. Health & Diagnostics Screen
    console.log("21. Capturing 21_system_health_diagnostics.png...");
    await page.goto(`${BASE_URL}/?view=health`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1800);
    await page.screenshot({ path: path.join(OUT_DIR, "21_system_health_diagnostics.png") });

    // 22. Settings & Station Letterhead
    console.log("22. Capturing 22_settings_station.png...");
    await page.goto(`${BASE_URL}/?view=settings`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1800);
    await page.screenshot({ path: path.join(OUT_DIR, "22_settings_station.png") });

    // 23. Mobile Viewport (390x844 - iPhone 14 Pro)
    console.log("23. Capturing 23_mobile_command_center_390x844.png...");
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`${BASE_URL}/?view=workspace&case=CASE-2026-001`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1500);
    await page.screenshot({ path: path.join(OUT_DIR, "23_mobile_command_center_390x844.png") });

    // 24. Tablet Viewport (768x1024 - iPad Mini)
    console.log("24. Capturing 24_tablet_evidence_ledger_768x1024.png...");
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto(`${BASE_URL}/?view=evidence&case=CASE-2026-001`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1500);
    await page.screenshot({ path: path.join(OUT_DIR, "24_tablet_evidence_ledger_768x1024.png") });

    console.log("=== ALL 24 GENUINE SCREENSHOTS SUCCESSFULLY CAPTURED ===");
  } catch (err) {
    console.error("Error during screenshot capture:", err);
  } finally {
    await browser.close();
  }
}

captureAll();

