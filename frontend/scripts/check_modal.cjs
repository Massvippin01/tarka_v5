const { chromium } = require('playwright');
const path = require('path');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto('http://localhost:5173/?case=CASE-2026-001&nav=investigations&lens=Network&entity=P001&mode=2D&tab=dossier&level=0');
  await page.waitForTimeout(1500);
  await page.keyboard.press('Alt+KeyD');
  await page.waitForTimeout(1000);

  const csvPath = path.resolve(__dirname, '../../../SUTRAM_UNSEEN_BLIND_TEST_50K.csv');
  const fileInput = await page.locator('input[type="file"][accept=".csv"]');
  await fileInput.setInputFiles(csvPath);
  console.log('File uploaded. Waiting for processing...');
  await page.waitForTimeout(4000);
  
  const text = await page.locator('div[role="dialog"], .fixed.inset-0').innerText();
  console.log('=== MODAL CONTENT ===');
  console.log(text);
  await browser.close();
})();
