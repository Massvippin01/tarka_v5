const { chromium } = require('@playwright/test');
(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto('http://127.0.0.1:5173/?view=intake', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(500);

  const styleInfo = await page.evaluate(() => {
    const root = document.querySelector('.tarka-intake-root');
    const main = document.querySelector('main');
    return {
      rootStyle: {
        display: window.getComputedStyle(root).display,
        gridTemplateRows: window.getComputedStyle(root).gridTemplateRows,
        height: window.getComputedStyle(root).height,
        alignContent: window.getComputedStyle(root).alignContent,
        justifyContent: window.getComputedStyle(root).justifyContent,
      },
      mainStyle: {
        height: window.getComputedStyle(main).height,
        flex: window.getComputedStyle(main).flex,
        alignSelf: window.getComputedStyle(main).alignSelf,
      }
    };
  });

  console.log('Style Info:', JSON.stringify(styleInfo, null, 2));
  await browser.close();
})();

