const { chromium } = require('e:/Tarka_v3/tarka/frontend/node_modules/playwright');
const path = require('path');

const outDir = 'C:/Users/User/.gemini/antigravity/brain/249cd97f-a6aa-46cc-9ccf-37d2236e6dbe';

async function run() {
  console.log('=== TARKA R6 MODULE ATTRIBUTION PLAYWRIGHT AUDIT ===\n');
  const browser = await chromium.launch({ headless: true });

  const resolutions = [
    { width: 1920, height: 1080, label: '1080p' },
    { width: 1536, height: 864, label: '864p' },
  ];

  for (const res of resolutions) {
    console.log(`\nTesting Viewport: ${res.label} (${res.width}x${res.height})`);
    const page = await browser.newPage({
      viewport: { width: res.width, height: res.height },
      deviceScaleFactor: 1,
    });

    await page.goto('http://127.0.0.1:5173/?view=attribution', { waitUntil: 'networkidle', timeout: 15000 });
    await page.waitForTimeout(1000);

    const scroll = await page.evaluate(() => {
      const doc = document.documentElement;
      return {
        scrollHeight: doc.scrollHeight,
        innerHeight: window.innerHeight,
        hasOuterScroll: doc.scrollHeight > window.innerHeight,
      };
    });
    console.log(`Layout fit: scrollHeight=${scroll.scrollHeight}, innerHeight=${scroll.innerHeight}, outerScroll=${scroll.hasOuterScroll}`);

    const scPath = path.join(outDir, `r6_screen3_attribution_${res.label}.png`);
    await page.screenshot({ path: scPath, fullPage: false });
    console.log(`Saved screenshot: ${scPath}`);

    await page.close();
  }

  await browser.close();
  console.log('\n=== AUDIT COMPLETE ===');
}

run().catch((err) => {
  console.error('Audit failed:', err);
  process.exit(1);
});
