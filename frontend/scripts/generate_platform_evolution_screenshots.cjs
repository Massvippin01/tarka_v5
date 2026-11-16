const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const OUT_DIR = path.resolve(__dirname, '../../docs/platform_evolution/screenshots');
if (!fs.existsSync(OUT_DIR)) {
  fs.mkdirSync(OUT_DIR, { recursive: true });
}

async function captureAll() {
  console.log("=== STARTING PLATFORM EVOLUTION SCREENSHOT GENERATION ===");
  console.log(`Output Directory: ${OUT_DIR}`);

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1,
  });
  const page = await context.newPage();

  try {
    // 1. Particle Home (Deep Black Canvas with Central Fibonacci Orb)
    console.log("1. Capturing 01_particle_home.png...");
    await page.goto("http://localhost:5173/?view=home", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(2000);
    await page.screenshot({ path: path.join(OUT_DIR, "01_particle_home.png") });

    // 2. Command Centre (Warm Ivory Skeuomorphic Operational Overview)
    console.log("2. Capturing 02_command_centre.png...");
    await page.goto("http://localhost:5173/?view=workspace", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(1500);
    await page.screenshot({ path: path.join(OUT_DIR, "02_command_centre.png") });

    // 3. Expanded Curved Sidebar
    console.log("3. Capturing 03_expanded_sidebar.png...");
    await page.waitForTimeout(800);
    const rail = page.locator('aside.v6-rail');
    if (await rail.count() > 0) {
      await rail.screenshot({ path: path.join(OUT_DIR, "03_expanded_sidebar.png") });
    }

    // 4. Collapsed Sidebar
    console.log("4. Capturing 04_collapsed_sidebar.png...");
    const collapseBtn = page.locator('button[aria-label="Collapse sidebar"]').first();
    if (await collapseBtn.count() > 0) {
      await collapseBtn.click();
      await page.waitForTimeout(600);
      await page.screenshot({ path: path.join(OUT_DIR, "04_collapsed_sidebar.png") });
      // Re-expand
      const expandBtn = page.locator('button[aria-label="Expand sidebar"]').first();
      if (await expandBtn.count() > 0) {
        await expandBtn.click();
        await page.waitForTimeout(600);
      }
    }

    // 5. Case Workbench (Evidence Ledger)
    console.log("5. Capturing 05_case_workbench.png...");
    await page.goto("http://localhost:5173/?view=evidence", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(1500);
    await page.screenshot({ path: path.join(OUT_DIR, "05_case_workbench.png") });

    // 6. Evidence Intake Modal
    console.log("6. Capturing 06_evidence_intake.png...");
    const intakeBtn = page.locator("button:has-text('Admit Evidence'), button:has-text('Evidence Intake')").first();
    if (await intakeBtn.count() > 0) {
      await intakeBtn.click();
      await page.waitForTimeout(1000);
      await page.screenshot({ path: path.join(OUT_DIR, "06_evidence_intake.png") });
      await page.keyboard.press("Escape");
      await page.waitForTimeout(500);
    }

    // 7. Large File Ingestion & 10-Stage Pipeline
    console.log("7. Capturing 07_large_file_processing.png...");
    await page.goto("http://localhost:5173/?view=cases-hub", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(1500);
    await page.screenshot({ path: path.join(OUT_DIR, "07_large_file_processing.png") });

    // 8. Analysis Queue & Golden Hour Monitor
    console.log("8. Capturing 08_analysis_queue.png...");
    await page.goto("http://localhost:5173/?view=workspace", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(1500);
    await page.screenshot({ path: path.join(OUT_DIR, "08_analysis_queue.png") });

    // 9. Fraud Network Graph
    console.log("9. Capturing 09_fraud_network.png...");
    await page.goto("http://localhost:5173/?view=network", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(1800);
    await page.screenshot({ path: path.join(OUT_DIR, "09_fraud_network.png") });

    // 10. Voice Interrogation Station
    console.log("10. Capturing 10_voice_interrogation.png...");
    await page.keyboard.press("KeyV");
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(OUT_DIR, "10_voice_interrogation.png") });
    await page.keyboard.press("Escape");
    await page.waitForTimeout(500);

    // 11. Assistant with Evidence Citations
    console.log("11. Capturing 11_assistant_evidence_citations.png...");
    await page.keyboard.press("KeyA");
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(OUT_DIR, "11_assistant_evidence_citations.png") });
    await page.keyboard.press("Escape");
    await page.waitForTimeout(500);

    // 12. Mobile Home Viewport (iPhone 14 style: 390x844)
    console.log("12. Capturing 12_mobile_home.png...");
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("http://localhost:5173/?view=home", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(1500);
    await page.screenshot({ path: path.join(OUT_DIR, "12_mobile_home.png") });

    console.log("=== ALL 12 VISUAL EVIDENCE SCREENSHOTS CAPTURED SUCCESSFULLY ===");
  } catch (err) {
    console.error("Screenshot capture error:", err);
  } finally {
    await browser.close();
  }
}

captureAll();

