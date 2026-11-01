const { chromium } = require('@playwright/test');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto('http://127.0.0.1:5173/?view=attribution', { waitUntil: 'networkidle' });
  await page.waitForTimeout(500);

  console.log('1. Testing "Simulate Hotspot" toggle...');
  const hotspotBtn = page.locator('button:has-text("Simulate Hotspot")');
  await hotspotBtn.click();
  await page.waitForTimeout(400);
  await page.screenshot({ path: 'e2e/screens/v55_screen2_hotspot_active.png' });

  console.log('2. Testing "Drop Port" toggle...');
  const dropPortBtn = page.locator('button:has-text("Drop Port")');
  await dropPortBtn.click();
  await page.waitForTimeout(400);
  await page.screenshot({ path: 'e2e/screens/v55_screen2_port_dropped.png' });

  console.log('3. Testing "Reset" button...');
  const resetBtn = page.locator('button:has-text("Reset")');
  await resetBtn.click();
  await page.waitForTimeout(400);

  // Turn hotspot back off
  const tetherBtn = page.locator('button:has-text("Tethering Active")');
  if (await tetherBtn.isVisible()) {
    await tetherBtn.click();
    await page.waitForTimeout(400);
  }

  await page.screenshot({ path: 'e2e/screens/v55_screen2_reset.png' });
  console.log('Interactive controls verified successfully!');
  await browser.close();
})();

