const { chromium } = require('e:/Tarka_v3/tarka/frontend/node_modules/playwright');
const path = require('path');

const outDir = 'C:/Users/User/.gemini/antigravity/brain/249cd97f-a6aa-46cc-9ccf-37d2236e6dbe';

async function testResolution(width, height, label) {
  console.log(`\nTesting Viewport: ${label} (${width}x${height})`);
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width, height } });

  const targetUrl = 'http://127.0.0.1:5173/?case=CASE-2026-001&nav=investigations&lens=Network&entity=P001&mode=2D&tab=dossier&level=0&view=intake';
  await page.goto(targetUrl, { timeout: 20000 });
  await page.waitForTimeout(2000);

  const scroll = await page.evaluate(() => {
    const doc = document.documentElement;
    return {
      scrollHeight: doc.scrollHeight,
      innerHeight: window.innerHeight,
      hasOuterScroll: doc.scrollHeight > window.innerHeight,
    };
  });
  console.log(`Layout fit ${label}: scrollHeight=${scroll.scrollHeight}, innerHeight=${scroll.innerHeight}, outerScroll=${scroll.hasOuterScroll}`);

  const outPath = path.join(outDir, `audit_screen1_intake_${label}.png`);
  await page.screenshot({ path: outPath });
  console.log(`Saved screenshot: ${outPath}`);

  await browser.close();
}

async function run() {
  await testResolution(1536, 864, '864p');
  await testResolution(1920, 1080, '1080p');
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
