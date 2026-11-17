const { chromium } = require("playwright");
const path = require("path");

const ARTIFACT_DIR = "C:\\Users\\User\\.gemini\\antigravity\\brain\\d52bb9c5-32cf-4c3d-bd16-a773ad96da26";

async function run() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });
  const page = await context.newPage();

  console.log("Navigating to Screen 04 Network Topology...");
  await page.goto("http://localhost:5173/?case=CASE-2026-001&nav=investigations&lens=Network&mode=2D&tab=system&level=0", {
    waitUntil: "domcontentloaded",
    timeout: 15000,
  });

  await page.waitForTimeout(2000);

  // Switch to Workbench page if on Workspaces, then select Screen 04 Network
  console.log("Switching to Screen 04 Network Topology...");
  await page.keyboard.press("Alt+4");
  await page.waitForTimeout(2000);

  // 1. In-page screenshot
  console.log("Capturing in-page network graph...");
  await page.screenshot({
    path: path.join(ARTIFACT_DIR, "screen_04_network_inpage.png"),
    fullPage: false,
  });

  // 2. Click Minimize button
  console.log("Testing Minimize graph...");
  const minimizeBtn = page.locator('[data-testid="toggle-minimize-btn"]');
  if (await minimizeBtn.isVisible()) {
    await minimizeBtn.click();
    await page.waitForTimeout(800);
    await page.screenshot({
      path: path.join(ARTIFACT_DIR, "screen_04_network_minimized.png"),
      fullPage: false,
    });
    // Expand again
    const expandBtn = page.locator('[data-testid="expand-graph-btn"]');
    if (await expandBtn.isVisible()) {
      await expandBtn.click();
      await page.waitForTimeout(800);
    }
  } else {
    console.warn("Minimize button not visible!");
  }

  // 3. Click Fullscreen button
  console.log("Testing Fullscreen white theme...");
  const fullscreenBtn = page.locator('[data-testid="enter-fullscreen-btn"]');
  if (await fullscreenBtn.isVisible()) {
    await fullscreenBtn.click();
    await page.waitForTimeout(1000);
    await page.screenshot({
      path: path.join(ARTIFACT_DIR, "screen_04_network_fullscreen_white.png"),
      fullPage: false,
    });
    // Exit fullscreen via Esc
    await page.keyboard.press("Escape");
    await page.waitForTimeout(800);
  } else {
    console.warn("Fullscreen button not visible!");
  }

  // 4. Open Voice AI Modal
  console.log("Testing Voice AI White theme modal...");
  const voiceAiBtn = page.locator('button[title="Voice AI Assistant"]');
  if (await voiceAiBtn.isVisible()) {
    await voiceAiBtn.click();
    await page.waitForTimeout(1000);
    await page.screenshot({
      path: path.join(ARTIFACT_DIR, "screen_voice_ai_white.png"),
      fullPage: false,
    });
  } else {
    console.warn("Voice AI button not visible!");
  }

  console.log("Verification screenshots captured successfully!");
  await browser.close();
}

run().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
