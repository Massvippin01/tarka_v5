const { chromium } = require('@playwright/test');
(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto('http://127.0.0.1:5173/?view=intake', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(500);

  // Check RRN Lab
  console.log('--- Checking RRN Lab ---');
  await page.click('button[role="tab"]:has-text("RRN Lab")');
  await page.waitForTimeout(200);

  const rrnDetails = await page.evaluate(() => {
    const dock = document.querySelector('[data-card="inspector-dock"]');
    const panel = document.querySelector('[role="tabpanel"][data-state="active"]');
    return {
      dockHeight: dock.getBoundingClientRect().height,
      panelHeight: panel.getBoundingClientRect().height,
      panelScrollHeight: panel.scrollHeight,
      panelClientHeight: panel.clientHeight,
      hasScrollbar: panel.scrollHeight > panel.clientHeight,
    };
  });
  console.log('RRN Details:', rrnDetails);

  // Check Proof Tab
  console.log('\n--- Checking Proof Tab ---');
  await page.click('button[role="tab"]:has-text("Proof")');
  await page.waitForTimeout(200);

  const proofDetails = await page.evaluate(() => {
    const dock = document.querySelector('[data-card="inspector-dock"]');
    const panel = document.querySelector('[role="tabpanel"][data-state="active"]');
    return {
      dockHeight: dock.getBoundingClientRect().height,
      panelHeight: panel.getBoundingClientRect().height,
      panelScrollHeight: panel.scrollHeight,
      panelClientHeight: panel.clientHeight,
      hasScrollbar: panel.scrollHeight > panel.clientHeight,
    };
  });
  console.log('Proof Details:', proofDetails);

  await browser.close();
})();
