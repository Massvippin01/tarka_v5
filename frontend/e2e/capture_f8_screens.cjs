const { chromium } = require('@playwright/test');
const path = require('path');
const fs = require('fs');

async function capture() {
  const outDir = path.join(__dirname, '../../docs/progress/f8');
  fs.mkdirSync(outDir, { recursive: true });

  const browser = await chromium.launch({ headless: true });

  // 1. Health Diagnostics Screen (1440x900)
  const page1440 = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page1440.goto('http://localhost:5173/?view=health');
  await page1440.waitForLoadState('domcontentloaded');
  await page1440.waitForTimeout(2000);
  const healthPath1440 = path.join(outDir, 'f8_01_health_page_1440.png');
  await page1440.screenshot({ path: healthPath1440, fullPage: false });
  console.log(`[Captured] ${healthPath1440}`);

  // 2. Demo User Modal (1440x900)
  const pageModal = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await pageModal.goto('http://localhost:5173/?case=CASE-2026-001&view=intake');
  await pageModal.waitForLoadState('domcontentloaded');
  await pageModal.waitForTimeout(1500);

  const avatar = pageModal.locator('[data-testid="sidebar-io-avatar"]');
  if (await avatar.isVisible()) {
    await avatar.click();
    await pageModal.waitForTimeout(800);
    const modalPath = path.join(outDir, 'f8_02_demo_user_modal_1440.png');
    await pageModal.screenshot({ path: modalPath, fullPage: false });
    console.log(`[Captured] ${modalPath}`);
  }
  await pageModal.close();

  // 3. 404 View Not Found Screen (1440x900)
  await page1440.goto('http://localhost:5173/?view=non-existent-xyz');
  await page1440.waitForLoadState('domcontentloaded');
  await page1440.waitForTimeout(1000);
  const notFoundPath = path.join(outDir, 'f8_03_view_not_found_1440.png');
  await page1440.screenshot({ path: notFoundPath, fullPage: false });
  console.log(`[Captured] ${notFoundPath}`);

  // 4. Health Diagnostics Screen (1366x768)
  const page1366 = await browser.newPage({ viewport: { width: 1366, height: 768 } });
  await page1366.goto('http://localhost:5173/?view=health');
  await page1366.waitForLoadState('domcontentloaded');
  await page1366.waitForTimeout(1500);
  const healthPath1366 = path.join(outDir, 'f8_04_health_page_1366.png');
  await page1366.screenshot({ path: healthPath1366, fullPage: false });
  console.log(`[Captured] ${healthPath1366}`);

  await browser.close();
}

capture().catch((e) => {
  console.error(e);
  process.exit(1);
});
