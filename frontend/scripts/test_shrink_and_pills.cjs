const { chromium } = require('playwright');
const path = require('path');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const outDir = 'C:/Users/massv/.gemini/antigravity/brain/285293fd-af45-419a-9453-484e5e3dc2e1';

  try {
    // 1. Navigate to Fraud Network
    console.log('Navigating to Fraud Network (view=network)...');
    await page.goto('http://localhost:5173/?case=CASE-2026-001&view=network', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);

    // Capture sidebar card and pills
    const sidebar = page.locator('aside.v6-rail').first();
    if (await sidebar.isVisible()) {
      await sidebar.screenshot({ path: path.join(outDir, 'verified_sidebar_clean_card_pills.png') });
      console.log('Captured clean sidebar card and pills');
    }

    // Capture full in-page view showing shrink-to-fit graph
    await page.screenshot({ path: path.join(outDir, 'verified_fraud_network_shrink_to_fit.png') });
    console.log('Captured in-page shrink-to-fit graph');

    // Also capture on a standard 1366x768 laptop viewport
    await page.setViewportSize({ width: 1366, height: 768 });
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(outDir, 'verified_fraud_network_1366x768_shrink.png') });
    console.log('Captured 1366x768 shrink-to-fit graph');

  } catch (err) {
    console.error('Error during capture:', err);
  } finally {
    await browser.close();
    console.log('Finished captures');
  }
})();
