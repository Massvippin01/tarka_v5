const { chromium } = require('@playwright/test');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto('http://127.0.0.1:5173/?view=attribution');
  await page.waitForTimeout(600);

  // 1. Full screen standard
  await page.screenshot({ path: 'e2e/screens/v55_enhanced_attribution_full.png' });

  // 2. Crop/element screenshot of CGNAT Candidate Intersection Funnel card
  const funnelCard = page.locator('div:has-text("CGNAT Candidate Intersection Funnel")').first();
  if (await funnelCard.isVisible()) {
    await funnelCard.screenshot({ path: 'e2e/screens/v55_enhanced_funnel_infographic.png' });
  }

  // 3. Crop/element screenshot of Z3 SMT Clock-Offset Vernier Caliper card
  const z3Card = page.locator('div:has-text("Dual-SIM IMEI Luhn Twin & Z3 SMT Bounds")').first();
  if (await z3Card.isVisible()) {
    await z3Card.screenshot({ path: 'e2e/screens/v55_enhanced_z3_smt_infographic.png' });
  }

  // 4. Test "Drop Port" mutation to see the funnel adapt
  const dropBtn = page.locator('button:has-text("Drop Port")');
  if (await dropBtn.isVisible()) {
    await dropBtn.click();
    await page.waitForTimeout(400);
    await funnelCard.screenshot({ path: 'e2e/screens/v55_enhanced_funnel_dropped.png' });
  }

  await browser.close();
  console.log('Infographic screenshots captured successfully!');
})();

