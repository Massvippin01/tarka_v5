const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

async function run() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    deviceScaleFactor: 1
  });
  const page = await context.newPage();

  console.log('Navigating to Screen 05 Transaction Flow & Mule DAG (?view=taint-engine)...');
  await page.goto('http://127.0.0.1:5173/?view=taint-engine', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);

  const outDir = path.join(__dirname, '../e2e/screens');
  const shotPath = path.join(outDir, 'v7_screen5_taint.png');
  await page.screenshot({ path: shotPath, fullPage: false });
  console.log('Saved:', shotPath);

  const brainPath = 'C:/Users/User/.gemini/antigravity/brain/249cd97f-a6aa-46cc-9ccf-37d2236e6dbe/v7_screen5_taint.png';
  fs.copyFileSync(shotPath, brainPath);
  console.log('Copied to brain artifact.');

  await browser.close();
}

run().catch(console.error);

