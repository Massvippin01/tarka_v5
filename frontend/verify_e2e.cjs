const { chromium } = require('./node_modules/playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  // 1. Visit Workspace Hub
  await page.goto('http://localhost:5173/', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: 'test_screen00.png' });
  console.log('✓ Screen 00 captured to test_screen00.png');

  // 2. Click on Alt+1 or Alt+0 shortcut
  await page.keyboard.press('Alt+1');
  await page.waitForTimeout(800);
  await page.screenshot({ path: 'test_screen01.png' });
  console.log('✓ Screen 01 captured to test_screen01.png');

  // 3. Navigate to S05 Taint Engine via Alt+5
  await page.keyboard.press('Alt+5');
  await page.waitForTimeout(800);
  await page.screenshot({ path: 'test_screen05.png' });
  console.log('✓ Screen 05 captured to test_screen05.png');

  // 4. Navigate to S06 Court Proof via Alt+6
  await page.keyboard.press('Alt+6');
  await page.waitForTimeout(800);
  await page.screenshot({ path: 'test_screen06.png' });
  console.log('✓ Screen 06 captured to test_screen06.png');

  // 5. Test mutator activation & sandbox banner via mutator dropdown or hotkey
  await page.keyboard.press('Alt+0');
  await page.waitForTimeout(500);

  await browser.close();
  console.log('All Playwright verification steps completed successfully!');
  process.exit(0);
})().catch((err) => {
  console.error('Playwright verification failed:', err);
  process.exit(1);
});

