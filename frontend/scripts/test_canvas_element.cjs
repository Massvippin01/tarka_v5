const { chromium } = require('playwright');
const path = require('path');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const outDir = 'C:/Users/massv/.gemini/antigravity/brain/285293fd-af45-419a-9453-484e5e3dc2e1';

  try {
    await page.goto('http://localhost:5173/?case=CASE-2026-001&view=network', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);

    const canvasContainer = page.locator('.hero-canvas-container').first();
    if (await canvasContainer.isVisible()) {
      await canvasContainer.scrollIntoViewIfNeeded();
      await page.waitForTimeout(500);
      await canvasContainer.screenshot({ path: path.join(outDir, 'verified_canvas_element_only.png') });
      console.log('Captured canvas container element screenshot');
    }

    // Also capture full page scrolled to canvas
    await page.screenshot({ path: path.join(outDir, 'verified_scrolled_canvas_page.png') });
  } catch (err) {
    console.error('Error during capture:', err);
  } finally {
    await browser.close();
  }
})();
