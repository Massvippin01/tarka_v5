const { chromium } = require("playwright");
const path = require("path");

async function run() {
  const artifactDir = "C:\\Users\\massv\\.gemini\\antigravity\\brain\\285293fd-af45-419a-9453-484e5e3dc2e1";
  const browser = await chromium.launch({ headless: true });

  try {
    // 1. 1440x900 Viewport
    console.log("Testing 1440x900 viewport on Judge Mode Walkthrough...");
    const context1440 = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page1440 = await context1440.newPage();

    await page1440.goto("http://localhost:5173/?case=CASE-2026-001&view=intake", { waitUntil: "domcontentloaded" });
    await page1440.waitForTimeout(1500);

    // Click "⚡ 3-Min Judge Demo" button
    const demoBtn = page1440.locator("button:has-text('3-Min Judge Demo')").first();
    await demoBtn.waitFor({ state: "visible", timeout: 8000 });
    await demoBtn.click();
    await page1440.waitForTimeout(800);

    // Verify walkthrough overlay is visible
    const overlay = page1440.locator(".judge-walkthrough-overlay");
    await overlay.waitFor({ state: "visible", timeout: 5000 });
    console.log("Judge walkthrough overlay visible on Step 1!");
    await page1440.screenshot({ path: path.join(artifactDir, "p14_judge_walkthrough_step1_1440.png") });
    console.log("Saved p14_judge_walkthrough_step1_1440.png");

    // Advance to Step 3 (Entities)
    const nextBtn = page1440.locator("button:has-text('Next Step')");
    await nextBtn.click();
    await page1440.waitForTimeout(600);
    await nextBtn.click();
    await page1440.waitForTimeout(800);
    console.log("Advanced to Step 3 (Entities)!");
    await page1440.screenshot({ path: path.join(artifactDir, "p14_judge_walkthrough_step3_1440.png") });
    console.log("Saved p14_judge_walkthrough_step3_1440.png");

    await context1440.close();

    // 2. 1366x768 Projector Viewport
    console.log("Testing 1366x768 projector resolution...");
    const context1366 = await browser.newContext({ viewport: { width: 1366, height: 768 } });
    const page1366 = await context1366.newPage();

    await page1366.goto("http://localhost:5173/?case=CASE-2026-001&view=intake", { waitUntil: "domcontentloaded" });
    await page1366.waitForTimeout(1500);

    const demoBtn1366 = page1366.locator("button:has-text('3-Min Judge Demo')").first();
    await demoBtn1366.click();
    await page1366.waitForTimeout(800);

    await page1366.screenshot({ path: path.join(artifactDir, "p14_judge_walkthrough_1366.png") });
    console.log("Saved p14_judge_walkthrough_1366.png");

    await context1366.close();
    console.log("ALL P14 VERIFICATIONS COMPLETED SUCCESSFULLY!");
  } finally {
    await browser.close();
  }
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});

