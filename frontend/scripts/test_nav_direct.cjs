const { chromium } = require('playwright');
const path = require('path');

(async () => {
  console.log('[TEST NAV] Starting navigation test...');
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  page.on('console', msg => console.log('[CONSOLE]', msg.type(), msg.text()));
  page.on('pageerror', err => console.log('[PAGE ERROR]', err.message));

  await page.goto('http://localhost:5173/');
  await page.waitForTimeout(2000);

  // Press Alt+3 to navigate to Screen 03
  console.log('Pressing Alt+3...');
  await page.keyboard.press('Alt+Digit3');
  await page.waitForTimeout(1500);

  const rootDir = path.resolve(__dirname, '../../..');
  await page.screenshot({ path: path.join(rootDir, 'screen03_direct_test.png') });
  console.log('✓ Captured screen03_direct_test.png');

  // Press Alt+5 to navigate to Screen 05
  console.log('Pressing Alt+5...');
  await page.keyboard.press('Alt+Digit5');
  await page.waitForTimeout(1500);
  await page.screenshot({ path: path.join(rootDir, 'screen05_direct_test.png') });
  console.log('✓ Captured screen05_direct_test.png');

  await browser.close();
  console.log('✓ Navigation test done!');
})();

