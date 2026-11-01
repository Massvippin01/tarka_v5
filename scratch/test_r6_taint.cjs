const { chromium } = require('e:/Tarka_v3/tarka/frontend/node_modules/playwright');
const path = require('path');

const outDir = 'C:/Users/User/.gemini/antigravity/brain/249cd97f-a6aa-46cc-9ccf-37d2236e6dbe';

async function run() {
  console.log('=== TARKA R6 MODULE B & C (TAINT & RECOVERY) PLAYWRIGHT AUDIT ===\n');
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

    page.on('console', msg => {
      if (msg.text().includes('LINT') || msg.text().includes('VIOLATION')) {
        console.log('PAGE LOG:', msg.text());
      }
    });

    await page.goto('http://127.0.0.1:5173/?view=taint-engine', { waitUntil: 'networkidle', timeout: 15000 });
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
        ribbonCount: document.querySelectorAll('path.sankey-ribbon').length,
        nodeCount: document.querySelectorAll('.sankey-node').length,
      };
    });
    console.log('Lint and Element Counts:', JSON.stringify(lintResult));

    // 3. Test Clicking a Node to trigger Node Drawer
    const rohitNode = page.locator('g.sankey-node:has-text("Rohit Verma")');
    if (await rohitNode.count() > 0) {
      await rohitNode.click();
      await page.waitForTimeout(400);
      const isDrawerOpen = await page.evaluate(() => {
        return document.body.textContent.includes('Layer-2A Split Conduit') || document.body.textContent.includes('Target Account Dossier');
      });
      console.log('Node Drawer opened on click:', isDrawerOpen);

      // Close drawer
      const closeBtn = page.locator('button:has(svg.lucide-x)');
      if (await closeBtn.count() > 0) {
        await closeBtn.click();
        await page.waitForTimeout(300);
      }
    }

    // 4. Test K slider (Click K=1 then K=3)
    const k1Btn = page.locator('button:text-is("1")');
    if (await k1Btn.count() > 0) {
      await k1Btn.click();
      await page.waitForTimeout(300);
      const k1Scissors = await page.locator('svg.lucide-scissors').count();
      console.log(`K=1 active: ${k1Scissors} scissor cut markers rendered.`);
    }

    const k3Btn = page.locator('button:text-is("★3")');
    if (await k3Btn.count() > 0) {
      await k3Btn.click();
      await page.waitForTimeout(300);
      const k3Scissors = await page.locator('svg.lucide-scissors').count();
      console.log(`K=3 active: ${k3Scissors} scissor cut markers rendered.`);
    }

    // 5. Screenshot
    const scPath = path.join(outDir, `r6_screen5_taint_${res.label}.png`);
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
