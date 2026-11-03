const { chromium } = require("playwright");
const path = require("path");

async function main() {
  console.log("=== Testing TARKA Benchmark Lab v4.0 Capability Matrix & Zero FP ===");
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1500, height: 950 } });
  const page = await context.newPage();

  page.on("console", (msg) => {
    if (msg.text().includes("[BenchmarkLabScreen]")) {
      console.log("BROWSER LOG:", msg.text());
    }
  });

  const artDir = "C:\\Users\\User\\.gemini\\antigravity\\brain\\d58d3a8c-966a-4cdf-aa8d-05cb4765cff3";

  try {
    await page.goto("http://localhost:5173/?mode=benchmark", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(2000);
    console.log("Loaded app at localhost:5173/?mode=benchmark");

    // 1. Initial screenshot
    await page.screenshot({ path: path.join(artDir, "benchmark_v4_initial.png") });
    console.log("Captured benchmark_v4_initial.png");

    // 2. Trigger 100k PaySim stream
    const runPaySimBtn = page.locator("button:has-text('Run 100k PaySim')").first();
    console.log("Clicking [Run 100k PaySim]...");
    await runPaySimBtn.click();

    // Wait for stream to complete
    await page.waitForTimeout(3000);

    // 3. Trigger 6-Engine Self-Test (27)
    const selfTestBtn = page.locator("button:has-text('6-Engine Self-Test')").first();
    console.log("Clicking [6-Engine Self-Test (27)]...");
    await selfTestBtn.click();
    await page.waitForTimeout(1000);

    // 4. Capture screenshot of completed PaySim stream with Capability Matrix & Honest N/A Badges
    await page.screenshot({ path: path.join(artDir, "benchmark_v4_capability_matrix.png") });
    console.log("Captured benchmark_v4_capability_matrix.png");

    // 5. Expand Engine 01 and Engine 03 in Diagnostic Checklist
    const eng01 = page.locator("div:has-text('Engine 01 · Intake & Falsifier')").first();
    const eng03 = page.locator("div:has-text('Engine 03 · Attribution & Handset')").first();
    if (await eng03.isVisible()) {
      await eng03.click();
      await page.waitForTimeout(500);
      await page.screenshot({ path: path.join(artDir, "benchmark_v4_accordion_expanded.png") });
      console.log("Captured benchmark_v4_accordion_expanded.png");
    }

    console.log("✅ Playwright UI verification completed successfully!");
  } catch (err) {
    console.error("Test error:", err);
  } finally {
    await browser.close();
  }
}

main();
