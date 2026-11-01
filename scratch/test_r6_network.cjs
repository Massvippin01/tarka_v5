const { chromium } = require('e:/Tarka_v3/tarka/frontend/node_modules/playwright');
const path = require('path');

const outDir = 'C:/Users/User/.gemini/antigravity/brain/249cd97f-a6aa-46cc-9ccf-37d2236e6dbe';

async function run() {
  console.log('=== TARKA R6 MODULE A (NETWORK) PLAYWRIGHT AUDIT ===\n');
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

    await page.goto('http://127.0.0.1:5173/?view=network', { waitUntil: 'networkidle', timeout: 15000 });
    await page.waitForTimeout(1000);

    // 1. Metric Contract Check
    const scroll = await page.evaluate(() => {
      const doc = document.documentElement;
      return {
        scrollHeight: doc.scrollHeight,
        innerHeight: window.innerHeight,
        hasOuterScroll: doc.scrollHeight > window.innerHeight,
      };
    });
    console.log(`Layout fit: scrollHeight=${scroll.scrollHeight}, innerHeight=${scroll.innerHeight}, outerScroll=${scroll.hasOuterScroll}`);

    // 2. Lint Viz Check on Canvas
    const lintResult = await page.evaluate(() => {
      const el = document.querySelector('[data-lint]');
      return {
        dataLint: el?.getAttribute('data-lint'),
        heroPresent: !!document.querySelector('.hero-canvas-container'),
        nodeCount: document.querySelectorAll('.node-card, .evidence-hub').length,
        edgeCount: document.querySelectorAll('path.network-edge').length,
      };
    });
    console.log('Lint and Element Counts:', JSON.stringify(lintResult));

    // 3. Test Matrix View Toggle
    const matrixBtn = page.locator('button:has-text("Matrix")');
    if (await matrixBtn.count() > 0) {
      await matrixBtn.click();
      await page.waitForTimeout(300);
      const matrixRows = await page.locator('table tbody tr').count();
      console.log(`Matrix View: ${matrixRows} evidence rows rendered.`);
      // Switch back to graph
      await page.locator('button:has-text("Graph")').click();
      await page.waitForTimeout(300);
    }

    // 4. Screenshot
    const scPath = path.join(outDir, `r6_screen4_network_${res.label}.png`);
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

