const { chromium } = require('@playwright/test');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const routes = ['intake', 'attribution', 'taint-engine', 'court-proof'];

  for (const route of routes) {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    await page.goto(`http://127.0.0.1:5173/?view=${route}`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(400);

    const scrollInfo = await page.evaluate(() => {
      const bodyWrapper = document.querySelector('[style*="calc(100% - 44px)"]');
      return {
        wrapperOverflow: bodyWrapper ? window.getComputedStyle(bodyWrapper).overflowY : null,
        wrapperScrollHeight: bodyWrapper?.scrollHeight,
        wrapperClientHeight: bodyWrapper?.clientHeight,
        canScrollWrapper: bodyWrapper ? bodyWrapper.scrollHeight > bodyWrapper.clientHeight : false,
        docScrollHeight: document.documentElement.scrollHeight,
        docClientHeight: document.documentElement.clientHeight,
      };
    });

    console.log(`Route [${route}]:`, scrollInfo);
    await page.close();
  }

  await browser.close();
})();

