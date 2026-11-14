const { chromium } = require('playwright');
const path = require('path');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const outDir = 'C:/Users/massv/.gemini/antigravity/brain/285293fd-af45-419a-9453-484e5e3dc2e1';
  await page.goto('http://localhost:5173/?case=CASE-2026-001&view=workstation', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(600);

  const tabs = [
    { name: 'loom', text: '1. Temporal Loom' },
    { name: 'lens', text: '2. Claim Dependency Lens' },
    { name: 'recorder', text: '3. Flight Recorder' },
    { name: 'provenance', text: '4. Provenance DAG' },
  ];

  for (const t of tabs) {
    const btn = page.locator('button', { hasText: t.text }).first();
    await btn.click();
    await page.waitForTimeout(600);
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.screenshot({ path: path.join(outDir, `workstation_tab_${t.name}.png`) });
    const violations = await page.evaluate(() => {
      const bad = [];
      const walk = (node) => {
        if (node.nodeType === 3 && node.textContent.trim().length > 0) {
          const el = node.parentElement;
          if (el) {
            const fs = parseFloat(window.getComputedStyle(el).fontSize);
            if (fs < 11.9) bad.push({ text: node.textContent.trim().slice(0, 30), fs, tag: el.tagName });
          }
        }
        for (const child of node.childNodes) walk(child);
      };
      walk(document.body);
      return bad;
    });
    console.log(`Violations on workstation ${t.name}:`, violations.length);
    if (violations.length > 0) console.log(violations.slice(0, 10));
  }
  await browser.close();
})();
