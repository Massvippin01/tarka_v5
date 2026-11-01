const { chromium } = require('playwright');

async function measure() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
  const page = await context.newPage();

  await page.goto('http://127.0.0.1:5173/?view=taint-engine', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);

  const rects = await page.evaluate(() => {
    const nodes = Array.from(document.querySelectorAll('div')).filter(d => 
      ['Sunil Kumar', 'Vikram Shah', 'Rohit Verma', 'Sameer Khan', 'Apex Electronics Pvt Ltd', 'Noida Sec 18 ATM DL-049'].some(name => d.innerText && d.innerText.includes(name) && d.innerText.length < 250)
    );
    const svgCol2 = document.querySelectorAll('svg')[1]; // check col2 svg
    const parentContainer = document.querySelector('div[style*="grid-template-columns"]') || document.querySelector('div[style*="gridTemplateColumns"]');
    const parentRect = parentContainer ? parentContainer.getBoundingClientRect() : null;

    return {
      parentRect: parentRect ? { top: parentRect.top, height: parentRect.height, width: parentRect.width } : null,
      nodes: nodes.map(n => {
        const r = n.getBoundingClientRect();
        return {
          text: n.innerText.slice(0, 30).replace(/\\n/g, ' '),
          top: r.top,
          bottom: r.bottom,
          height: r.height,
          relativeTop: parentRect ? r.top - parentRect.top : 0,
          relativeCenter: parentRect ? (r.top + r.bottom) / 2 - parentRect.top : 0
        };
      })
    };
  });

  console.log('Measurements:', JSON.stringify(rects, null, 2));
  await browser.close();
}

measure().catch(console.error);

