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

  console.log('Navigating to Screen 02 Entities (?view=entities)...');
  await page.goto('http://127.0.0.1:5173/?view=entities', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);

  const scrollCheck = await page.evaluate(() => {
    return {
      bodyScrollHeight: document.body.scrollHeight,
      bodyClientHeight: document.body.clientHeight,
      docScrollHeight: document.documentElement.scrollHeight,
      docClientHeight: document.documentElement.clientHeight,
      hasOuterScroll: document.documentElement.scrollHeight > document.documentElement.clientHeight
    };
  });
  console.log('Scroll Check:', scrollCheck);

  const outDir = path.join(__dirname, '../e2e/screens');
  const shotPath = path.join(outDir, 'v7_screen2_entities.png');
  await page.screenshot({ path: shotPath, fullPage: false });
  console.log('Saved:', shotPath);

  const brainPath = 'C:/Users/User/.gemini/antigravity/brain/249cd97f-a6aa-46cc-9ccf-37d2236e6dbe/v7_screen2_entities.png';
  fs.copyFileSync(shotPath, brainPath);
  console.log('Copied to brain artifact.');

  await browser.close();
}

run().catch(console.error);

