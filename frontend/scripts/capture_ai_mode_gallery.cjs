const { chromium } = require('playwright');
const path = require('path');

const ARTIFACT_DIR = 'C:/Users/massv/.gemini/antigravity/brain/285293fd-af45-419a-9453-484e5e3dc2e1';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  console.log('Navigating to cases screen...');
  await page.goto('http://localhost:5173/?case=CASE-2026-004&view=cases', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1500);

  console.log('Opening Ask TARKA drawer...');
  await page.getByRole('button', { name: /Ask TARKA/i }).click();
  await page.waitForTimeout(800);

  const drawer = page.locator('aside[data-testid="ask-tarka-drawer"]');
  await drawer.waitFor({ state: 'visible' });

  // 1. Initial State
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'verified_ai_mode_drawer_welcome.png') });
  console.log('Saved: verified_ai_mode_drawer_welcome.png');

  // 2. Click Quick Inquiry
  console.log('Triggering Quick Inquiry "Amount Discrepancy"...');
  await drawer.getByRole('button', { name: /Amount Discrepancy/i }).click();
  await page.waitForTimeout(2000);

  // Scroll messages container slightly up so user bubble + assistant card are both beautifully visible
  const scrollContainer = drawer.locator('.overflow-y-auto');
  await scrollContainer.evaluate((el) => {
    // Scroll so that the user message is visible at the top
    const userMsg = el.querySelector('.bg-blue-600');
    if (userMsg) {
      userMsg.scrollIntoView({ behavior: 'instant', block: 'start' });
      el.scrollTop -= 12; // give a bit of top padding
    }
  });
  await page.waitForTimeout(500);

  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'verified_ai_mode_drawer_full_dialog.png') });
  console.log('Saved: verified_ai_mode_drawer_full_dialog.png');

  // 3. Test typing into the input box
  const input = drawer.getByPlaceholder(/Ask Llama 3.1 8B/i);
  await input.fill('Verify SHA-256 bitstream custody for ART-001-745EC02B');
  await page.waitForTimeout(400);

  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'verified_ai_mode_drawer_input_active.png') });
  console.log('Saved: verified_ai_mode_drawer_input_active.png');

  await browser.close();
  console.log('All gallery screenshots captured successfully!');
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
