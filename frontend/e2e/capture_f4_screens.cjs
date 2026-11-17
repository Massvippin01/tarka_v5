const { chromium } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

const ARTIFACT_DIR = path.resolve('C:/Users/massv/.gemini/antigravity/brain/285293fd-af45-419a-9453-484e5e3dc2e1');
const PROGRESS_DIR = path.resolve('docs/progress/f4');

if (!fs.existsSync(PROGRESS_DIR)) {
  fs.mkdirSync(PROGRESS_DIR, { recursive: true });
}

async function run() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 }
  });
  const page = await context.newPage();

  console.log('Navigating to Case 001 Actions tab...');
  await page.goto('http://localhost:5173/?case=CASE-2026-001&view=actions', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(3000);

  // Capture screen 1: Actions & Freeze recommendations
  const shot1 = path.join(PROGRESS_DIR, 'f4_01_actions_screen_1440.png');
  await page.screenshot({ path: shot1, fullPage: false });
  console.log(`Saved: ${shot1}`);

  // Click Simulate Bank Response button
  console.log('Clicking Simulate Bank Response...');
  const simBtn = page.locator('button:has-text("Simulate Bank Response")');
  if (await simBtn.isVisible()) {
    await simBtn.click();
    await page.waitForTimeout(2000);
  }

  // Capture screen 2: Frozen propagation
  const shot2 = path.join(PROGRESS_DIR, 'f4_02_bank_frozen_propagation_1440.png');
  await page.screenshot({ path: shot2, fullPage: false });
  console.log(`Saved: ${shot2}`);

  // Navigate to formal report / dossier tab to show Section 6
  console.log('Navigating to Formal Report & Court Dossier...');
  const reportTab = page.locator('button:has-text("Formal Investigation Report")');
  if (await reportTab.isVisible()) {
    await reportTab.click();
    await page.waitForTimeout(1500);
  }

  // Scroll down to Section 6: Statutory Actions Taken
  await page.evaluate(() => {
    window.scrollBy(0, 1200);
  });
  await page.waitForTimeout(1000);

  const shot3 = path.join(PROGRESS_DIR, 'f4_03_report_actions_taken_1440.png');
  await page.screenshot({ path: shot3, fullPage: false });
  console.log(`Saved: ${shot3}`);

  await browser.close();

  // Copy to artifact directory
  [
    'f4_01_actions_screen_1440.png',
    'f4_02_bank_frozen_propagation_1440.png',
    'f4_03_report_actions_taken_1440.png',
  ].forEach(file => {
    const src = path.join(PROGRESS_DIR, file);
    const dst = path.join(ARTIFACT_DIR, file);
    if (fs.existsSync(src)) {
      fs.copyFileSync(src, dst);
      console.log(`Copied ${file} to artifacts directory`);
    }
  });

  console.log('Capture F4 screens complete.');
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
