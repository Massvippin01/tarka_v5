const { chromium } = require('@playwright/test');
(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto('http://127.0.0.1:5173/?view=intake', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(500);

  const tabs = ['RRN Lab', 'PDF', 'Privacy', 'Proof'];
  for (const t of tabs) {
    await page.click(`button[role="tab"]:has-text("${t}")`);
    await page.waitForTimeout(150);
    const details = await page.evaluate(() => {
      const dock = document.querySelector('[data-card="inspector-dock"]');
      const panel = document.querySelector('[role="tabpanel"][data-state="active"]');
      return {
        dockHeight: dock?.getBoundingClientRect().height,
        panelHeight: panel?.getBoundingClientRect().height,
        panelScrollHeight: panel?.scrollHeight,
        panelClientHeight: panel?.clientHeight,
        hasScrollbar: panel ? panel.scrollHeight > panel.clientHeight : false,
      };
    });
    console.log(`Tab ${t}:`, details);
  }

  await browser.close();
})();

