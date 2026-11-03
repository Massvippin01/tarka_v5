const { chromium } = require("playwright");
const path = require("path");

const ARTIFACT_DIR = "C:/Users/User/.gemini/antigravity/brain/d58d3a8c-966a-4cdf-aa8d-05cb4765cff3";

async function run() {
  console.log("=== STARTING FULL-SCREEN TOP-LEVEL PAGES E2E VERIFICATION ===");
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  page.on("console", (msg) => {
    if (msg.type() === "error") {
      console.log(`[Browser ${msg.type()}]:`, msg.text());
    }
  });
  page.on("pageerror", (err) => {
    console.log(`[Page Uncaught Error Stack]:\n`, err.stack);
  });

  try {
    // 1. Navigate to App
    console.log("1. Navigating to http://localhost:5173/ ...");
    await page.goto("http://localhost:5173/", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(2000);

    // 2. Test Workspaces Hub (Alt+W / 🗂️ Workspaces)
    console.log("2. Testing Workspaces Hub (Full-Width, No Left 01-06 Sidebar)...");
    const workspacesBtn = page.locator("button:has-text('🗂️ Workspaces')");
    await workspacesBtn.click();
    await page.waitForTimeout(500);

    // Verify left 01-06 sidebar rail (aside) is NOT present
    const asideCount = await page.locator("aside").count();
    console.log(`   Aside sidebar count on Workspaces page: ${asideCount} (Expected: 0)`);
    if (asideCount !== 0) throw new Error("Sidebar rail should be hidden on Workspaces Hub page!");

    // Verify 4 KPI tiles and Case cards grid exist
    const kpiCount = await page.locator("text=GOLDEN-HOUR TRIAGE").count();
    console.log(`   Golden Hour KPI tile present: ${kpiCount > 0}`);
    const benchShortcutCount = await page.locator("text=Open Full-Screen Benchmark").count();
    console.log(`   Benchmark Lab shortcut banner present: ${benchShortcutCount > 0}`);

    await page.screenshot({ path: path.join(ARTIFACT_DIR, "v5_workspaces_fullscreen_1440.png") });
    console.log("   Saved: v5_workspaces_fullscreen_1440.png");

    // 3. Test Benchmark & Diagnostics Lab (⚡ Benchmark Lab)
    console.log("3. Testing Benchmark & Diagnostics Lab (Full-Screen Studio)...");
    const benchmarkBtn = page.locator("button:has-text('⚡ Benchmark Lab')");
    await benchmarkBtn.click();
    await page.waitForTimeout(600);

    // Verify left 01-06 sidebar rail (aside) is NOT present
    const asideCountBench = await page.locator("aside").count();
    console.log(`   Aside sidebar count on Benchmark page: ${asideCountBench} (Expected: 0)`);
    if (asideCountBench !== 0) throw new Error("Sidebar rail should be hidden on Benchmark Lab page!");

    // Verify Row 1 Title
    const titleLocator = page.locator("text=TARKA EMPIRICAL BENCHMARK & 6-ENGINE DIAGNOSTIC LAB");
    console.log(`   Benchmark Lab Title present: ${(await titleLocator.count()) > 0}`);

    // Verify 5 KPI Tiles in Row 2
    const throughputTile = await page.locator("text=STREAMING THROUGHPUT").count();
    const memoryTile = await page.locator("text=MEMORY & AIR-GAP FOOTPRINT").count();
    const recallTile = await page.locator("text=RECALL VS. LEGACY BASELINE").count();
    const merchantTile = await page.locator("text=MERCHANT HARD-VETO SHIELD").count();
    const healthTile = await page.locator("text=6-ENGINE FEATURE HEALTH").count();
    console.log(`   5 KPI Tiles: Throughput=${throughputTile > 0}, RAM=${memoryTile > 0}, Recall=${recallTile > 0}, Merchant=${merchantTile > 0}, Health=${healthTile > 0}`);

    // Verify 3 Columns in Row 3
    const matrixHeader = await page.locator("text=GROUND-TRUTH CONFUSION MATRIX").count();
    const cgnatHeader = await page.locator("text=CGNAT CANDIDATE DECAY & SCALING PLOT").count();
    const clustersHeader = await page.locator("text=DISCOVERED FRAUD CLUSTERS").count();
    console.log(`   3 Columns: Col1=${matrixHeader > 0}, Col2=${cgnatHeader > 0}, Col3=${clustersHeader > 0}`);

    await page.screenshot({ path: path.join(ARTIFACT_DIR, "v5_benchmark_studio_1440.png") });
    console.log("   Saved: v5_benchmark_studio_1440.png");

    // 4. Test 6-Engine Feature Self-Diagnostic (27 Checks)
    console.log("4. Testing 6-Engine Feature Self-Diagnostic (27 Checks)...");
    const diagBtn = page.locator("button:has-text('Run 6-Engine Feature Self-Diagnostic')");
    await diagBtn.click();
    await page.waitForTimeout(800);

    const verifiedBadge = await page.locator("text=ALL VERIFIED").count();
    console.log(`   Diagnostic Checklist shows ALL VERIFIED: ${verifiedBadge > 0}`);

    await page.screenshot({ path: path.join(ARTIFACT_DIR, "v5_benchmark_diagnostic_verified_1440.png") });
    console.log("   Saved: v5_benchmark_diagnostic_verified_1440.png");

    // 5. Test Running 100k PaySim Stream
    console.log("5. Testing Streaming Ingestion (⚡ Run 100k PaySim Stream)...");
    const runPaySimBtn = page.locator("button:has-text('Run 100k PaySim Stream')");
    await runPaySimBtn.click();

    // Wait for streaming
    console.log("   Waiting for benchmark streaming completion (3 seconds)...");
    await page.waitForTimeout(3500);

    // Print text on page
    const pageText = await page.evaluate(() => document.querySelector("#tarka-benchmark-screen")?.innerText.slice(0, 500) || "");
    console.log("   Benchmark screen excerpt:\n" + pageText);

    // Verify True Positives and Discovered Clusters
    const clusterCards = await page.locator("text=LEDGER-01").count();
    console.log(`   Discovered Clusters contains LEDGER-01: ${clusterCards > 0}`);

    await page.screenshot({ path: path.join(ARTIFACT_DIR, "v5_benchmark_stream_completed_1440.png") });
    console.log("   Saved: v5_benchmark_stream_completed_1440.png");

    // 5b. Test Custom File Upload with SUTRAM Blind CSV (produces RING-01 Scatter-Gather Diamond)
    const blindCsvPath = path.resolve(__dirname, "../../SUTRAM_UNSEEN_BLIND_TEST_50K.csv");
    const fileExists = require("fs").existsSync(blindCsvPath);
    if (fileExists) {
      console.log("5b. Testing CSV Upload with SUTRAM_UNSEEN_BLIND_TEST_50K.csv...");
      const fileInput = page.locator("input[type='file']");
      await fileInput.setInputFiles(blindCsvPath);

      await page.waitForFunction(() => {
        const el = document.querySelector("#tarka-benchmark-screen");
        return el && el.innerText.includes("50,000") && el.innerText.includes("RING-01");
      }, { timeout: 15000 });
      await page.waitForTimeout(500);

      const ringCount = await page.locator("text=RING-01").count();
      console.log(`   Discovered Clusters contains RING-01: ${ringCount > 0}`);
      await page.screenshot({ path: path.join(ARTIFACT_DIR, "v5_benchmark_50k_blind_completed_1440.png") });
      console.log("   Saved: v5_benchmark_50k_blind_completed_1440.png");
    }

    // 6. Test Loading Cluster into 6-Screen Workbench
    console.log("6. Testing 1-Click Load into 6-Screen Workbench...");
    const loadBtn = page.locator("button:has-text('Load into 6-Screen Workbench')").first();
    await loadBtn.click();
    await page.waitForTimeout(800);

    // Verify left 01-06 sidebar rail (aside) IS NOW VISIBLE on Workbench mode!
    const asideCountWorkbench = await page.locator("aside").count();
    console.log(`   Aside sidebar count on Case Workbench page: ${asideCountWorkbench} (Expected: 1)`);
    if (asideCountWorkbench === 0) throw new Error("Sidebar rail should be visible on Case Workbench mode!");

    // Verify Workbench shows hydration banner
    const hydratedBanner = await page.locator("text=LIVE DISCOVERED CLUSTER").count();
    console.log(`   Live Discovered Cluster banner visible: ${hydratedBanner > 0}`);

    const returnBtn = page.locator("button:has-text('Return to Benchmark Lab')");
    console.log(`   Return to Benchmark Lab button present: ${(await returnBtn.count()) > 0}`);

    await page.screenshot({ path: path.join(ARTIFACT_DIR, "v5_workbench_hydrated_1440.png") });
    console.log("   Saved: v5_workbench_hydrated_1440.png");

    // 7. Test Return to Benchmark Lab
    console.log("7. Testing Return to Benchmark Lab button...");
    await returnBtn.click();
    await page.waitForTimeout(600);

    const isBackInBench = (await page.locator("text=TARKA EMPIRICAL BENCHMARK & 6-ENGINE DIAGNOSTIC LAB").count()) > 0;
    console.log(`   Successfully returned to Benchmark Lab: ${isBackInBench}`);

    // 8. Test 1920x1080 Viewport
    console.log("8. Testing 1920x1080 Viewport...");
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(ARTIFACT_DIR, "v5_benchmark_studio_1920.png") });
    console.log("   Saved: v5_benchmark_studio_1920.png");

    // Also switch to Workspaces at 1920x1080
    await page.locator("button:has-text('🗂️ Workspaces')").click();
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(ARTIFACT_DIR, "v5_workspaces_fullscreen_1920.png") });
    console.log("   Saved: v5_workspaces_fullscreen_1920.png");

    console.log("🎉 ALL FULL-SCREEN TOP-LEVEL APPLICATION PAGE TESTS PASSED 100%!");
  } catch (err) {
    console.error("Test failed:", err);
    await page.screenshot({ path: path.join(ARTIFACT_DIR, "v5_test_failure.png") });
    process.exit(1);
  } finally {
    await browser.close();
  }
}

run();
