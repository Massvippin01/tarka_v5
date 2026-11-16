const { chromium } = require('playwright');
const path = require('path');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  
  await page.goto('http://127.0.0.1:5173/?view=workspace&case=CASE-2026-001', { waitUntil: 'networkidle' });
  await page.waitForSelector('[data-testid="v6-command-center"]', { timeout: 15000 });

  // 17. New Case Wizard Modal
  const newCaseBtn = page.locator("button:has-text('New Case')").first();
  await newCaseBtn.click({ force: true });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.resolve('C:/PROJECTS/tarka_v5_clean_verify/docs/ui_transformation/SCREENSHOTS/17_new_case_wizard_modal.png') });
  console.log('Saved 17_new_case_wizard_modal.png');

  await browser.close();
})();
