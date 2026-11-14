const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  const outDir = path.resolve(__dirname, '../../docs/progress/f6');
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  console.log('Navigating to Command Center Dashboard...');
  await page.goto('http://localhost:5173/?view=workspace', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2500);

  // 1. Full Dashboard Command Center (1440x900)
  console.log('Capturing f6_01_dashboard_command_center_1440.png...');
  await page.screenshot({ path: path.join(outDir, 'f6_01_dashboard_command_center_1440.png'), fullPage: false });

  // 2. Act Now Queue focus (1440x900)
  console.log('Capturing f6_02_act_now_queue_1440.png...');
  const queueLocator = page.locator('[data-testid="act-now-queue-card"]');
  if (await queueLocator.count() > 0) {
    await queueLocator.screenshot({ path: path.join(outDir, 'f6_02_act_now_queue_1440.png') });
  }

  // 3. India Syndicate Map focus (1440x900)
  console.log('Capturing f6_03_india_syndicate_map_1440.png...');
  const mapLocator = page.locator('[data-testid="india-syndicate-map"]');
  if (await mapLocator.count() > 0) {
    await mapLocator.screenshot({ path: path.join(outDir, 'f6_03_india_syndicate_map_1440.png') });
  }

  // 4. Viewport 1366x768
  await page.setViewportSize({ width: 1366, height: 768 });
  await page.waitForTimeout(1000);
  console.log('Capturing f6_04_dashboard_command_center_1366.png...');
  await page.screenshot({ path: path.join(outDir, 'f6_04_dashboard_command_center_1366.png'), fullPage: false });

  await browser.close();
  console.log('F6 Screenshots captured successfully.');
})();
