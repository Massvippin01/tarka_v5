const { chromium } = require('@playwright/test');
(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto('http://127.0.0.1:5173/?view=intake', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(500);

  // Inject the CSS fix
  await page.addStyleTag({
    content: `
      [role="tabpanel"][hidden],
      [role="tabpanel"][data-state="inactive"] {
        display: none !important;
      }
      [role="tabpanel"][data-state="active"] {
        display: flex !important;
        flex: 1 1 0% !important;
        height: 100% !important;
      }
    `
  });

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

  console.log('After CSS fix:', JSON.stringify(displayStates, null, 2));

  // Now click Proof tab and check
  console.log('\nClicking Proof tab...');
  await page.click('button[role="tab"]:has-text("Proof")');
  await page.waitForTimeout(300);

  const proofStates = await page.evaluate(() => {
    const contents = document.querySelectorAll('[role="tabpanel"]');
    return Array.from(contents).map(c => ({
      id: c.getAttribute('id'),
      dataState: c.getAttribute('data-state'),
      hidden: c.hasAttribute('hidden'),
      computedDisplay: window.getComputedStyle(c).display,
      height: c.getBoundingClientRect().height
    }));
  });
  console.log('Proof tab active states:', JSON.stringify(proofStates, null, 2));

  await browser.close();
})();

