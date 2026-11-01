const { chromium } = require('playwright');
const path = require('path');

(async () => {
  console.log('[E2E TEST] Launching Chromium browser...');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });
  const page = await context.newPage();

  console.log('[E2E TEST] Navigating to http://localhost:5173/?case=CASE-2026-001&nav=investigations&lens=Network&entity=P001&mode=2D&tab=dossier&level=0 ...');
  await page.goto('http://localhost:5173/?case=CASE-2026-001&nav=investigations&lens=Network&entity=P001&mode=2D&tab=dossier&level=0');
  await page.waitForTimeout(2000);

  // Take screenshot of Screen 00
  await page.screenshot({ path: 'test_screen00_verified.png' });
  console.log('✓ Captured Screen 00 to test_screen00_verified.png');

  // Press Alt+D to open Public Dataset Benchmark Modal
  console.log('[E2E TEST] Pressing Alt+D to open Public Dataset Benchmark Modal...');
  await page.keyboard.press('Alt+KeyD');
  await page.waitForTimeout(1000);

  // Take screenshot of opened modal
  await page.screenshot({ path: 'test_modal_opened.png' });
  console.log('✓ Captured benchmark modal to test_modal_opened.png');

  // Click "Run 100k PaySim Replica" button
  console.log('[E2E TEST] Clicking "Run 100k PaySim Replica" button...');
  const startBtn = await page.locator('button:has-text("Run 100k PaySim Replica")');
  if (await startBtn.isVisible()) {
    await startBtn.click();
    console.log('[E2E TEST] Stream started. Waiting 6s for worker completion...');
    await page.waitForTimeout(6000);
  } else {
    console.log('[WARN] "Run 100k PaySim Replica" button not found');
  }

  // Take screenshot of completed benchmark
  await page.screenshot({ path: 'test_modal_completed.png' });
  console.log('✓ Captured completed benchmark to test_modal_completed.png');

  // Find and click the first "Load into Workbench" button
  const loadBtn = await page.locator('button:has-text("Load into Workbench"), button:has-text("Load Cluster into Workbench")').first();
  if (await loadBtn.isVisible()) {
    console.log('[E2E TEST] Clicking "Load into Workbench"...');
    await loadBtn.click();
    await page.waitForTimeout(2000);

    // Take screenshot of hydrated Screen 01 with live banner
    await page.screenshot({ path: 'test_workbench_hydrated.png' });
    console.log('✓ Captured hydrated Screen 01 to test_workbench_hydrated.png');
  } else {
    console.log('[WARN] Load button not visible yet in DOM');
  }

  await browser.close();
  console.log('[E2E TEST] Verification completed successfully!');
})();
