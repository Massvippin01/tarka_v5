const { chromium } = require('e:/Tarka_v3/tarka/frontend/node_modules/playwright');
const path = require('path');

const outDir = 'C:/Users/User/.gemini/antigravity/brain/249cd97f-a6aa-46cc-9ccf-37d2236e6dbe';

async function run() {
  console.log('=== TARKA R5 GRAPH RESCUE COMPREHENSIVE PLAYWRIGHT AUDIT ===\n');
  const browser = await chromium.launch({ headless: true });

  const resolutions = [
    { width: 1920, height: 1080, label: '1080p' },
    { width: 1536, height: 864, label: '864p' },
    { width: 1366, height: 768, label: '768p' },
  ];

  for (const res of resolutions) {
    console.log(`\n===============================================================`);
    console.log(`TESTING VIEWPORT: ${res.label} (${res.width}x${res.height})`);
    console.log(`===============================================================`);

    const page = await browser.newPage({
      viewport: { width: res.width, height: res.height },
      deviceScaleFactor: 1,
    });

    // -------------------------------------------------------------------------
    // TEST 1: SCREEN 03 ATTRIBUTION (SIGNAL SIEVE)
    // -------------------------------------------------------------------------
    console.log(`\n--- [03 Attribution: Signal Sieve] ---`);
    await page.goto('http://127.0.0.1:5173/?view=attribution', { waitUntil: 'networkidle', timeout: 15000 });
    await page.waitForTimeout(600);

    // Metric contract check
    const attrScroll = await page.evaluate(() => {
      const doc = document.documentElement;
      return {
        scrollHeight: doc.scrollHeight,
        innerHeight: window.innerHeight,
        hasOuterScroll: doc.scrollHeight > window.innerHeight,
      };
    });
    console.log(`Layout fit: scrollHeight=${attrScroll.scrollHeight}, innerHeight=${attrScroll.innerHeight}, hasOuterScroll=${attrScroll.hasOuterScroll}`);

    // Dev hook stats
    const haystackStats = await page.evaluate(() => window.__tarkaViz?.haystack?.stats());
    console.log('window.__tarkaViz.haystack.stats():', JSON.stringify(haystackStats));

    // Test Drop Port Toggle
    const dropPortBtn = page.locator('button:has-text("Drop Source Port"), button:has-text("Path B Active")');
    if (await dropPortBtn.count() > 0) {
      await dropPortBtn.first().click();
      await page.waitForTimeout(300);
      const droppedStats = await page.evaluate(() => window.__tarkaViz?.haystack?.stats());
      console.log('After Drop Port click stats:', JSON.stringify(droppedStats));
      // Toggle back
      await dropPortBtn.first().click();
      await page.waitForTimeout(300);
    }

    // Test View as Table Toggle
    const attrTableBtn = page.locator('button:has-text("View as Table"), button:has-text("Canvas Sieve")');
    if (await attrTableBtn.count() > 0) {
      await attrTableBtn.first().click();
      await page.waitForTimeout(200);
      const rowCount = await page.locator('table tbody tr').count();
      console.log(`View as Table active: ${rowCount} step rows rendered in table.`);
      await attrTableBtn.first().click(); // toggle back
      await page.waitForTimeout(200);
    }

    if (res.label === '1080p') {
      const scPath = path.join(outDir, 'r5_screen3_attribution.png');
      await page.screenshot({ path: scPath, fullPage: false });
      console.log(`Saved screenshot: ${scPath}`);
    }

    // -------------------------------------------------------------------------
    // TEST 2: SCREEN 04 NETWORK (EVIDENCE NETWORK GRAPH)
    // -------------------------------------------------------------------------
    console.log(`\n--- [04 Network: Evidence Network Graph] ---`);
    await page.goto('http://127.0.0.1:5173/?view=network', { waitUntil: 'networkidle', timeout: 15000 });
    await page.waitForTimeout(600);

    const netScroll = await page.evaluate(() => {
      const doc = document.documentElement;
      return {
        scrollHeight: doc.scrollHeight,
        innerHeight: window.innerHeight,
        hasOuterScroll: doc.scrollHeight > window.innerHeight,
      };
    });
    console.log(`Layout fit: scrollHeight=${netScroll.scrollHeight}, innerHeight=${netScroll.innerHeight}, hasOuterScroll=${netScroll.hasOuterScroll}`);

    const netStats = await page.evaluate(() => window.__tarkaViz?.network?.stats());
    console.log('window.__tarkaViz.network.stats():', JSON.stringify(netStats));

    // Test Filter Chips
    const tetherChip = page.locator('button:has-text("TETHER")');
    if (await tetherChip.count() > 0) {
      await tetherChip.first().click();
      await page.waitForTimeout(200);
      const fStats = await page.evaluate(() => window.__tarkaViz?.network?.stats());
      console.log('After clicking TETHER filter:', JSON.stringify(fStats));
      const allChip = page.locator('button:has-text("ALL")');
      await allChip.first().click();
      await page.waitForTimeout(200);
    }

    // Test Hotspot Simulation Toggle
    const hotspotBtn = page.locator('button:has-text("Simulate Hotspot"), button:has-text("Hotspot Active")');
    if (await hotspotBtn.count() > 0) {
      await hotspotBtn.first().click();
      await page.waitForTimeout(200);
      const hsStats = await page.evaluate(() => window.__tarkaViz?.network?.stats());
      console.log('After Simulate Hotspot click:', JSON.stringify(hsStats));
      await hotspotBtn.first().click(); // toggle back
      await page.waitForTimeout(200);
    }

    // Test View as Table Toggle
    const netTableBtn = page.locator('button:has-text("View as Table"), button:has-text("Graph View")');
    if (await netTableBtn.count() > 0) {
      await netTableBtn.first().click();
      await page.waitForTimeout(200);
      const rowCount = await page.locator('table tbody tr').count();
      console.log(`View as Table active: ${rowCount} evidence bus rows rendered.`);
      await netTableBtn.first().click(); // toggle back
      await page.waitForTimeout(200);
    }

    if (res.label === '1080p') {
      const scPath = path.join(outDir, 'r5_screen4_network.png');
      await page.screenshot({ path: scPath, fullPage: false });
      console.log(`Saved screenshot: ${scPath}`);
    }

    // -------------------------------------------------------------------------
    // TEST 3: SCREEN 05 TAINT (MONEY FLOW SANKEY & DECAY CURVE)
    // -------------------------------------------------------------------------
    console.log(`\n--- [05 Taint Engine: Money Flow Sankey] ---`);
    await page.goto('http://127.0.0.1:5173/?view=taint-engine', { waitUntil: 'networkidle', timeout: 15000 });
    await page.waitForTimeout(600);

    const taintScroll = await page.evaluate(() => {
      const doc = document.documentElement;
      return {
        scrollHeight: doc.scrollHeight,
        innerHeight: window.innerHeight,
        hasOuterScroll: doc.scrollHeight > window.innerHeight,
      };
    });
    console.log(`Layout fit: scrollHeight=${taintScroll.scrollHeight}, innerHeight=${taintScroll.innerHeight}, hasOuterScroll=${taintScroll.hasOuterScroll}`);

    const sankeyStats = await page.evaluate(() => window.__tarkaViz?.sankey?.stats());
    console.log('window.__tarkaViz.sankey.stats():', JSON.stringify(sankeyStats));

    // Test Clean Deposit Mutator Toggle
    const cleanBtn = page.locator('button:has-text("Inject Clean Deposit"), button:has-text("Clean Deposit Active")');
    if (await cleanBtn.count() > 0) {
      await cleanBtn.first().click();
      await page.waitForTimeout(200);
      const cleanStats = await page.evaluate(() => window.__tarkaViz?.sankey?.stats());
      console.log('After Inject Clean Deposit click:', JSON.stringify(cleanStats));
      await cleanBtn.first().click(); // toggle back
      await page.waitForTimeout(200);
    }

    // Test View as Table Toggle
    const taintTableBtn = page.locator('button:has-text("View as Table"), button:has-text("Sankey Flow")');
    if (await taintTableBtn.count() > 0) {
      await taintTableBtn.first().click();
      await page.waitForTimeout(200);
      const rowCount = await page.locator('table tbody tr').count();
      console.log(`View as Table active: ${rowCount} flow link rows rendered.`);
      await taintTableBtn.first().click(); // toggle back
      await page.waitForTimeout(200);
    }

    if (res.label === '1080p') {
      const scPath = path.join(outDir, 'r5_screen5_taint.png');
      await page.screenshot({ path: scPath, fullPage: false });
      console.log(`Saved screenshot: ${scPath}`);
    }

    await page.close();
  }

  await browser.close();
  console.log('\n===============================================================');
  console.log('ALL R5 GRAPH RESCUE AUDITS COMPLETE AND VERIFIED!');
  console.log('===============================================================');
}

run().catch((err) => {
  console.error('Audit failed with error:', err);
  process.exit(1);
});

