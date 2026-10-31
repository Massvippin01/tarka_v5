const { chromium } = require('@playwright/test');
(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto('http://127.0.0.1:5173/?view=intake', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(500);

  const heights = await page.evaluate(() => {
    const root = document.querySelector('.tarka-intake-root');
    const row1 = document.querySelector('[aria-label="Key Forensic Metrics"]');
    const row2 = document.querySelector('[aria-label="Falsification Gate Pipeline"]');
    const main = document.querySelector('main');
    const group = document.querySelector('#tarka-intake-panels-group');
    const ledgerPanel = document.querySelector('#ledger-resizable-panel');
    const ledgerCard = document.querySelector('[data-card="ledger-card"]');
    const inspectorPanel = document.querySelector('#inspector-resizable-panel');
    const dockCard = document.querySelector('[data-card="inspector-dock"]');

    return {
      windowHeight: window.innerHeight,
      rootHeight: root?.getBoundingClientRect().height,
      row1Height: row1?.getBoundingClientRect().height,
      row2Height: row2?.getBoundingClientRect().height,
      mainHeight: main?.getBoundingClientRect().height,
      groupHeight: group?.getBoundingClientRect().height,
      ledgerPanelHeight: ledgerPanel?.getBoundingClientRect().height,
      ledgerCardHeight: ledgerCard?.getBoundingClientRect().height,
      inspectorPanelHeight: inspectorPanel?.getBoundingClientRect().height,
      dockCardHeight: dockCard?.getBoundingClientRect().height,
    };
  });

  console.log('Heights breakdown:', heights);
  await browser.close();
})();

