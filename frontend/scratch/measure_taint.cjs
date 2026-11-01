const { chromium } = require('@playwright/test');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto('http://127.0.0.1:5173/?view=taint-engine');
  await page.waitForTimeout(600);

  const res = await page.evaluate(() => {
    const kpi = document.querySelector('.bento-grid-4');
    const row2 = document.querySelectorAll('.bento-grid-12')[0];
    const row3 = document.querySelectorAll('.bento-grid-12')[1];
    const scrollContainer = document.getElementById('tarka-workspace-body');

    return {
      scrollContainerClient: scrollContainer.clientHeight,
      scrollContainerScroll: scrollContainer.scrollHeight,
      hasScrollbar: scrollContainer.scrollHeight > scrollContainer.clientHeight,
      kpiHeight: kpi ? kpi.getBoundingClientRect().height : null,
      row2Height: row2 ? row2.getBoundingClientRect().height : null,
      row3Height: row3 ? row3.getBoundingClientRect().height : null,
      row2LeftRect: row2 ? row2.children[0].getBoundingClientRect() : null,
      row2RightRect: row2 ? row2.children[1].getBoundingClientRect() : null,
    };
  });
  console.log(JSON.stringify(res, null, 2));
  await browser.close();
})();

