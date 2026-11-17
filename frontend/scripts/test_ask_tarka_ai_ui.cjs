const { chromium } = require('playwright');
const path = require('path');

const ARTIFACT_DIR = 'C:/Users/massv/.gemini/antigravity/brain/285293fd-af45-419a-9453-484e5e3dc2e1';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  console.log('Navigating to http://localhost:5173/?case=CASE-2026-004&view=cases...');
  await page.goto('http://localhost:5173/?case=CASE-2026-004&view=cases', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2000);

  console.log('Clicking "Ask TARKA" button in topbar...');
  const askTarkaBtn = page.getByRole('button', { name: /Ask TARKA/i });
  await askTarkaBtn.click();
  await page.waitForTimeout(1000);

  const drawer = page.locator('aside[data-testid="ask-tarka-drawer"]');
  await drawer.waitFor({ state: 'visible', timeout: 5000 });
  console.log('Ask TARKA drawer is visible!');

  // Take screenshot of drawer initial state
  const initialScreenshotPath = path.join(ARTIFACT_DIR, 'verified_ai_mode_ui_enhanced.png');
  await page.screenshot({ path: initialScreenshotPath });
  console.log('Saved initial state screenshot to:', initialScreenshotPath);

  // Click "Amount Discrepancy" quick inquiry button
  console.log('Clicking "Amount Discrepancy" quick inquiry button...');
  const promptBtn = drawer.getByRole('button', { name: /Amount Discrepancy/i });
  await promptBtn.click();

  // Wait for assistant response to appear
  await page.waitForTimeout(2000);

  // Take screenshot of drawer with response and citations
  const responseScreenshotPath = path.join(ARTIFACT_DIR, 'verified_ai_mode_query_response.png');
  await page.screenshot({ path: responseScreenshotPath });
  console.log('Saved response screenshot to:', responseScreenshotPath);

  // Check drawer element styling
  const drawerBBox = await drawer.boundingBox();
  console.log('Drawer bounding box:', drawerBBox);

  await browser.close();
  console.log('Test completed successfully!');
})().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});
