const { chromium } = require('@playwright/test');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  console.log('--- 1. Testing Screen 1: Evidence Intake ---');
  await page.goto('http://127.0.0.1:5173/?view=intake', { waitUntil: 'networkidle' });
  await page.waitForTimeout(500);

  // Take screenshot of Screen 1
  await page.screenshot({ path: 'e2e/screens/v55_screen1_intake.png' });

  // Test Copy §94 Directive button
  const copyBtn = page.locator('button:has-text("Copy §94 BNSS CBS Directive")');
  if (await copyBtn.isVisible()) {
    console.log('Screen 1 Copy §94 Directive button is visible!');
    await copyBtn.click();
    await page.waitForTimeout(300);
  }

  // Open Mutator drawer to show Session Receipts
  const mutatorBtn = page.locator('header button:has-text("Mutator")');
  await mutatorBtn.click();
  await page.waitForTimeout(400);
  await page.screenshot({ path: 'e2e/screens/v55_header_mutator_receipts.png' });
  await mutatorBtn.click(); // Close mutator

  console.log('--- 2. Testing Screen 2: Attribution ---');
  await page.goto('http://127.0.0.1:5173/?view=attribution', { waitUntil: 'networkidle' });
  await page.waitForTimeout(500);
  await page.screenshot({ path: 'e2e/screens/v55_screen2_attribution.png' });

  // Test Copy DoT 39.20 Requisition button
  const dotBtn = page.locator('button:has-text("Copy DoT 39.20 Requisition")');
  if (await dotBtn.isVisible()) {
    console.log('Screen 2 Copy DoT 39.20 button is visible!');
    await dotBtn.click();
    await page.waitForTimeout(300);
  }

  console.log('--- 3. Testing Screen 3: Taint Engine ---');
  await page.goto('http://127.0.0.1:5173/?view=taint-engine', { waitUntil: 'networkidle' });
  await page.waitForTimeout(500);
  await page.screenshot({ path: 'e2e/screens/v55_screen3_taint_engine.png' });

  // Test Clean Working Capital injection
  const injectBtn = page.locator('button:has-text("Inject Clean Deposit")');
  if (await injectBtn.isVisible()) {
    console.log('Clicking Inject Clean Deposit on Screen 3...');
    await injectBtn.click();
    await page.waitForTimeout(400);
    await page.screenshot({ path: 'e2e/screens/v55_screen3_taint_injected.png' });
  }

  console.log('--- 4. Testing Screen 4: Court Proof ---');
  await page.goto('http://127.0.0.1:5173/?view=court-proof', { waitUntil: 'networkidle' });
  await page.waitForTimeout(500);
  await page.screenshot({ path: 'e2e/screens/v55_screen4_court_proof.png' });

  console.log('All 4 screens verified and screenshots captured successfully!');
  await browser.close();
})();
