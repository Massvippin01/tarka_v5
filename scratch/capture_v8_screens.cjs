const { chromium } = require('e:/Tarka_v3/tarka/frontend/node_modules/playwright');
const path = require('path');

const views = [
  { id: '01_intake', view: 'intake', name: 'v8_screen1_intake.png' },
  { id: '02_entities', view: 'entities', name: 'v8_screen2_entities.png' },
  { id: '03_attribution', view: 'attribution', name: 'v8_screen3_attribution.png' },
  { id: '04_network', view: 'network', name: 'v8_screen4_network.png' },
  { id: '05_taint', view: 'taint-engine', name: 'v8_screen5_taint.png' },
  { id: '06_courtproof', view: 'court-proof', name: 'v8_screen6_courtproof.png' },
];

const outDir = 'C:/Users/User/.gemini/antigravity/brain/249cd97f-a6aa-46cc-9ccf-37d2236e6dbe';

async function run() {
  const browser = await chromium.launch({ headless: true });
  const resolutions = [
    { width: 1920, height: 1080, label: '1080p' },
    { width: 1536, height: 864, label: '864p' },
    { width: 1366, height: 768, label: '768p' },
  ];

  for (const res of resolutions) {
    console.log(`\n=== Testing Viewport: ${res.label} (${res.width}x${res.height}) ===`);
    const page = await browser.newPage({
      viewport: { width: res.width, height: res.height },
      deviceScaleFactor: 1,
    });

    for (const v of views) {
      const url = `http://127.0.0.1:5173/?view=${v.view}`;
      await page.goto(url, { waitUntil: 'networkidle', timeout: 15000 });
      await page.waitForTimeout(600);

      const metrics = await page.evaluate(() => {
        const doc = document.documentElement;
        return {
          docScrollHeight: doc.scrollHeight,
          docClientHeight: doc.clientHeight,
          windowInnerHeight: window.innerHeight,
          hasOuterScroll: doc.scrollHeight > window.innerHeight,
          bodyScrollHeight: document.body.scrollHeight,
        };
      });

      console.log(`[${v.id}] ${url}:`);
      console.log(`  scrollHeight=${metrics.docScrollHeight}, innerHeight=${metrics.windowInnerHeight}, hasOuterScroll=${metrics.hasOuterScroll}`);

      if (res.label === '1080p') {
        const screenshotPath = path.join(outDir, v.name);
        await page.screenshot({ path: screenshotPath, fullPage: false });
        console.log(`  Saved screenshot: ${screenshotPath}`);
      }
    }
    await page.close();
  }

  await browser.close();
  console.log('\nAll captures & layout contract checks complete!');
}

run().catch(err => {
  console.error('Error running capture:', err);
  process.exit(1);
});

