const { chromium } = require('@playwright/test');

(async () => {
  const browser = await chromium.launch({ headless: true });

  // 1. Standard View (1440x900)
  console.log('--- Measuring Standard View (1440x900) ---');
  const pageStd = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await pageStd.goto('http://127.0.0.1:5173/?view=attribution', { waitUntil: 'networkidle' });
  await pageStd.waitForTimeout(600);

  const metricsStd = await pageStd.evaluate(() => {
    const root = document.querySelector('.tarka-attribution-root');
    const bentoGrid12s = Array.from(document.querySelectorAll('.bento-grid-12'));
    const kpiCards = Array.from(document.querySelectorAll('.bento-card'));
    const scrollContainer = document.getElementById('tarka-workspace-body');
    
    return {
      windowHeight: window.innerHeight,
      scrollContainerScrollHeight: scrollContainer ? scrollContainer.scrollHeight : null,
      scrollContainerClientHeight: scrollContainer ? scrollContainer.clientHeight : null,
      rootHeight: root ? root.getBoundingClientRect().height : null,
      kpiCards: kpiCards.slice(0, 4).map(c => ({
        width: c.getBoundingClientRect().width,
        height: c.getBoundingClientRect().height,
        title: c.querySelector('span[style*="ellipsis"]')?.textContent,
      })),
      bentoRows: bentoGrid12s.map((g, idx) => ({
        row: idx + 2,
        height: g.getBoundingClientRect().height,
        top: g.getBoundingClientRect().top,
        children: Array.from(g.children).map(c => ({
          width: c.getBoundingClientRect().width,
          height: c.getBoundingClientRect().height,
        }))
      }))
    };
  });

  console.log('Standard Metrics:', JSON.stringify(metricsStd, null, 2));
  await pageStd.screenshot({ path: 'e2e/screens/v55_screen2_standard.png' });

  // 2. Click "Small View" to measure Compact Mode
  console.log('--- Measuring Small View (Compact Mode) ---');
  const smallViewBtn = pageStd.locator('button:has-text("Small View")');
  if (await smallViewBtn.isVisible()) {
    await smallViewBtn.click();
    await pageStd.waitForTimeout(400);
    const metricsCompact = await pageStd.evaluate(() => {
      const root = document.querySelector('.tarka-attribution-root');
      const scrollContainer = document.getElementById('tarka-workspace-body');
      const bentoGrid12s = Array.from(document.querySelectorAll('.bento-grid-12'));
      return {
        isCompactClassApplied: root?.classList.contains('tarka-density-compact'),
        scrollContainerScrollHeight: scrollContainer ? scrollContainer.scrollHeight : null,
        scrollContainerClientHeight: scrollContainer ? scrollContainer.clientHeight : null,
        rootHeight: root ? root.getBoundingClientRect().height : null,
        bentoRows: bentoGrid12s.map((g, idx) => ({
          row: idx + 2,
          height: g.getBoundingClientRect().height,
        }))
      };
    });
    console.log('Compact Metrics:', JSON.stringify(metricsCompact, null, 2));
    await pageStd.screenshot({ path: 'e2e/screens/v55_screen2_small_view.png' });
  }

  // 3. 1920x1080 Viewport
  console.log('--- Measuring 1920x1080 Viewport ---');
  const pageFHD = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  await pageFHD.goto('http://127.0.0.1:5173/?view=attribution', { waitUntil: 'networkidle' });
  await pageFHD.waitForTimeout(600);
  await pageFHD.screenshot({ path: 'e2e/screens/v55_screen2_1920.png' });

  await browser.close();
  console.log('All measurements and screenshots finished successfully!');
})();
