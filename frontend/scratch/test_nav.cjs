const { chromium } = require('@playwright/test');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });

  console.log('Testing Screen 1 with separate page...');
  const page1 = await context.newPage();
  await page1.goto('http://127.0.0.1:5173/?view=intake');
  await page1.waitForTimeout(500);
  console.log('Screen 1 loaded!');
  await page1.close();

  console.log('Testing Screen 2 with fresh page...');
  const page2 = await context.newPage();
  await page2.goto('http://127.0.0.1:5173/?view=attribution');
  await page2.waitForTimeout(500);
  console.log('Screen 2 loaded!');
  await page2.close();

  console.log('Testing Screen 3 with fresh page...');
  const page3 = await context.newPage();
  await page3.goto('http://127.0.0.1:5173/?view=taint-engine');
  await page3.waitForTimeout(500);
  console.log('Screen 3 loaded!');
  await page3.close();

  console.log('Testing Screen 4 with fresh page...');
  const page4 = await context.newPage();
  await page4.goto('http://127.0.0.1:5173/?view=court-proof');
  await page4.waitForTimeout(500);
  console.log('Screen 4 loaded!');
  await page4.close();

  console.log('All 4 screens loaded cleanly with separate pages!');
  await browser.close();
})();

