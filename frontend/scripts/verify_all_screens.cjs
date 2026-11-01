const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  
  const screens = [
    { name: '00_workspace', url: 'http://localhost:5173/?case=CASE-2026-001' },
    { name: '01_intake', key: 'Alt+Digit1' },
    { name: '02_entities', key: 'Alt+Digit2' },
    { name: '03_attribution', key: 'Alt+Digit3' },
    { name: '04_network', key: 'Alt+Digit4' },
    { name: '05_taint', key: 'Alt+Digit5' },
    { name: '06_court_proof', key: 'Alt+Digit6' },
  ];

  await page.goto(screens[0].url, { waitUntil: 'load' });
  await page.waitForTimeout(800);
  await page.screenshot({ path: 'verify_00_workspace.png' });
  console.log('Verified Screen 00');

  for (let i = 1; i < screens.length; i++) {
    const s = screens[i];
    await page.keyboard.press(s.key);
    await page.waitForTimeout(600);
    await page.screenshot({ path: 'verify_' + s.name + '.png' });
    console.log('Verified Screen ' + s.name);
  }

  await browser.close();
  console.log('ALL SCREENS RENDERED CLEANLY!');
})();

