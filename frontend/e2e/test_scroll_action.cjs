const { chromium } = require('@playwright/test');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const routes = ['intake', 'attribution', 'taint-engine', 'court-proof'];

  for (const route of routes) {
    const page = await browser.newPage({ viewport: { width: 1440, height: 800 } });
    await page.goto(`http://127.0.0.1:5173/?view=${route}`, { waitUntil: 'networkidle' });

    // Test mouse wheel scroll on the workspace
    const initialScroll = await page.evaluate(() => {
      const el = document.getElementById('tarka-workspace-body');
      return {
        id: el?.id,
        scrollTop: el?.scrollTop,
        scrollHeight: el?.scrollHeight,
        clientHeight: el?.clientHeight,
        canScroll: el ? el.scrollHeight > el.clientHeight : false,
      };
    });

    // Dispatch mouse wheel
    await page.mouse.move(500, 400);
    await page.mouse.wheel(0, 500);
    await page.waitForTimeout(300);

    const afterWheelScroll = await page.evaluate(() => {
      const el = document.getElementById('tarka-workspace-body');
      return el?.scrollTop;
    });

    // Also test programmatically setting scrollTop
    await page.evaluate(() => {
      const el = document.getElementById('tarka-workspace-body');
      if (el) el.scrollTop = 300;
    });
    const afterManualScroll = await page.evaluate(() => {
      const el = document.getElementById('tarka-workspace-body');
      return el?.scrollTop;
    });

    console.log(`Page [${route}]:`, {
      initial: initialScroll,
      afterWheel: afterWheelScroll,
      afterManual: afterManualScroll,
    });

    await page.close();
  }

  await browser.close();
})();

