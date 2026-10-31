const { chromium } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

async function capture() {
  const dir = path.join(__dirname, 'screens', 'before');
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
    await page.screenshot({ path: path.join(dir, `intake-${vp.name}.png`) });
    await page.close();
  }

  // Also capture other 3 screens at 1920x1080 to verify non-regression later
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  await page.goto('http://127.0.0.1:5173/?view=attribution', { waitUntil: 'networkidle' });
  await page.screenshot({ path: path.join(dir, 'attribution-1920.png') });
  await page.goto('http://127.0.0.1:5173/?view=taint-engine', { waitUntil: 'networkidle' });
  await page.screenshot({ path: path.join(dir, 'taint-engine-1920.png') });
  await page.goto('http://127.0.0.1:5173/?view=court-proof', { waitUntil: 'networkidle' });
  await page.screenshot({ path: path.join(dir, 'court-proof-1920.png') });
  await page.close();

  await browser.close();
  console.log('Before-screenshots captured successfully!');
}

capture().catch((err) => {
  console.error(err);
  process.exit(1);
});
