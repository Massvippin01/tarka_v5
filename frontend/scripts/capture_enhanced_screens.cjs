const { chromium } = require('playwright');
const path = require('path');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const outDir = 'C:/Users/massv/.gemini/antigravity/brain/285293fd-af45-419a-9453-484e5e3dc2e1';

  try {
    // 1. Capture Case Switcher Popover
    console.log('Navigating to app with case switcher...');
    await page.goto('http://localhost:5173/?case=CASE-2026-001&view=evidence', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1500);

    const caseSwitcherTrigger = page.locator('button:has-text("CASE-2026-001")').first();
    if (await caseSwitcherTrigger.isVisible()) {
      await caseSwitcherTrigger.click();
      await page.waitForTimeout(600);
      await page.screenshot({ path: path.join(outDir, 'verified_case_switcher_popover.png') });
      console.log('Captured case switcher popover');
      await page.keyboard.press('Escape');
      await page.waitForTimeout(400);
    }

    // 2. Capture Fraud Network Uncongested Graph
    console.log('Navigating to Fraud Network (view=network)...');
    await page.goto('http://localhost:5173/?case=CASE-2026-001&view=network', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);
    await page.screenshot({ path: path.join(outDir, 'verified_fraud_network_uncongested.png') });
    console.log('Captured uncongested fraud network');

    // 3. Enter Fullscreen Replay Mode
    console.log('Testing Fullscreen mode...');
    const fullscreenBtn = page.locator('[data-testid="enter-fullscreen-btn"]').first();
    if (await fullscreenBtn.isVisible()) {
      await fullscreenBtn.click();
      await page.waitForTimeout(800);
      await page.screenshot({ path: path.join(outDir, 'verified_fullscreen_replay_hud.png') });
      console.log('Captured fullscreen replay with expanded HUD');

      // 4. Test Minimize HUD to Mini-HUD
      const minimizeHudBtn = page.locator('[data-testid="minimize-fullscreen-hud-btn"]').first();
      if (await minimizeHudBtn.isVisible()) {
        await minimizeHudBtn.click();
        await page.waitForTimeout(500);
        await page.screenshot({ path: path.join(outDir, 'verified_fullscreen_replay_minihud.png') });
        console.log('Captured fullscreen replay with mini HUD');
      } else {
        console.log('minimize-fullscreen-hud-btn not visible, pressing M');
        await page.keyboard.press('m');
        await page.waitForTimeout(500);
        await page.screenshot({ path: path.join(outDir, 'verified_fullscreen_replay_minihud.png') });
      }
    } else {
      console.log('enter-fullscreen-btn not visible');
    }
  } catch (err) {
    console.error('Error during capture:', err);
  } finally {
    await browser.close();
    console.log('Done captures');
  }
})();
