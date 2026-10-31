const { chromium } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

async function capture() {
  const dir = path.join(__dirname, 'screens', 'after');
  fs.mkdirSync(dir, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const viewports = [
    { width: 1920, height: 1080, name: '1920' },
    { width: 1680, height: 1050, name: '1680' },
    { width: 1440, height: 900, name: '1440' },
    { width: 1366, height: 768, name: '1366' },
  ];

  for (const vp of viewports) {
    const page = await browser.newPage({ viewport: { width: vp.width, height: vp.height } });
    await page.goto('http://127.0.0.1:5173/?view=intake', { waitUntil: 'networkidle' });
    // wait a moment for fonts and NumberFlow to settle
    await page.waitForTimeout(600);
    await page.screenshot({ path: path.join(dir, `intake-${vp.name}.png`) });
    await page.close();
  }

  // Capture Tampered state at 1920x1080
  {
    const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
    await page.goto('http://127.0.0.1:5173/?view=intake', { waitUntil: 'networkidle' });
    await page.waitForTimeout(400);
    // Click toggle tamper button
    const tamperBtn = await page.locator('button:has-text("Toggle Row #14 Tamper")');
    if (await tamperBtn.count() > 0) {
      await tamperBtn.click();
      await page.waitForTimeout(600);
      await page.screenshot({ path: path.join(dir, 'intake-tampered-1920.png') });
    }
    await page.close();
  }

  // Also capture other 3 screens at 1920x1080 to verify non-regression
  const otherViews = [
    { view: 'attribution', file: 'attribution-1920.png' },
    { view: 'taint-engine', file: 'taint-engine-1920.png' },
    { view: 'court-proof', file: 'court-proof-1920.png' },
  ];

  for (const item of otherViews) {
    const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
    await page.goto(`http://127.0.0.1:5173/?view=${item.view}`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(600);
    await page.screenshot({ path: path.join(dir, item.file) });
    await page.close();
  }

  await browser.close();
  console.log('After-screenshots captured successfully!');
}

capture().catch((err) => {
  console.error(err);
  process.exit(1);
});
