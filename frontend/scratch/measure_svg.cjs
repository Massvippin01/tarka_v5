const { chromium } = require('playwright');

async function measureSvg() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
  const page = await context.newPage();

  await page.goto('http://127.0.0.1:5173/?view=taint-engine', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);

  const svgData = await page.evaluate(() => {
    const svgs = Array.from(document.querySelectorAll('svg')).filter(s => s.getAttribute('viewBox') && s.getAttribute('viewBox').includes('0 0 50'));
    return svgs.map((s, idx) => {
      const r = s.getBoundingClientRect();
      return {
        idx,
        top: r.top,
        bottom: r.bottom,
        height: r.height,
        width: r.width
      };
    });
  });

  console.log('SVG Measurements:', JSON.stringify(svgData, null, 2));
  await browser.close();
}

measureSvg().catch(console.error);

