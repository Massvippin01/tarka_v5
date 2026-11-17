const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const OUT_DIR = path.resolve(__dirname, '../../docs/judge_handbook/screenshots');
if (!fs.existsSync(OUT_DIR)) {
  fs.mkdirSync(OUT_DIR, { recursive: true });
}

async function captureAll() {
  console.log("=== STARTING JUDGE DEMONSTRATION HANDBOOK SCREENSHOT CAPTURE ===");
  console.log(`Output Directory: ${OUT_DIR}`);

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1,
  });
  const page = await context.newPage();

  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      console.log(`[Browser Error]:`, msg.text());
    }
  });

  const baseUrl = "http://localhost:5173";

  // Helper to click locator if exists
  async function safeClick(selector, timeout = 1000) {
    try {
      const loc = page.locator(selector).first();
      if (await loc.count() > 0) {
        await loc.click({ timeout });
        return true;
      }
    } catch (e) {
      // ignore
    }
    return false;
  }

  // 01. TARKA Particle Intelligence Home
  console.log("01. Capturing 01_particle_home.png...");
  await page.goto(`${baseUrl}/?view=home`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2000);
  await page.screenshot({ path: path.join(OUT_DIR, "01_particle_home.png") });

  // 02. Voice Interrogation / Assistant
  console.log("02. Capturing 02_voice_interrogation.png...");
  await page.goto(`${baseUrl}/?view=workspace`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1500);
  // Open voice modal via shortcut 'v' or button
  const voiceClicked = await safeClick('button[title*="Voice"], button[aria-label*="Voice"]');
  if (!voiceClicked) {
    await page.keyboard.press("KeyV");
  }
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(OUT_DIR, "02_voice_interrogation.png") });
  await page.keyboard.press("Escape");
  await page.waitForTimeout(500);

  // 03. Command Centre / Dashboard
  console.log("03. Capturing 03_command_centre.png...");
  await page.goto(`${baseUrl}/?view=workspace`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: path.join(OUT_DIR, "03_command_centre.png") });

  // 04. Investigations / Workspaces
  console.log("04. Capturing 04_investigations_workspaces.png...");
  await page.goto(`${baseUrl}/?view=cases`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: path.join(OUT_DIR, "04_investigations_workspaces.png") });

  // 05. Case Workspace
  console.log("05. Capturing 05_case_workspace.png...");
  await page.goto(`${baseUrl}/?view=workstation`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: path.join(OUT_DIR, "05_case_workspace.png") });

  // 06. Case Overview
  console.log("06. Capturing 06_case_overview.png...");
  await page.goto(`${baseUrl}/?view=workspace`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1200);
  await page.screenshot({ path: path.join(OUT_DIR, "06_case_overview.png") });

  // 07. Evidence Intake
  console.log("07. Capturing 07_evidence_intake.png...");
  await page.goto(`${baseUrl}/?view=evidence`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1200);
  await safeClick("button:has-text('Evidence Intake'), button:has-text('Upload Evidence'), button:has-text('Massive Intake')");
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(OUT_DIR, "07_evidence_intake.png") });
  await page.keyboard.press("Escape");
  await page.waitForTimeout(500);

  // 08. Evidence Locker
  console.log("08. Capturing 08_evidence_locker.png...");
  await page.goto(`${baseUrl}/?view=evidence`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: path.join(OUT_DIR, "08_evidence_locker.png") });

  // 09. Evidence Integrity / Cryptographic Verification
  console.log("09. Capturing 09_evidence_integrity.png...");
  await page.goto(`${baseUrl}/?view=court-proof`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: path.join(OUT_DIR, "09_evidence_integrity.png") });

  // 10. Five-File Evidentiary Join
  console.log("10. Capturing 10_five_file_evidentiary_join.png...");
  await page.goto(`${baseUrl}/?view=evidence`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1200);
  await safeClick("button:has-text('Join'), button:has-text('Reconciliation'), button:has-text('Ledger')");
  await page.waitForTimeout(800);
  await page.screenshot({ path: path.join(OUT_DIR, "10_five_file_evidentiary_join.png") });

  // 11. Financial Ledger
  console.log("11. Capturing 11_financial_ledger.png...");
  await page.goto(`${baseUrl}/?view=evidence`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1200);
  await page.evaluate(() => {
    const el = document.querySelector('[data-semantic-id="el-ledger-row-rrn-402918273645"]') || document.querySelector('tr');
    if (el) {
      el.setAttribute('data-semantic-highlight', 'warning');
      el.classList.add('tarka-semantic-highlight-warning');
    }
  });
  await page.waitForTimeout(600);
  await page.screenshot({ path: path.join(OUT_DIR, "11_financial_ledger.png") });

  // 12. Double-Entry Balance Conservation
  console.log("12. Capturing 12_double_entry_balance.png...");
  await page.evaluate(() => {
    const balanceCard = document.querySelector('[data-semantic-id="el-ledger-metric-conservation"]') || document.querySelector('.tarka-interactive-card');
    if (balanceCard) {
      balanceCard.setAttribute('data-semantic-highlight', 'neural');
      balanceCard.classList.add('tarka-semantic-highlight-neural');
    }
  });
  await page.waitForTimeout(600);
  await page.screenshot({ path: path.join(OUT_DIR, "12_double_entry_balance.png") });

  // 13. Financial Reconstruction (Money Trail)
  console.log("13. Capturing 13_financial_reconstruction.png...");
  await page.goto(`${baseUrl}/?view=money`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: path.join(OUT_DIR, "13_financial_reconstruction.png") });

  // 14. Temporal Evidence Loom
  console.log("14. Capturing 14_temporal_evidence_loom.png...");
  await page.goto(`${baseUrl}/?view=workstation`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1200);
  await safeClick("button:has-text('Temporal Evidence Loom'), button:has-text('Loom')");
  await page.waitForTimeout(800);
  await page.screenshot({ path: path.join(OUT_DIR, "14_temporal_evidence_loom.png") });

  // 15. Fraud Network Graph
  console.log("15. Capturing 15_fraud_network_graph.png...");
  await page.goto(`${baseUrl}/?view=network`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: path.join(OUT_DIR, "15_fraud_network_graph.png") });

  // 16. Entity Intelligence
  console.log("16. Capturing 16_entity_intelligence.png...");
  await page.goto(`${baseUrl}/?view=people`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: path.join(OUT_DIR, "16_entity_intelligence.png") });

  // 17. Claim Compiler
  console.log("17. Capturing 17_claim_compiler.png...");
  await page.goto(`${baseUrl}/?view=workstation`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1000);
  await safeClick("button:has-text('Claim Dependency Lens'), button:has-text('Lens')");
  await page.waitForTimeout(800);
  await page.screenshot({ path: path.join(OUT_DIR, "17_claim_compiler.png") });

  // 18. Claim Dependency Lens
  console.log("18. Capturing 18_claim_dependency_lens.png...");
  await page.screenshot({ path: path.join(OUT_DIR, "18_claim_dependency_lens.png") });

  // 19. Provenance DAG
  console.log("19. Capturing 19_provenance_dag.png...");
  await safeClick("button:has-text('Provenance DAG'), button:has-text('Provenance')");
  await page.waitForTimeout(800);
  await page.screenshot({ path: path.join(OUT_DIR, "19_provenance_dag.png") });

  // 20. Investigation Flight Recorder
  console.log("20. Capturing 20_investigation_flight_recorder.png...");
  await safeClick("button:has-text('Flight Recorder'), button:has-text('Recorder')");
  await page.waitForTimeout(800);
  await page.screenshot({ path: path.join(OUT_DIR, "20_investigation_flight_recorder.png") });

  // 21. Falsification Gate
  console.log("21. Capturing 21_falsification_gate.png...");
  await page.goto(`${baseUrl}/?view=device`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1200);
  await page.screenshot({ path: path.join(OUT_DIR, "21_falsification_gate.png") });

  // 22. Benchmark Lab
  console.log("22. Capturing 22_benchmark_lab.png...");
  await page.goto(`${baseUrl}/?view=benchmarks`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: path.join(OUT_DIR, "22_benchmark_lab.png") });

  // 23. Report Generation
  console.log("23. Capturing 23_report_generation.png...");
  await page.goto(`${baseUrl}/?view=report`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: path.join(OUT_DIR, "23_report_generation.png") });

  // 24. Audit Trail Drawer
  console.log("24. Capturing 24_audit_trail.png...");
  await page.goto(`${baseUrl}/?view=workspace`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1000);
  await safeClick('button[title*="Audit"], button[aria-label*="Audit"]');
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(OUT_DIR, "24_audit_trail.png") });
  await page.keyboard.press("Escape");
  await page.waitForTimeout(500);

  // 25. System Health / Settings
  console.log("25. Capturing 25_system_health.png...");
  await page.goto(`${baseUrl}/?view=health`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: path.join(OUT_DIR, "25_system_health.png") });

  // 26. Model and Voice Management
  console.log("26. Capturing 26_model_voice_settings.png...");
  await page.goto(`${baseUrl}/?view=settings`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: path.join(OUT_DIR, "26_model_voice_settings.png") });

  await browser.close();
  console.log("\n=== ALL 26 JUDGE DEMO SCREENSHOTS CAPTURED SUCCESSFULLY ===");
}

captureAll().catch((err) => {
  console.error("[FATAL ERROR]:", err);
  process.exit(1);
});
