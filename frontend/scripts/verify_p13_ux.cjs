const { chromium } = require("playwright");
const path = require("path");

async function run() {
  const artifactDir = "C:\\Users\\massv\\.gemini\\antigravity\\brain\\285293fd-af45-419a-9453-484e5e3dc2e1";
  const browser = await chromium.launch({ headless: true });

  try {
    // 1. 1440x900 Viewport
    console.log("Testing 1440x900 viewport on Screens 01 to 06 with plain-language navigation & finding cards...");
    const context1440 = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page1440 = await context1440.newPage();

    // 1. Intake screen
    await page1440.goto("http://localhost:5173/?case=CASE-2026-001&view=intake", { waitUntil: "domcontentloaded" });
    await page1440.waitForSelector(".screen-finding-card", { timeout: 8000 });
    await page1440.waitForTimeout(1000);
    await page1440.screenshot({ path: path.join(artifactDir, "p13_intake_1440.png") });
    console.log("Saved p13_intake_1440.png");

    // 2. Attribution screen with CGNAT funnel chart
    await page1440.goto("http://localhost:5173/?case=CASE-2026-001&view=attribution", { waitUntil: "domcontentloaded" });
    await page1440.waitForSelector(".cgnat-funnel-container", { timeout: 8000 });
    await page1440.waitForTimeout(1000);
    await page1440.screenshot({ path: path.join(artifactDir, "p13_attribution_funnel_1440.png") });
    console.log("Saved p13_attribution_funnel_1440.png");

    // 3. Court proof checklist screen
    await page1440.goto("http://localhost:5173/?case=CASE-2026-001&view=court-proof", { waitUntil: "domcontentloaded" });
    await page1440.waitForTimeout(1000);
    await page1440.screenshot({ path: path.join(artifactDir, "p13_court_proof_checklist_1440.png") });
    console.log("Saved p13_court_proof_checklist_1440.png");

    await context1440.close();

    // 2. 1366x768 Viewport
    console.log("Testing 1366x768 viewport on Attribution Screen...");
    const context1366 = await browser.newContext({ viewport: { width: 1366, height: 768 } });
    const page1366 = await context1366.newPage();

    await page1366.goto("http://localhost:5173/?case=CASE-2026-001&view=attribution", { waitUntil: "domcontentloaded" });
    await page1366.waitForSelector(".cgnat-funnel-container", { timeout: 8000 });
    await page1366.waitForTimeout(1000);
    await page1366.screenshot({ path: path.join(artifactDir, "p13_attribution_funnel_1366.png") });
    console.log("Saved p13_attribution_funnel_1366.png");

    await context1366.close();
    console.log("ALL P13 VERIFICATIONS COMPLETED SUCCESSFULLY!");
  } finally {
    await browser.close();
  }
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
