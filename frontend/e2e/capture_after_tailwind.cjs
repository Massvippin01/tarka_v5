const { chromium } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

const outDir = path.resolve(__dirname, '../../docs/redesign/after-tailwind');
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

const views = [
  'workspace',
  'cases',
  'evidence',
  'people',
  'money',
  'network',
  'device',
  'actions',
  'settings',
  'health',
  'lab',
];

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  const errors = [];
  page.on('pageerror', (err) => errors.push(err.message));

  console.log('Capturing after-tailwind screenshots at 1440x900...');

  for (const view of views) {
    const url = `http://localhost:5173/?case=CASE-2026-001&view=${view}`;
    await page.goto(url, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1200);

    const shotPath = path.join(outDir, `${view}.png`);
    await page.screenshot({ path: shotPath });

    // Inspect layout
    const railWidth = await page.evaluate(() => {
      const rail = document.querySelector('.v6-rail') || document.querySelector('aside');
      return rail ? window.getComputedStyle(rail).width : '0px';
    });

    const hasGrid = await page.evaluate(() => {
      const main = document.querySelector('.v6-main') || document.querySelector('main');
      if (!main) return false;
      const el = main.querySelector('.grid, [style*="grid"]');
      return el ? window.getComputedStyle(el).display === 'grid' : false;
    });

    const pageHeight = await page.evaluate(() => document.documentElement.scrollHeight);

    console.log(`[SAVED] ${view}.png | Rail: ${railWidth} | Grid: ${hasGrid} | ScrollHeight: ${pageHeight}px`);
  }

  await browser.close();
  if (errors.length > 0) {
    console.error('Page errors encountered:', errors);
  } else {
    console.log('All 11 screenshots captured cleanly with 0 page errors!');
  }
})();
