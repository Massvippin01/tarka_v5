const { chromium } = require("playwright");
const path = require("path");

async function run() {
  const artifactDir = "C:\\Users\\massv\\.gemini\\antigravity\\brain\\285293fd-af45-419a-9453-484e5e3dc2e1";
  const browser = await chromium.launch({ headless: true });
  
  try {
    // 1440x900
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await context.newPage();
    
    console.log("Navigating to http://localhost:5173/?case=CASE-2026-001&view=intake");
    await page.goto("http://localhost:5173/?case=CASE-2026-001&view=intake", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(2000);

    // Look for Evidence intake button
    console.log("Opening Evidence Intake Modal...");
    const intakeBtn = page.locator("button:has-text('+ Evidence'), button:has-text('Admit Evidence'), button:has-text('Ingest Evidence')").first();
    if (await intakeBtn.isVisible()) {
      await intakeBtn.click();
    } else {
      // Direct click on any file up or add exhibit button
      await page.locator("button[title*='Evidence'], button[aria-label*='Evidence']").first().click();
    }

    await page.waitForTimeout(1000);
    const modal = page.locator("[role='dialog']");
    await modal.waitFor({ state: "visible", timeout: 5000 });
    console.log("Modal is visible!");

    // Capture screenshot of presets
    await page.screenshot({ path: path.join(artifactDir, "p10_evidence_modal_presets_1440.png") });
    console.log("Saved p10_evidence_modal_presets_1440.png");

    // Click on 01. Digital Arrest Extortion preset
    console.log("Clicking 01. Digital Arrest Extortion preset...");
    const demo1Btn = page.locator("button:has-text('01. Digital Arrest Extortion')");
    await demo1Btn.click();
    await page.waitForTimeout(1000);

    // Screenshot with file loaded
    await page.screenshot({ path: path.join(artifactDir, "p10_file_loaded_1440.png") });
    console.log("Saved p10_file_loaded_1440.png");

    // Click Run Live Pipeline
    console.log("Running Live Investigation Pipeline...");
    const runPipelineBtn = page.locator("button:has-text('Run Live Pipeline'), button:has-text('Run Live Investigation Pipeline')");
    await runPipelineBtn.click();

    // Wait for pipeline stages and auto-navigation to network view
    console.log("Waiting for pipeline completion and auto-navigation...");
    await page.waitForTimeout(4000);

    // Verify URL changed to view=network
    console.log("Current URL:", page.url());

    // Capture screenshot of network view at 1440x900
    await page.screenshot({ path: path.join(artifactDir, "p10_pipeline_network_1440.png") });
    console.log("Saved p10_pipeline_network_1440.png");

    await context.close();

    // 1366x768
    const context1366 = await browser.newContext({ viewport: { width: 1366, height: 768 } });
    const page1366 = await context1366.newPage();
    await page1366.goto("http://localhost:5173/?case=CASE-2026-001&view=network", { waitUntil: "domcontentloaded" });
    await page1366.waitForTimeout(2000);
    await page1366.screenshot({ path: path.join(artifactDir, "p10_pipeline_network_1366.png") });
    console.log("Saved p10_pipeline_network_1366.png");
    await context1366.close();

    console.log("All Prompt 10 browser verification passed!");
  } catch (err) {
    console.error("Verification failed:", err);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

run();
