const { chromium } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

const ARTIFACT_DIR = path.resolve('C:/Users/massv/.gemini/antigravity/brain/285293fd-af45-419a-9453-484e5e3dc2e1');
const PROGRESS_DIR = path.resolve('docs/progress/f5');

if (!fs.existsSync(PROGRESS_DIR)) {
  fs.mkdirSync(PROGRESS_DIR, { recursive: true });
}

async function run() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 }
  });
  const page = await context.newPage();

  console.log('Navigating to Settings view (?view=settings)...');
  await page.goto('http://localhost:5173/?case=CASE-2026-001&view=settings', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2000);

  // Capture screen 1: Profile & Operational Role
  const shot1 = path.join(PROGRESS_DIR, 'f5_01_settings_profile_role_1440.png');
  await page.screenshot({ path: shot1, fullPage: false });
  console.log(`Saved: ${shot1}`);

  // Switch to Station & Jurisdictional Letterhead tab
  console.log('Clicking Station & Letterhead tab...');
  const stationTab = page.locator('button:has-text("Station & Jurisdictional Letterhead"), button:has-text("थाना एवं क्षेत्राधिकार")').first();
  if (await stationTab.isVisible()) {
    await stationTab.click();
    await page.waitForTimeout(1000);
  }

  // Capture screen 2: Station & Letterhead
  const shot2 = path.join(PROGRESS_DIR, 'f5_02_settings_station_letterhead_1440.png');
  await page.screenshot({ path: shot2, fullPage: false });
  console.log(`Saved: ${shot2}`);

  // Switch to AI Engine & Scoring Weights tab
  console.log('Clicking AI Engine & Scoring Weights tab...');
  const aiTab = page.locator('button:has-text("AI Engine & Mule Detection"), button:has-text("एआई इंजन")').first();
  if (await aiTab.isVisible()) {
    await aiTab.click();
    await page.waitForTimeout(1000);
  }

  // Capture screen 3: AI & Scoring Weights
  const shot3 = path.join(PROGRESS_DIR, 'f5_03_settings_ai_weights_1440.png');
  await page.screenshot({ path: shot3, fullPage: false });
  console.log(`Saved: ${shot3}`);

  // Switch to Data & Demo tab
  console.log('Clicking Data Architecture & Demo tab...');
  const dataTab = page.locator('button:has-text("Data Architecture & Demo"), button:has-text("डेटा वास्तुकला")').first();
  if (await dataTab.isVisible()) {
    await dataTab.click();
    await page.waitForTimeout(1000);
  }

  // Capture screen 4: Data & Demo
  const shot4 = path.join(PROGRESS_DIR, 'f5_04_settings_data_demo_1440.png');
  await page.screenshot({ path: shot4, fullPage: false });
  console.log(`Saved: ${shot4}`);

  // Navigate to Report screen to verify live letterhead reflection
  console.log('Navigating to Report view to verify letterhead propagation...');
  await page.goto('http://localhost:5173/?case=CASE-2026-001&view=report&tab=dossier', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2000);

  const shot5 = path.join(PROGRESS_DIR, 'f5_05_report_letterhead_reflection_1440.png');
  await page.screenshot({ path: shot5, fullPage: false });
  console.log(`Saved: ${shot5}`);

  await browser.close();

  // Copy to brain artifacts directory
  [
    'f5_01_settings_profile_role_1440.png',
    'f5_02_settings_station_letterhead_1440.png',
    'f5_03_settings_ai_weights_1440.png',
    'f5_04_settings_data_demo_1440.png',
    'f5_05_report_letterhead_reflection_1440.png',
  ].forEach(file => {
    const src = path.join(PROGRESS_DIR, file);
    const dst = path.join(ARTIFACT_DIR, file);
    if (fs.existsSync(src)) {
      fs.copyFileSync(src, dst);
      console.log(`Copied ${file} to artifacts directory`);
    }
  });

  console.log('Capture F5 screens complete.');
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});

