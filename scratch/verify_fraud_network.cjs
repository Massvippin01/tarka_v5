const { chromium } = require('../frontend/node_modules/playwright');
const path = require('path');
const fs = require('fs');

async function verifyFraudNetwork() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1366, height: 768 }
  });
  const page = await context.newPage();

  const outDir = path.join(__dirname, 'screenshots');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  console.log('Navigating to Fraud Network screen...');
  const targetUrl = 'http://localhost:5173/?case=CASE-2026-001&nav=investigations&lens=Network&entity=P001&mode=2D&tab=system&level=0&view=network';
  await page.goto(targetUrl, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(3000);

  // Take initial screenshot
  await page.screenshot({ path: path.join(outDir, '01_network_initial_view.png'), fullPage: false });
  console.log('Captured 01_network_initial_view.png');

  // Verify scrolling ability on workspace body
  const scrollMetrics = await page.evaluate(() => {
    const root = document.querySelector('#tarka-workspace-body');
    if (!root) return { error: 'workspace body not found' };
    return {
      scrollHeight: root.scrollHeight,
      clientHeight: root.clientHeight,
      canScroll: root.scrollHeight > root.clientHeight
    };
  });
  console.log('Scroll metrics on 1366x768 (#tarka-workspace-body):', scrollMetrics);

  // Scroll down to check accessibility of bottom cards
  await page.evaluate(() => {
    const root = document.querySelector('#tarka-workspace-body');
    if (root) root.scrollTop = root.scrollHeight;
  });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(outDir, '02_network_scrolled_bottom.png'), fullPage: false });
  console.log('Captured 02_network_scrolled_bottom.png');

  // Scroll back to top
  await page.evaluate(() => {
    const root = document.querySelector('#tarka-workspace-body');
    if (root) root.scrollTop = 0;
  });
  await page.waitForTimeout(800);

  // Test Replay Step 1 (Primary Inflow)
  console.log('Clicking Step 1 (INFLOW ₹5L)...');
  await page.click('button:has-text("1: INFLOW ₹5L")');
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(outDir, '03_step_1_primary_inflow.png') });
  console.log('Captured 03_step_1_primary_inflow.png');

  // Test Replay Step 3 (Fan-Out)
  console.log('Clicking Step 3 (FAN-OUT)...');
  await page.click('button:has-text("3: FAN-OUT")');
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(outDir, '04_step_3_layering_fanout.png') });
  console.log('Captured 04_step_3_layering_fanout.png');

  // Test Replay Step 4 (Cashout)
  console.log('Clicking Step 4 (CASHOUT)...');
  await page.click('button:has-text("4: CASHOUT")');
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(outDir, '05_step_4_atm_cashout.png') });
  console.log('Captured 05_step_4_atm_cashout.png');

  // Test Replay Step 5 (Freeze 76%)
  console.log('Clicking Step 5 (FREEZE (76%))...');
  await page.click('button:has-text("5: FREEZE (76%)")');
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(outDir, '06_step_5_freeze_recovery.png') });
  console.log('Captured 06_step_5_freeze_recovery.png');

  // Test Cash Flow View Filter
  console.log('Clicking CASH FLOW (MONEY TRAIL) filter button...');
  await page.click('button:has-text("💰 CASH FLOW")');
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(outDir, '07_cash_flow_filter_view.png') });
  console.log('Captured 07_cash_flow_filter_view.png');

  // Test Matrix view
  console.log('Clicking Matrix view...');
  await page.click('button:has-text("Matrix")');
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(outDir, '08_matrix_view.png') });
  console.log('Captured 08_matrix_view.png');

  await browser.close();
  console.log('All Playwright tests completed successfully!');
}

verifyFraudNetwork().catch((err) => {
  console.error('Playwright verification failed:', err);
  process.exit(1);
});
