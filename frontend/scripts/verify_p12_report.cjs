const { chromium } = require("playwright");
const path = require("path");

async function run() {
  const artifactDir = "C:\\Users\\massv\\.gemini\\antigravity\\brain\\285293fd-af45-419a-9453-484e5e3dc2e1";
  const browser = await chromium.launch({ headless: true });

  try {
    // 1. 1440x900 Viewport
    console.log("Testing 1440x900 viewport on CASE-2026-001 report view...");
    const context1440 = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page1440 = await context1440.newPage();

    await page1440.goto("http://localhost:5173/?case=CASE-2026-001&view=report", { waitUntil: "domcontentloaded" });
    await page1440.waitForTimeout(2000);

    // Save full document screenshot at 1440x900
    await page1440.screenshot({ path: path.join(artifactDir, "p12_report_view_1440.png"), fullPage: true });
    console.log("Saved p12_report_view_1440.png");

    // Click on Notice 2 (Telecom Notice) tab
    const telecomNoticeBtn = page1440.locator("button:has-text('Telecom')").first();
    if (await telecomNoticeBtn.isVisible()) {
      console.log("Clicking Telecom Notice tab...");
      await telecomNoticeBtn.scrollIntoViewIfNeeded();
      await telecomNoticeBtn.click();
      await page1440.waitForTimeout(500);
      await page1440.screenshot({ path: path.join(artifactDir, "p12_report_notices_1440.png") });
      console.log("Saved p12_report_notices_1440.png");
    }

    await context1440.close();

    // 2. 1366x768 Viewport
    console.log("Testing 1366x768 viewport on CASE-2026-001 report view...");
    const context1366 = await browser.newContext({ viewport: { width: 1366, height: 768 } });
    const page1366 = await context1366.newPage();

    await page1366.goto("http://localhost:5173/?case=CASE-2026-001&view=report", { waitUntil: "domcontentloaded" });
    await page1366.waitForTimeout(2000);

    await page1366.screenshot({ path: path.join(artifactDir, "p12_report_view_1366.png"), fullPage: true });
    console.log("Saved p12_report_view_1366.png");

    // 3. Test clicking Export Report in header toolbar
    console.log("Testing Export Report toolbar button navigation...");
    await page1366.goto("http://localhost:5173/?case=CASE-2026-001&view=intake", { waitUntil: "domcontentloaded" });
    await page1366.waitForTimeout(1500);

    const exportBtn = page1366.locator("button:has-text('Export Report')").first();
    if (await exportBtn.isVisible()) {
      await exportBtn.click();
      await page1366.waitForTimeout(1500);
      const currentUrl = page1366.url();
      console.log("Navigated to URL:", currentUrl);
      if (!currentUrl.includes("view=report")) {
        throw new Error("Failed to navigate to view=report on clicking Export Report!");
      }
    }

    await context1366.close();

    console.log("Prompt 12 Verification finished successfully!");
  } catch (err) {
    console.error("Verification failed:", err);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

run();
