const { chromium } = require('@playwright/test');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });

  console.log('--- Screen 1: Evidence Intake & Ledger Falsification ---');
  const page1 = await context.newPage();
  await page1.goto('http://127.0.0.1:5173/?view=intake');
  await page1.waitForTimeout(600);
  await page1.screenshot({ path: 'e2e/screens/v55_screen1_intake.png' });
  await page1.close();

  console.log('--- Screen 2: CGNAT Attribution & Hardware Twin ---');
  const page2 = await context.newPage();
  await page2.goto('http://127.0.0.1:5173/?view=attribution');
  await page2.waitForTimeout(600);
  await page2.screenshot({ path: 'e2e/screens/v55_screen2_attribution.png' });
  await page2.close();

  console.log('--- Screen 3: Taint Engine ---');
  const page3 = await context.newPage();
  await page3.goto('http://127.0.0.1:5173/?view=taint-engine');
  await page3.waitForTimeout(600);
  await page3.screenshot({ path: 'e2e/screens/v55_screen3_taint_engine.png' });
  await page3.close();

  console.log('--- Screen 4: Court Proof Dossier ---');
  const page4 = await context.newPage();
  await page4.goto('http://127.0.0.1:5173/?view=court-proof');
  await page4.waitForTimeout(600);
  await page4.screenshot({ path: 'e2e/screens/v55_screen4_court_proof.png' });
  await page4.close();

  console.log('All 4 screen screenshots captured successfully!');
  await browser.close();
})();

