const { chromium } = require('@playwright/test');
(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto('http://127.0.0.1:5173/?view=intake', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(500);

  const displayStates = await page.evaluate(() => {
    const contents = document.querySelectorAll('[role="tabpanel"]');
    return Array.from(contents).map(c => ({
      id: c.getAttribute('id'),
      dataState: c.getAttribute('data-state'),
      hidden: c.hasAttribute('hidden'),
      computedDisplay: window.getComputedStyle(c).display,
      height: c.getBoundingClientRect().height
    }));
  });

  console.log('Tab panels display states:', JSON.stringify(displayStates, null, 2));
  await browser.close();
})();

