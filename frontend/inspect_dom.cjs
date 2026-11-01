const { chromium } = require('@playwright/test');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto('http://localhost:5173/?case=CASE-2026-001&nav=investigations&lens=Network&entity=P001&mode=2D&tab=dossier&level=0');
  await page.waitForTimeout(2000);
  
  const info = await page.evaluate(() => {
    const hub = document.getElementById('tarka-workspace-body');
    if (!hub) return { found: false, html: document.body.innerHTML.slice(0, 500) };
    const computed = window.getComputedStyle(hub);
    
    // Find KPI cards
    const allDivs = Array.from(hub.querySelectorAll('div'));
    const kpiContainer = allDivs.find(d => window.getComputedStyle(d).display === 'grid');
    
    return {
      found: true,
      hubDisplay: computed.display,
      hubBackground: computed.backgroundColor,
      kpiContainerFound: !!kpiContainer,
      kpiDisplay: kpiContainer ? window.getComputedStyle(kpiContainer).display : null,
      kpiColumns: kpiContainer ? window.getComputedStyle(kpiContainer).gridTemplateColumns : null,
      firstCardBg: kpiContainer && kpiContainer.children[0] ? window.getComputedStyle(kpiContainer.children[0]).backgroundColor : null,
      firstCardBorder: kpiContainer && kpiContainer.children[0] ? window.getComputedStyle(kpiContainer.children[0]).border : null,
      firstCardText: kpiContainer && kpiContainer.children[0] ? kpiContainer.children[0].innerText.slice(0, 60) : null
    };
  });
  console.log('DOM info:', JSON.stringify(info, null, 2));
  await browser.close();
})();
