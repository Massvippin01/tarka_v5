const { chromium } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

const OUTPUT_DIR = path.resolve(__dirname, '../../docs/SUTRAM_PS04_DOCUMENTATION/17_COMPETITION_AND_PILOT_READINESS/screenshots');
const APP_BASE = 'http://127.0.0.1:5173';

async function captureRemaining() {
  const browser = await chromium.launch({ headless: true });

  // 1. Desktop Intake (1440x900)
  {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    await page.goto(`${APP_BASE}/?view=intake`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1500);
    await page.screenshot({ path: path.join(OUTPUT_DIR, 'intake_desktop_1440x900.png'), timeout: 10000 });
    console.log('✓ Captured intake_desktop_1440x900.png');
    await page.close();
  }

  // 2. Tablet Intake (768x1024)
  {
    const page = await browser.newPage({ viewport: { width: 768, height: 1024 } });
    await page.goto(`${APP_BASE}/?view=intake`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1500);
    await page.screenshot({ path: path.join(OUTPUT_DIR, 'intake_tablet_768x1024.png'), timeout: 10000 });
    console.log('✓ Captured intake_tablet_768x1024.png');
    await page.close();
  }

  // 3. Mobile Intake (390x844)
  {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    await page.goto(`${APP_BASE}/?view=intake`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1500);
    await page.screenshot({ path: path.join(OUTPUT_DIR, 'intake_mobile_390x844.png'), timeout: 10000 });
    console.log('✓ Captured intake_mobile_390x844.png');
    await page.close();
  }

  // 4. Mobile Attribution (390x844)
  {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    await page.goto(`${APP_BASE}/?view=attribution`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1500);
    await page.screenshot({ path: path.join(OUTPUT_DIR, 'attribution_mobile_390x844.png'), timeout: 10000 });
    console.log('✓ Captured attribution_mobile_390x844.png');
    await page.close();
  }

  await browser.close();
  console.log('Remaining captures complete.');
}

captureRemaining().catch((e) => {
  console.error('Error in captureRemaining:', e);
});

