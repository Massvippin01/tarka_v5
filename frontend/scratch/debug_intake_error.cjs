const { chromium } = require('@playwright/test');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.log('BROWSER ERROR:', msg.text());
    }
  });

  page.on('pageerror', err => {
    console.log('PAGE ERROR:', err.message, err.stack);
  });

  try {
    await page.goto('http://127.0.0.1:5173/?view=intake', { timeout: 10000 });
    console.log('Page loaded successfully');
  } catch (e) {
    console.log('Navigation caught error:', e.message);
  }

  await browser.close();
})();

