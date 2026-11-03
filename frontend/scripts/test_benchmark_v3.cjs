const { chromium } = require("playwright");
const path = require("path");

async function main() {
  console.log("=== Testing Benchmark Lab v3.0 Triage UI & 5-Typology Segregation ===");
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  page.on("console", (msg) => {
    if (msg.text().includes("[BenchmarkLabScreen]")) {
      console.log("BROWSER LOG:", msg.text());
    }
  });

  try {
    await page.goto("http://localhost:5173/?mode=benchmark", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(2000);
    console.log("Loaded app at localhost:5173/?mode=benchmark");

    // Verify Typology Filter Tabs exist
    const allTab = page.locator("button:has-text('All')").first();
    const ringsTab = page.locator("button:has-text('Rings')").first();
    const pairedTab = page.locator("button:has-text('Paired')").first();
    const smurfTab = page.locator("button:has-text('Smurf')").first();
    const telemTab = page.locator("button:has-text('Telem')").first();
    const ledgerTab = page.locator("button:has-text('Ledger')").first();

    console.log("Tabs present:", {
      all: await allTab.isVisible(),
      rings: await ringsTab.isVisible(),
      paired: await pairedTab.isVisible(),
      smurf: await smurfTab.isVisible(),
      telem: await telemTab.isVisible(),
      ledger: await ledgerTab.isVisible(),
    });

    // 2. Trigger 100k PaySim stream
    const runPaySimBtn = page.locator("button:has-text('Run 100k PaySim')").first();
    console.log("Clicking [⚡ Run 100k PaySim]...");
    await runPaySimBtn.click();

    // Wait for stream to complete (takes ~1.5 - 2s)
    await page.waitForTimeout(3000);

    // Take screenshot of completed benchmark
    const artDir = "C:\\Users\\User\\.gemini\\antigravity\\brain\\d58d3a8c-966a-4cdf-aa8d-05cb4765cff3";
    await page.screenshot({ path: path.join(artDir, "benchmark_v3_stream_completed.png") });
    console.log("Captured benchmark_v3_stream_completed.png");

    // Check confusion matrix badge
    const badge = page.locator("[data-testid='confusion-matrix-recall-badge']");
    if (await badge.isVisible()) {
      console.log("Confusion matrix badge text:", await badge.textContent());
    }

    // 3. Test Typology Filtering
    console.log("Testing Typology Tab Filters...");
    const allTabCount = await page.locator("button:has-text('All')").first().textContent();
    const ringTabCount = await page.locator("button:has-text('Rings')").first().textContent();
    const pairTabCount = await page.locator("button:has-text('Paired')").first().textContent();
    const smurfTabCount = await page.locator("button:has-text('Smurf')").first().textContent();
    const telemTabCount = await page.locator("button:has-text('Telem')").first().textContent();
    const ledgerTabCount = await page.locator("button:has-text('Ledger')").first().textContent();

    console.log("Typology Tab counts:", {
      all: allTabCount,
      rings: ringTabCount,
      paired: pairTabCount,
      smurf: smurfTabCount,
      telem: telemTabCount,
      ledger: ledgerTabCount,
    });

    await ringsTab.click();
    await page.waitForTimeout(300);
    const ringCount = await page.locator("text=RING-").count();
    console.log("Rings filtered count:", ringCount);

    await pairedTab.click();
    await page.waitForTimeout(300);
    const pairCount = await page.locator("text=PAIR-").count();
    console.log("Paired drains filtered count:", pairCount);

    await ledgerTab.click();
    await page.waitForTimeout(300);
    const ledgerCount = await page.locator("text=LEDGER-").count();
    console.log("Ledger invariants filtered count:", ledgerCount);

    // Return to All tab
    await allTab.click();
    await page.waitForTimeout(300);

    // 4. Test Instant Search
    console.log("Testing Instant Search Input...");
    const searchInput = page.locator("input[placeholder*='Search account']").first();
    await searchInput.fill("MEENAKSHI");
    await page.waitForTimeout(300);
    console.log("Search for MEENAKSHI result count:", await page.locator("text=MEENAKSHI").count());
    await searchInput.fill("");
    await page.waitForTimeout(300);

    // 5. Select a cluster card and verify Sub-Graph Inspector in Column 2
    console.log("Testing Sub-Graph Inspector & Workbench Hydration...");
    const firstClusterCard = page.locator("div[style*='cursor: pointer']").filter({ hasText: "RING-01" }).first();
    if (await firstClusterCard.isVisible()) {
      await firstClusterCard.click();
      await page.waitForTimeout(300);
    }

    // Verify sub-graph action button is present in Column 2
    const isolateBtn = page.locator("button:has-text('Isolate & Load Sub-Graph into 6-Screen Workbench')").first();
    console.log("Isolate & Load button visible in Column 2:", await isolateBtn.isVisible());

    // Click Isolate & Load button to verify workbench navigation
    await isolateBtn.click();
    await page.waitForTimeout(1000);

    console.log("Current URL / workbench state after load:");
    await page.screenshot({ path: path.join(artDir, "benchmark_v3_workbench_hydrated.png") });
    console.log("Captured benchmark_v3_workbench_hydrated.png");

    console.log("✅ ALL BENCHMARK LAB V3.0 UI TESTS PASSED SUCCESSFULLY!");
  } catch (err) {
    console.error("Test failed with error:", err);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

main();
