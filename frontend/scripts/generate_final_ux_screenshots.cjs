const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const OUT_DIR = path.resolve(__dirname, '../../docs/final_ux/screenshots');
if (!fs.existsSync(OUT_DIR)) {
  fs.mkdirSync(OUT_DIR, { recursive: true });
}

const VIEWPORTS = [
  { name: '1920x1080_desktop', width: 1920, height: 1080 },
  { name: '1440x900_laptop', width: 1440, height: 900 },
  { name: '1366x768_standard', width: 1366, height: 768 },
  { name: '768x1024_tablet', width: 768, height: 1024 },
  { name: '390x844_mobile', width: 390, height: 844 },
  { name: '360x800_compact', width: 360, height: 800 },
];

async function captureFinalUX() {
  console.log("=== STARTING FINAL UX SCREENSHOT GENERATION ===");
  console.log(`Output Directory: ${OUT_DIR}`);

  const browser = await chromium.launch({ headless: true });

  for (const vp of VIEWPORTS) {
    console.log(`\n--- Capturing Viewport: ${vp.name} (${vp.width}x${vp.height}) ---`);
    const context = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
      deviceScaleFactor: 1,
    });
    const page = await context.newPage();

    // 1. Particle Home Screen (Pure Particle Intelligence, zero sidebar, zero navbar)
    console.log(`[${vp.name}] 01_particle_home...`);
    await page.goto("http://localhost:5173/?view=home", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(2000);
    await page.screenshot({ path: path.join(OUT_DIR, `${vp.name}_01_particle_home.png`) });

    // 2. Command Centre Workspace
    console.log(`[${vp.name}] 02_workspace_command_centre...`);
    await page.goto("http://localhost:5173/?view=workspace", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(1500);
    await page.screenshot({ path: path.join(OUT_DIR, `${vp.name}_02_workspace_command_centre.png`) });

    // 3. Evidence Ledger with Semantic Highlight
    console.log(`[${vp.name}] 03_evidence_ledger_highlight...`);
    await page.goto("http://localhost:5173/?view=evidence", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(1200);
    // Apply semantic highlight to RRN row
    await page.evaluate(() => {
      const el = document.querySelector('[data-semantic-id="el-ledger-row-rrn-402918273645"]') || document.querySelector('tr');
      if (el) {
        el.setAttribute('data-semantic-highlight', 'warning');
        el.classList.add('tarka-semantic-highlight-warning', 'tarka-semantic-pulse');
      }
    });
    await page.waitForTimeout(600);
    await page.screenshot({ path: path.join(OUT_DIR, `${vp.name}_03_evidence_ledger_highlight.png`) });

    // 4. Fraud Network with Mule Hub Semantic Highlight
    console.log(`[${vp.name}] 04_fraud_network_hub_highlight...`);
    await page.goto("http://localhost:5173/?view=graph", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(1500);
    await page.evaluate(() => {
      const el = document.querySelector('[data-semantic-id="el-graph-node-mule-1"]') || document.querySelector('.tarka-interactive-card');
      if (el) {
        el.setAttribute('data-semantic-highlight', 'error');
        el.classList.add('tarka-semantic-highlight-error', 'tarka-semantic-pulse');
      }
    });
    await page.waitForTimeout(600);
    await page.screenshot({ path: path.join(OUT_DIR, `${vp.name}_04_fraud_network_hub_highlight.png`) });

    // 5. Device & SIM Telemetry with CGNAT Funnel Highlight
    console.log(`[${vp.name}] 05_device_sim_cgnat_highlight...`);
    await page.goto("http://localhost:5173/?view=device-telemetry", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(1200);
    await page.evaluate(() => {
      const el = document.querySelector('[data-semantic-id="el-device-cgnat-funnel"]') || document.querySelector('.tarka-interactive-card');
      if (el) {
        el.setAttribute('data-semantic-highlight', 'neural');
        el.classList.add('tarka-semantic-highlight-neural', 'tarka-semantic-pulse');
      }
    });
    await page.waitForTimeout(600);
    await page.screenshot({ path: path.join(OUT_DIR, `${vp.name}_05_device_sim_cgnat_highlight.png`) });

    // 6. Contextual Guide Modal Opened
    console.log(`[${vp.name}] 06_contextual_guide_modal...`);
    await page.evaluate(() => {
      const guideBtn = document.querySelector('button[title*="Forensic Guide"]') || document.querySelector('button[aria-label*="Guide"]');
      if (guideBtn && typeof guideBtn.click === 'function') guideBtn.click();
    });
    await page.keyboard.press('KeyG');
    await page.waitForTimeout(800);
    await page.screenshot({ path: path.join(OUT_DIR, `${vp.name}_06_contextual_guide_modal.png`) });

    // Close modal if open
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);

    // 7. Court Proof Certificate Screen
    console.log(`[${vp.name}] 07_court_proof_certificate...`);
    await page.goto("http://localhost:5173/?view=court-ready", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(1500);
    await page.screenshot({ path: path.join(OUT_DIR, `${vp.name}_07_court_proof_certificate.png`) });

    await context.close();
  }

  await browser.close();
  console.log("\n=== FINAL UX SCREENSHOT GENERATION COMPLETE ===");
}

captureFinalUX().catch((err) => {
  console.error("Screenshot capture failed:", err);
  process.exit(1);
});
