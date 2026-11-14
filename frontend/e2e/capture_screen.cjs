const { chromium } = require('@playwright/test');
const path = require('path');
const fs = require('fs');

async function main() {
  const [,, screenName, viewUrl] = process.argv;
  if (!screenName || !viewUrl) {
    console.error('Usage: node capture_screen.cjs <screenName> <viewUrl>');
    process.exit(1);
  }

  const outDir = path.resolve(__dirname, '../../docs/redesign/v6');
  fs.mkdirSync(outDir, { recursive: true });

  const browser = await chromium.launch();
  for (const vp of [{ name: '1440', w: 1440, h: 900 }, { name: '1366', w: 1366, h: 768 }]) {
    const page = await browser.newPage({ viewport: { width: vp.w, height: vp.h } });
    await page.goto(viewUrl);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
    const outFile = path.join(outDir, `${screenName}_${vp.name}.png`);
    await page.screenshot({ path: outFile, fullPage: false });
    console.log(`Captured ${outFile}`);
    await page.close();
  }
  await browser.close();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
