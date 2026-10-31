const { chromium } = require('@playwright/test');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto('http://127.0.0.1:5173/?view=intake', { waitUntil: 'networkidle' });

  // Check tab heights and styles
  const tabData = await page.evaluate(() => {
    const tabs = Array.from(document.querySelectorAll('[role="tabpanel"]'));
    return tabs.map(t => ({
      ariaControls: t.getAttribute('aria-labelledby'),
      state: t.getAttribute('data-state'),
      offsetHeight: t.offsetHeight,
      scrollHeight: t.scrollHeight,
      clientHeight: t.clientHeight,
      display: window.getComputedStyle(t).display,
      visibility: window.getComputedStyle(t).visibility,
    }));
  });
  console.log('Tabs in Intake View:', JSON.stringify(tabData, null, 2));

  // Take screenshot of RRN
  await page.screenshot({ path: 'e2e/test_rrn_tab.png' });

  // Click PDF tab
  await page.click('button[role="tab"]:has-text("PDF")');
  await page.waitForTimeout(200);
  await page.screenshot({ path: 'e2e/test_pdf_tab.png' });

  // Click Privacy tab
  await page.click('button[role="tab"]:has-text("Privacy")');
  await page.waitForTimeout(200);
  await page.screenshot({ path: 'e2e/test_privacy_tab.png' });

  // Click Proof tab
  await page.click('button[role="tab"]:has-text("Proof")');
  await page.waitForTimeout(200);
  await page.screenshot({ path: 'e2e/test_proof_tab.png' });

  await browser.close();
  console.log('Screenshots captured successfully');
})();

