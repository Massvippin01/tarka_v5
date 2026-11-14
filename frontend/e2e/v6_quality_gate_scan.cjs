const { chromium } = require('@playwright/test');

const ROUTES = [
  'workspace',
  'cases',
  'evidence',
  'people',
  'money',
  'network',
  'device',
  'actions',
  'settings',
  'health',
  'lab',
];

const VIEWPORTS = [
  { name: '1440x900', w: 1440, h: 900 },
  { name: '1366x768', w: 1366, h: 768 },
];

async function main() {
  console.log('===========================================================');
  console.log('  TARKA v6 Redesign Quality Gate & Forensic UI Scan');
  console.log('===========================================================\n');

  const browser = await chromium.launch();
  let totalChecks = 0;
  let passedChecks = 0;
  let failedChecks = 0;

  function pass(msg) {
    totalChecks++;
    passedChecks++;
    console.log(`  [PASS] ${msg}`);
  }

  function fail(msg, err) {
    totalChecks++;
    failedChecks++;
    console.error(`  [FAIL] ${msg}: ${err}`);
  }

  for (const vp of VIEWPORTS) {
    console.log(`\n--- Auditing Viewport: ${vp.name} ---`);
    const page = await browser.newPage({ viewport: { width: vp.w, height: vp.h } });

    for (const route of ROUTES) {
      const pageErrors = [];
      const consoleErrors = [];

      page.on('pageerror', (err) => pageErrors.push(err.message));
      page.on('console', (msg) => {
        if (msg.type() === 'error') consoleErrors.push(msg.text());
      });

      const url = `http://localhost:5173/?case=CASE-2026-001&view=${route}`;
      await page.goto(url, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(1000);

      // Check 1: 0 page errors
      if (pageErrors.length === 0) {
        pass(`${route} (${vp.name}) 0 page errors`);
      } else {
        fail(`${route} (${vp.name}) page errors found`, pageErrors.join('; '));
      }

      // Check 2: 0 console errors (filter out Vite dev noise if any)
      const criticalErrors = consoleErrors.filter(
        (e) => !e.includes('favicon') && !e.includes('React DevTools')
      );
      if (criticalErrors.length === 0) {
        pass(`${route} (${vp.name}) 0 console errors`);
      } else {
        fail(`${route} (${vp.name}) console errors found`, criticalErrors.join('; '));
      }

      // Check 3: 0 "undefined" or "NaN" in text
      const bodyText = await page.locator('body').innerText();
      const hasUndefined = /\bundefined\b/.test(bodyText);
      const hasNaN = /\bNaN\b/.test(bodyText);

      if (!hasUndefined && !hasNaN) {
        pass(`${route} (${vp.name}) 0 undefined / 0 NaN`);
      } else {
        fail(
          `${route} (${vp.name}) broken values found`,
          `undefined: ${hasUndefined}, NaN: ${hasNaN}`
        );
      }

      // Check 4: Font size floor >= 12px
      const smallTextElements = await page.evaluate(() => {
        const elements = Array.from(document.querySelectorAll('body *'));
        const bad = [];
        for (const el of elements) {
          if (el.children.length === 0 && el.textContent && el.textContent.trim().length > 0) {
            const style = window.getComputedStyle(el);
            const size = parseFloat(style.fontSize);
            // Ignore hidden elements, svg decorative elements
            if (size > 0 && size < 11.9 && style.display !== 'none' && style.visibility !== 'hidden') {
              bad.push({
                text: el.textContent.trim().slice(0, 30),
                size: size,
                tag: el.tagName,
              });
            }
          }
        }
        return bad;
      });

      if (smallTextElements.length === 0) {
        pass(`${route} (${vp.name}) 100% typography >= 12px floor`);
      } else {
        fail(
          `${route} (${vp.name}) typography below 12px floor`,
          `${smallTextElements.length} elements: ${JSON.stringify(smallTextElements.slice(0, 3))}`
        );
      }

      // Check 5: Topbar layout non-overlapping
      const topbarOverlaps = await page.evaluate(() => {
        const topbar = document.querySelector('.v6-topbar');
        if (!topbar) return false;
        return topbar.scrollWidth > topbar.clientWidth + 2;
      });

      if (!topbarOverlaps) {
        pass(`${route} (${vp.name}) clean topbar layout (no horizontal overflow)`);
      } else {
        fail(`${route} (${vp.name}) topbar overflow detected`, 'topbar.scrollWidth > clientWidth');
      }
    }

    await page.close();
  }

  await browser.close();

  console.log('\n===========================================================');
  console.log(`  AUDIT SUMMARY: Total: ${totalChecks} | Passed: ${passedChecks} | Failed: ${failedChecks}`);
  console.log('===========================================================');

  if (failedChecks > 0) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

