const { chromium } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

(async () => {
  const artifactDir = 'C:\\Users\\User\\.gemini\\antigravity\\brain\\249cd97f-a6aa-46cc-9ccf-37d2236e6dbe';
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto('http://127.0.0.1:5173/?view=intake', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(500);

  const tabs = [
    { name: 'rrn', label: 'RRN Lab', file: 'dock-tab-rrn.png' },
    { name: 'pdf', label: 'PDF', file: 'dock-tab-pdf.png' },
    { name: 'privacy', label: 'Privacy', file: 'dock-tab-privacy.png' },
    { name: 'proof', label: 'Proof', file: 'dock-tab-proof.png' },
  ];

  for (const t of tabs) {
    console.log(`Testing tab: ${t.label}`);
    await page.click(`button[role="tab"]:has-text("${t.label}")`);
    await page.waitForTimeout(300);

    const dock = page.locator('[data-card="inspector-dock"]');
    const dockBox = await dock.boundingBox();

    const activeContent = page.locator(`[role="tabpanel"][data-state="active"]`);
    const contentBox = await activeContent.boundingBox();

    console.log(`  Dock box: height=${dockBox.height}, content box: height=${contentBox.height}`);

    await dock.screenshot({ path: path.join(artifactDir, t.file) });
  }

  // Also take full screen screenshot on proof
  await page.screenshot({ path: path.join(artifactDir, 'intake-proof-tab-1440.png') });

  await browser.close();
  console.log('Dock tabs verified and screenshots saved!');
})();

