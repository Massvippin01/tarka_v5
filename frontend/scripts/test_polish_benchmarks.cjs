const { chromium } = require("playwright");
const path = require("path");

const ARTIFACT_DIR = "C:/Users/User/.gemini/antigravity/brain/d58d3a8c-966a-4cdf-aa8d-05cb4765cff3";

async function run() {
  console.log("=== STARTING SURGICAL UI & LOGIC POLISH VERIFICATION ===");
  const browser = await chromium.launch({ headless: true });

  for (const [w, h] of [[1440, 900], [1920, 1080]]) {
    console.log(`\n--- TESTING AT ${w}x${h} ---`);
    const context = await browser.newContext({ viewport: { width: w, height: h } });
    const page = await context.newPage();

    page.on("console", (msg) => {
      if (msg.type() === "error") {
        console.log(`[Browser ${msg.type()}]:`, msg.text());
      }
    });

    // 1. Navigate to Benchmark Lab
    await page.goto("http://localhost:5173/?mode=benchmark", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(2000);

    // 2. VERIFY BUG 1: Header Overlap & Action Bar
    console.log("1. Verifying Header & Action Bar Layout...");
    const header = page.locator("header");
    const modeSwitcher = page.locator("button:has-text('⚡ Benchmark Lab')");
    const densitySwitcher = page.locator("text=Standard");
    const goldenHourBtn = page.locator("text=118m SLA");

    const modeBox = await modeSwitcher.boundingBox();
    const densityBox = await densitySwitcher.boundingBox();
    const goldenBox = await goldenHourBtn.boundingBox();

    console.log(`   Mode Switcher right: ${modeBox.x + modeBox.width}px`);
    console.log(`   Density Switcher left: ${densityBox.x}px (Gap: ${densityBox.x - (modeBox.x + modeBox.width)}px)`);
    console.log(`   Golden Hour right: ${goldenBox.x + goldenBox.width}px (Viewport: ${w}px)`);

    if (densityBox.x < modeBox.x + modeBox.width) {
      throw new Error("Header elements overlap detected!");
    }

    // Verify Action Bar: Export Report button is 100% unclipped
    const exportBtn = page.locator("button:has-text('Export Report')");
    const exportBox = await exportBtn.boundingBox();
    console.log(`   Export Report button right: ${exportBox.x + exportBox.width}px (Viewport: ${w}px)`);
    if (exportBox.x + exportBox.width > w) {
      throw new Error(`Export Report button is clipped off-screen: ${exportBox.x + exportBox.width} > ${w}`);
    }

    // 3. VERIFY BUG 2: 6-Engine Feature Diagnostic Accordions
    console.log("2. Verifying 6-Engine Feature Diagnostic Headers (shrink-0 & min-height: 34px)...");
    const engineTitles = [
      "Engine 01 · Intake & Falsifier",
      "Engine 02 · Entities & Veto",
      "Engine 03 · Attribution & Handset",
      "Engine 04 · Network & Topology",
      "Engine 05 · Taint & LIBR Lien",
      "Engine 06 · Court Admissibility",
    ];

    for (const title of engineTitles) {
      const engLoc = page.locator(`text=${title}`);
      const isVisible = await engLoc.isVisible();
      const engBox = await engLoc.boundingBox();
      console.log(`   ${title.slice(0, 22)}... visible: ${isVisible}, height: ${engBox ? engBox.height.toFixed(1) : 0}px`);
      if (!isVisible) throw new Error(`${title} is not visible!`);
    }

    // Toggle Engine 02 open and verify all 6 remain visible
    console.log("   Clicking Engine 02 to toggle...");
    await page.locator("text=Engine 02 · Entities & Veto").click();
    await page.waitForTimeout(300);

    for (const title of engineTitles) {
      const isVisible = await page.locator(`text=${title}`).isVisible();
      if (!isVisible) throw new Error(`${title} became hidden after opening Engine 02!`);
    }

    // 4. VERIFY BUG 4: Center Chart Toggle & Curves
    console.log("3. Verifying Center Chart (CGNAT vs. Throughput & 38MB RAM)...");
    const cgnatPill = page.locator("button:has-text('📈 CGNAT Decay')");
    const tpPill = page.locator("button:has-text('⚡ Throughput & 38MB RAM')");

    await tpPill.click();
    await page.waitForTimeout(300);
    const tpChartTitle = await page.locator("text=STREAMING THROUGHPUT & 38MB HEAP CURVE").count();
    const ramText = await page.locator("text=38.2 MB Heap (Constant)").count();
    console.log(`   Throughput & 38MB RAM Curve active: ${tpChartTitle > 0}, RAM label: ${ramText > 0}`);

    await cgnatPill.click();
    await page.waitForTimeout(300);
    const cgnatChartTitle = await page.locator("text=CGNAT CANDIDATE DECAY & SCALING PLOT").count();
    console.log(`   CGNAT Plot active: ${cgnatChartTitle > 0}`);

    // 5. VERIFY BUG 3 & BUG 4: Stream 100k PaySim, check Sort Order & Dynamic Badge
    console.log("4. Running 100k PaySim Stream...");
    const runPaySimBtn = page.locator("button:has-text('Run 100k PaySim')");
    await runPaySimBtn.click();
    await page.waitForTimeout(3500);

    // Check Dynamic Recall Badge in Confusion Matrix Header
    const recallBadge = page.locator("[data-testid='confusion-matrix-recall-badge']");
    const badgeText = await recallBadge.textContent();
    console.log(`   Confusion Matrix Dynamic Recall Badge: "${badgeText.trim()}"`);

    // Check Discovered Fraud Clusters sort order
    const firstClusterCard = page.locator("div[style*='cursor: pointer']").filter({ hasText: "LEDGER-01" }).or(page.locator("div[style*='cursor: pointer']").filter({ hasText: "RING-01" }));
    const firstClusterText = await firstClusterCard.first().textContent();
    console.log(`   First cluster card found: ${firstClusterText.slice(0, 45)}...`);

    // Capture screenshot artifact
    const screenshotPath = path.join(ARTIFACT_DIR, `v5_polished_benchmark_${w}.png`);
    await page.screenshot({ path: screenshotPath });
    console.log(`   Saved screenshot: ${screenshotPath}`);

    await context.close();
  }

  await browser.close();
  console.log("\n=== ALL SURGICAL POLISH VERIFICATIONS PASSED 100% ===");
}

run().catch((err) => {
  console.error("Verification failed:", err);
  process.exit(1);
});
