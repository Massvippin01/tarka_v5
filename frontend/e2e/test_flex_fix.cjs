const { chromium } = require('@playwright/test');
(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto('http://127.0.0.1:5173/?view=intake', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(500);

  // Apply flex fix
  await page.evaluate(() => {
    const root = document.querySelector('.tarka-intake-root');
    root.style.display = 'flex';
    root.style.flexDirection = 'column';

    const main = document.querySelector('main');
    main.style.flex = '1 1 0%';
    main.style.minHeight = '0';
    main.style.height = 'auto';
  });

  const heights = await page.evaluate(() => {
    const root = document.querySelector('.tarka-intake-root');
    const main = document.querySelector('main');
    const ledger = document.querySelector('[data-card="ledger-card"]');
    const dock = document.querySelector('[data-card="inspector-dock"]');
    const panel = document.querySelector('[role="tabpanel"][data-state="active"]');

    return {
      rootHeight: root.getBoundingClientRect().height,
      mainHeight: main.getBoundingClientRect().height,
      ledgerHeight: ledger.getBoundingClientRect().height,
      dockHeight: dock.getBoundingClientRect().height,
      activeTabPanelHeight: panel?.getBoundingClientRect().height,
    };
  });

  console.log('Heights after Flex Fix:', heights);
  await browser.close();
})();

