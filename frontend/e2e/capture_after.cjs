const { chromium } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

async function capture() {
  const dir = path.join(__dirname, 'screens', 'after');
  const artifactDir = 'C:\\Users\\User\\.gemini\\antigravity\\brain\\249cd97f-a6aa-46cc-9ccf-37d2236e6dbe';
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
    await page.goto('http://127.0.0.1:5173/?view=intake', { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('[data-card="kpi-card"]');
    await page.waitForTimeout(600);
    const localPath = path.join(dir, `intake-${vp.name}.png`);
    const artPath = path.join(artifactDir, `intake-${vp.name}.png`);
    await page.screenshot({ path: localPath });
    try { fs.copyFileSync(localPath, artPath); } catch (e) {}
    console.log(`Captured intake-${vp.name}.png`);
    await page.close();
  }

  // Capture Tampered state at 1920x1080
  {
    const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
    await page.goto('http://127.0.0.1:5173/?view=intake', { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('[data-card="kpi-card"]');
    await page.waitForTimeout(400);
    // Press 'T' to tamper Row #14
    await page.keyboard.press('t');
    await page.waitForTimeout(600);
    const localPath = path.join(dir, 'intake-tampered-1920.png');
    const artPath = path.join(artifactDir, 'intake-tampered-1920.png');
    await page.screenshot({ path: localPath });
    try { fs.copyFileSync(localPath, artPath); } catch (e) {}
    console.log('Captured intake-tampered-1920.png');
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
    await page.goto(`http://127.0.0.1:5173/?view=${item.view}`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(600);
    const localPath = path.join(dir, item.file);
    const artPath = path.join(artifactDir, item.file);
    await page.screenshot({ path: localPath });
    try { fs.copyFileSync(localPath, artPath); } catch (e) {}
    console.log(`Captured ${item.file}`);
    await page.close();
  }

  await browser.close();
  console.log('All screenshots captured and saved to artifacts successfully!');
}

capture().catch((err) => {
  console.error(err);
  process.exit(1);
});
