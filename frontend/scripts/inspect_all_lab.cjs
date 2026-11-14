const { chromium } = require('playwright');
const path = require('path');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const outDir = 'C:/Users/massv/.gemini/antigravity/brain/285293fd-af45-419a-9453-484e5e3dc2e1';

  // 1. Court Proof Screen
  await page.goto('http://localhost:5173/?case=CASE-2026-001&view=court', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(outDir, 'lab_01_court.png') });

  // 2. Privacy & ZKP
  await page.goto('http://localhost:5173/?case=CASE-2026-001&view=privacy', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(outDir, 'lab_02_privacy.png') });

  // 3. Workstation
  await page.goto('http://localhost:5173/?case=CASE-2026-001&view=workstation', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(outDir, 'lab_03_workstation.png') });

  // 4. Benchmarks
  await page.goto('http://localhost:5173/?case=CASE-2026-001&view=benchmarks', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(outDir, 'lab_04_benchmarks.png') });

  console.log('All 4 lab screens captured');
  await browser.close();
})();
