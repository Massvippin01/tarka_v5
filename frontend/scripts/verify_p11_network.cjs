const { chromium } = require("playwright");
const path = require("path");

async function run() {
  const artifactDir = "C:\\Users\\massv\\.gemini\\antigravity\\brain\\285293fd-af45-419a-9453-484e5e3dc2e1";
  const browser = await chromium.launch({ headless: true });

  try {
    // 1. 1440x900 Viewport
    console.log("Testing 1440x900 viewport on CASE-2026-001 network view...");
    const context1440 = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page1440 = await context1440.newPage();

    await page1440.goto("http://localhost:5173/?case=CASE-2026-001&view=network", { waitUntil: "domcontentloaded" });
    await page1440.waitForTimeout(2000);

    // Save full graph screenshot at 1440x900
    await page1440.screenshot({ path: path.join(artifactDir, "p11_network_graph_1440.png") });
    console.log("Saved p11_network_graph_1440.png");

    // Click on Vikram Shah or any mule account node to open Dossier & Score Waterfall
    const muleCard = page1440.locator(".node-card:has-text('Vikram'), .node-card:has-text('Rohit')").first();
    if (await muleCard.isVisible()) {
      console.log("Clicking mule account node to trigger side dossier sheet...");
      await muleCard.click();
      await page1440.waitForTimeout(1000);
      await page1440.screenshot({ path: path.join(artifactDir, "p11_node_dossier_waterfall_1440.png") });
      console.log("Saved p11_node_dossier_waterfall_1440.png");
    }

    await context1440.close();

    // 2. 1366x768 Viewport
    console.log("Testing 1366x768 viewport on CASE-2026-001 network view...");
    const context1366 = await browser.newContext({ viewport: { width: 1366, height: 768 } });
    const page1366 = await context1366.newPage();

    await page1366.goto("http://localhost:5173/?case=CASE-2026-001&view=network", { waitUntil: "domcontentloaded" });
    await page1366.waitForTimeout(2000);

    await page1366.screenshot({ path: path.join(artifactDir, "p11_network_graph_1366.png") });
    console.log("Saved p11_network_graph_1366.png");

    await context1366.close();

    console.log("Verification finished successfully!");
  } catch (err) {
    console.error("Verification failed:", err);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

run();
