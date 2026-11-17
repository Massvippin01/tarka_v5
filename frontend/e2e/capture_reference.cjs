const { chromium } = require('@playwright/test');
const path = require('path');
const fs = require('fs');

async function capture() {
  const outDir = path.resolve(__dirname, '../../docs/redesign/reference');
  fs.mkdirSync(outDir, { recursive: true });

  const browser = await chromium.launch();
  const viewports = [
    { name: '1440', width: 1440, height: 900 },
    { name: '1366', width: 1366, height: 768 },
  ];

  for (const vp of viewports) {
    const page = await browser.newPage({ viewport: { width: vp.width, height: vp.height } });
    await page.goto('http://localhost:5173/design/tarka-reference.html#dash');
    await page.waitForTimeout(1500);

    // 1. Dashboard
    await page.screenshot({ path: path.join(outDir, `01_dash_${vp.name}.png`), fullPage: false });

    // 2. Evidence
    await page.click('[data-go="evidence"]');
    await page.waitForTimeout(1600);
    await page.screenshot({ path: path.join(outDir, `02_evidence_${vp.name}.png`), fullPage: false });

    // Evidence: Click rerun check
    await page.click('#rerunCheck');
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(outDir, `02_evidence_checked_${vp.name}.png`), fullPage: false });

    // 3. People
    await page.click('[data-go="people"]');
    await page.waitForTimeout(1200);
    await page.screenshot({ path: path.join(outDir, `03_people_${vp.name}.png`), fullPage: false });

    // People: Open Why Inspector for Vikram Shah (M1)
    await page.click('[data-person="M1"]');
    await page.waitForTimeout(800);
    await page.screenshot({ path: path.join(outDir, `03_people_inspector_${vp.name}.png`), fullPage: false });

    // Close Inspector
    await page.click('#inspClose');
    await page.waitForTimeout(400);

    // 4. Money Trail
    await page.click('[data-go="money"]');
    await page.waitForTimeout(1500);
    await page.screenshot({ path: path.join(outDir, `04_money_${vp.name}.png`), fullPage: false });

    // Money: Click Freeze on one of the held nodes inside #sankey
    const freezeBtn = page.locator('#sankey [role="button"]').first();
    if (await freezeBtn.isVisible()) {
      await freezeBtn.click();
      await page.waitForTimeout(800);
      await page.screenshot({ path: path.join(outDir, `04_money_frozen_${vp.name}.png`), fullPage: false });
    }

    // Money: Tracing methods why inspector
    await page.click('[data-why="method"]');
    await page.waitForTimeout(800);
    await page.screenshot({ path: path.join(outDir, `04_money_why_inspector_${vp.name}.png`), fullPage: false });
    await page.click('#inspClose');
    await page.waitForTimeout(400);

    // 5. Fraud Network
    await page.click('[data-go="network"]');
    await page.waitForTimeout(1500);
    await page.screenshot({ path: path.join(outDir, `05_network_${vp.name}.png`), fullPage: false });

    // Network: Replay the theft
    await page.click('#playBtn');
    await page.waitForTimeout(3000);
    await page.screenshot({ path: path.join(outDir, `05_network_replayed_${vp.name}.png`), fullPage: false });

    // 6. Actions & Report
    await page.click('[data-go="actions"]');
    await page.waitForTimeout(1200);
    await page.screenshot({ path: path.join(outDir, `06_actions_${vp.name}.png`), fullPage: false });

    // Actions: Send freeze requests
    await page.click('#sendBtn');
    await page.waitForTimeout(800);
    await page.screenshot({ path: path.join(outDir, `06_actions_sent_${vp.name}.png`), fullPage: false });

    // Actions: Simulate bank response
    await page.click('#simBtn');
    await page.waitForTimeout(3000);
    await page.screenshot({ path: path.join(outDir, `06_actions_simulated_${vp.name}.png`), fullPage: false });

    // Actions: Generate & seal report
    await page.click('#genBtn');
    await page.waitForTimeout(800);
    await page.screenshot({ path: path.join(outDir, `06_actions_sealed_${vp.name}.png`), fullPage: false });

    await page.close();
  }

  await browser.close();
  console.log('Successfully captured all reference screenshots.');
}

capture().catch(err => {
  console.error(err);
  process.exit(1);
});
