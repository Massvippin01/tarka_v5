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

  console.log('Clicking Proof tab...');
  await page.click('button[role="tab"]:has-text("Proof")');
  await page.waitForTimeout(300);

  const proofInfo = await page.evaluate(() => {
    const proofPanel = document.querySelector('[role="tabpanel"][data-state="active"]');
    const items = proofPanel.querySelectorAll('[style*="border:"]');
    return {
      proofDisplay: window.getComputedStyle(proofPanel).display,
      proofHeight: proofPanel.getBoundingClientRect().height,
      childCount: proofPanel.children.length,
      firstFiveItems: Array.from(proofPanel.children).map(c => c.textContent?.slice(0, 40))
    };
  });

  console.log('Proof Info:', JSON.stringify(proofInfo, null, 2));

  // Click Tamper Row #14 Balance inside Proof tab
  console.log('Clicking Tamper Row #14 Balance button in I1...');
  const tamperBtn = page.locator('button:has-text("Tamper Row #14 Balance")');
  if (await tamperBtn.count() > 0) {
    await tamperBtn.click();
    await page.waitForTimeout(200);
    const gateStatus = await page.locator('text=HALTED ✗').isVisible();
    console.log('Gate HALTED after tamper click in Proof tab:', gateStatus);
  }

  await browser.close();
})();

