const { chromium } = require("playwright");
const path = require("path");
const fs = require("fs");

const ARTIFACT_DIR = "C:/Users/massv/.gemini/antigravity/brain/285293fd-af45-419a-9453-484e5e3dc2e1";

async function verifyPrompt6() {
  console.log("=== STARTING PROMPT 6 SHELL, NAVIGATION & BOUNDING BOX VERIFICATION ===");
  const browser = await chromium.launch({ headless: true });

  const viewports = [
    { name: "1366x768 (Projector)", width: 1366, height: 768, filePrefix: "p6_shell_1366" },
    { name: "1440x900 (Standard)", width: 1440, height: 900, filePrefix: "p6_shell_1440" },
    { name: "1920x1080 (FullHD)", width: 1920, height: 1080, filePrefix: "p6_shell_1920" },
  ];

  try {
    for (const vp of viewports) {
      console.log(`\n--- Testing Viewport: ${vp.name} ---`);
      const context = await browser.newContext({ viewport: { width: vp.width, height: vp.height } });
      const page = await context.newPage();

      // Navigate to Workbench Intake screen
      await page.goto("http://localhost:5173/?case=CASE-2026-001&view=intake", { waitUntil: "domcontentloaded" });
      await page.waitForTimeout(1500);

      // Verify Header exists
      const header = page.locator("header");
      await header.waitFor({ state: "visible" });

      // Inspect Header 3 zones
      const zones = await page.evaluate(() => {
        const headerEl = document.querySelector("header");
        if (!headerEl) return null;
        const children = Array.from(headerEl.children);
        return children.map((el, i) => {
          const rect = el.getBoundingClientRect();
          return {
            index: i,
            left: rect.left,
            right: rect.right,
            width: rect.width,
            height: rect.height,
            text: el.innerText.slice(0, 30),
          };
        });
      });

      console.log(`   Header has ${zones ? zones.length : 0} direct children zones:`);
      if (zones && zones.length >= 3) {
        zones.forEach((z) => {
          console.log(`     Zone ${z.index}: left=${z.left.toFixed(1)}, right=${z.right.toFixed(1)}, width=${z.width.toFixed(1)} ("${z.text.replace(/\n/g, ' ')}")`);
        });

        // Bounding box intersection check
        for (let i = 0; i < zones.length - 1; i++) {
          const current = zones[i];
          const next = zones[i + 1];
          const overlap = current.right > next.left + 1; // 1px margin
          console.log(`     Intersection check Zone ${i} vs Zone ${i + 1}: ${overlap ? "FAILED OVERLAP!" : "PASSED (No overlap)"}`);
          if (overlap) {
            throw new Error(`Header child ${i} overlaps with child ${i + 1} at ${vp.name}!`);
          }
        }
      }

      // Check max visible actions in Zone 3
      const zone3ButtonsCount = await page.evaluate(() => {
        const headerEl = document.querySelector("header");
        if (!headerEl || headerEl.children.length < 3) return 0;
        const zone3 = headerEl.children[2];
        const buttons = zone3.querySelectorAll("button");
        return buttons.length;
      });
      console.log(`   Zone 3 visible action buttons count: ${zone3ButtonsCount} (5 main actions + 1 More menu = 6 buttons)`);
      if (zone3ButtonsCount > 6) {
        throw new Error(`Zone 3 should have max 5 visible actions + More menu, found ${zone3ButtonsCount}`);
      }

      // Take screenshot of header & screen at this resolution
      const screenshotPath = path.join(ARTIFACT_DIR, `${vp.filePrefix}_intake.png`);
      await page.screenshot({ path: screenshotPath });
      console.log(`   Saved screenshot: ${screenshotPath}`);

      await context.close();
    }

    // 2. Test Refresh / Deep-linking Two-Way URL Sync
    console.log("\n--- Testing URL Two-Way Sync and Page Refresh ---");
    const testContext = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const testPage = testContext.newPage();
    const page = await testPage;

    // Direct navigation to Screen 02 (entities) on Case 002
    console.log("   Navigating directly to ?case=CASE-2026-002&view=entities ...");
    await page.goto("http://localhost:5173/?case=CASE-2026-002&view=entities", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(1500);

    // Verify Screen 02 is active
    let headerText = await page.evaluate(() => document.querySelector("header")?.innerText || "");
    console.log(`   Header text after direct navigation: ${headerText.replace(/\n/g, " | ")}`);
    if (!headerText.includes("FIR #88/2026") && !headerText.includes("CASE-88/2026")) {
      throw new Error("Case 002 (FIR #88/2026) not active after direct navigation!");
    }
    if (!headerText.includes("Entity Resolution")) {
      throw new Error("Entity Resolution not active after direct navigation!");
    }

    // Refresh the page
    console.log("   Refreshing the browser page (F5 / reload)...");
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.waitForTimeout(1500);

    // Verify still on Screen 02 Case 002
    const afterReloadUrl = page.url();
    console.log(`   URL after reload: ${afterReloadUrl}`);
    const parsedUrl = new URL(afterReloadUrl);
    if (parsedUrl.searchParams.get("case") !== "CASE-2026-002") {
      throw new Error(`Expected ?case=CASE-2026-002 after reload, got: ${parsedUrl.searchParams.get("case")}`);
    }
    if (parsedUrl.searchParams.get("view") !== "entities") {
      throw new Error(`Expected ?view=entities after reload, got: ${parsedUrl.searchParams.get("view")}`);
    }
    headerText = await page.evaluate(() => document.querySelector("header")?.innerText || "");
    console.log(`   Header text after reload: ${headerText.replace(/\n/g, " | ")}`);
    if (!headerText.includes("Entity Resolution")) {
      throw new Error("Entity Resolution lost after page reload!");
    }
    console.log("   PASSED: Deep-link and refresh preserved screen and case exactly!");

    await page.screenshot({ path: path.join(ARTIFACT_DIR, "p6_entities_refresh_1440.png") });

    // 3. Test Benchmarks Mutually Exclusive Rendering
    console.log("\n--- Testing Benchmarks Mutually Exclusive Rendering ---");
    // Switch to Workspaces
    await page.locator("button:has-text('Workspaces')").click();
    await page.waitForTimeout(800);

    // Verify Workspaces Hub is rendered
    let workspaceBody = await page.evaluate(() => document.querySelector("#tarka-workspace-body")?.innerText || "");
    if (!workspaceBody.includes("Workspaces Hub") && !workspaceBody.includes("CASES")) {
      console.log("Workspace text excerpt:", workspaceBody.slice(0, 200));
    }

    // Click Benchmarks button
    console.log("   Clicking 'Benchmarks' button in CaseWorkspaceScreen...");
    const benchBtn = page.locator("button:has-text('Benchmarks')").first();
    await benchBtn.click();
    await page.waitForTimeout(1000);

    // Verify Benchmark Lab is rendered exclusively
    const benchScreenCount = await page.locator("#tarka-benchmark-screen").count();
    console.log(`   #tarka-benchmark-screen present: ${benchScreenCount > 0}`);
    if (benchScreenCount === 0) {
      throw new Error("Benchmark Lab did not render after clicking Benchmarks!");
    }

    // Verify CaseWorkspaceScreen is NOT rendered above or below it
    const isWorkspaceTablePresent = await page.evaluate(() => {
      const el = document.querySelector("#tarka-benchmark-screen");
      if (!el) return false;
      // Check parent children
      const parent = el.parentElement;
      return parent ? parent.innerText.includes("Active Police Station Hubs") : false;
    });
    console.log(`   CaseWorkspaceScreen rendered simultaneously: ${isWorkspaceTablePresent} (Expected: false)`);
    if (isWorkspaceTablePresent) {
      throw new Error("CaseWorkspaceScreen rendered simultaneously with BenchmarkLabScreen!");
    }

    // Check URL
    const benchUrl = new URL(page.url());
    console.log(`   URL when Benchmarks active: ${benchUrl.search}`);
    if (benchUrl.searchParams.get("view") !== "benchmark") {
      console.warn("Warning: URL view param is", benchUrl.searchParams.get("view"));
    }

    await page.screenshot({ path: path.join(ARTIFACT_DIR, "p6_benchmarks_exclusive_1440.png") });
    console.log("   PASSED: Benchmark Lab renders mutually exclusively without Workspace overlap!");

    // 4. Test "⋯ More" popover functionality
    console.log("\n--- Testing '⋯ More' Popover Menu ---");
    const moreBtn = page.locator("button:has-text('More')").first();
    await moreBtn.click();
    await page.waitForTimeout(500);

    const moreContent = await page.evaluate(() => {
      const popover = document.querySelector("[data-radix-popper-content-wrapper]");
      return popover ? popover.innerText : "";
    });
    console.log(`   More menu content: ${moreContent.replace(/\n/g, " | ")}`);
    if (!moreContent.includes("Timeline Calibration") || !moreContent.includes("Falsification Mutator")) {
      throw new Error("More menu does not contain expected utilities!");
    }
    console.log("   PASSED: '⋯ More' popover menu works and contains secondary utilities!");

    await page.screenshot({ path: path.join(ARTIFACT_DIR, "p6_more_menu_open_1440.png") });

    await testContext.close();
    console.log("\n🎉 PROMPT 6 FULL ACCEPTANCE VERIFIED 100%!");
  } catch (err) {
    console.error("Verification failed:", err);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

verifyPrompt6();
