const { chromium } = require('@playwright/test');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto('http://127.0.0.1:5173/?view=intake', { waitUntil: 'networkidle' });

  // Click Proof tab
  await page.click('button[role="tab"]:has-text("Proof")');
  await page.waitForTimeout(200);

  // Click Tamper Row #14 Balance button in Proof tab
  const tamperBtn = page.locator('button:has-text("Tamper Row #14 Balance")');
  console.log('Tamper button visible in Proof tab:', await tamperBtn.isVisible());
  await tamperBtn.click();
  await page.waitForTimeout(300);

  // Check if Row 14 is tampered
  const kpiText = await page.locator('text=Row #14 Fail').isVisible();
  console.log('Row #14 Fail KPI visible:', kpiText);

  // Take screenshot of tampered Proof tab
  await page.screenshot({ path: 'e2e/test_proof_tampered.png' });
  await browser.close();
  console.log('Proof tab action tested successfully');
})();

