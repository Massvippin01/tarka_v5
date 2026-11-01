const { chromium } = require('playwright');
const path = require('path');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  
  page.on('console', msg => console.log('[CONSOLE]', msg.type(), msg.text()));
  page.on('pageerror', err => console.log('[PAGE ERROR]', err.message));
  page.on('worker', worker => {
    console.log('[WORKER CREATED]', worker.url());
    worker.on('error', err => console.log('[WORKER ERROR]', err));
  });

  await page.goto('http://localhost:5173/');
  await page.waitForTimeout(1500);

  console.log('Pressing Alt+D...');
  await page.keyboard.press('Alt+KeyD');
  await page.waitForTimeout(1000);

  console.log('Clicking Run 100k PaySim Replica...');
  const runBtn = await page.locator('button:has-text("Run 100k PaySim Replica")');
  await runBtn.click();

  console.log('Waiting 6 seconds for stream...');
  await page.waitForTimeout(6000);

  const rootDir = path.resolve(__dirname, '../../..');
  await page.screenshot({ path: path.join(rootDir, 'test_replica_completed.png') });
  console.log('Captured test_replica_completed.png');

  await browser.close();
})();

