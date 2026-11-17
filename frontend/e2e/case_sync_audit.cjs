const { chromium } = require('@playwright/test');
const http = require('http');

const BASE_URL = process.env.BASE_URL || 'http://localhost:5173';
const ROUTES = [
  'intake',
  'entities',
  'taint-engine',
  'network',
  'attribution',
  'report',
  'court-proof',
  'privacy-crypto',
  'workstation'
];

async function fetchCases() {
  return new Promise((resolve, reject) => {
    http.get('http://localhost:8000/api/v1/cases', (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', (err) => {
      // Fallback canonical metadata if backend not reached
      resolve([
        { id: 'CASE-2026-001', fir_number: 'FIR #149/2026', metadata_json: { complainant_name: 'Sunil Kumar' } },
        { id: 'CASE-2026-002', fir_number: 'FIR #882/2026', metadata_json: { complainant_name: 'Meera Nair' } },
        { id: 'CASE-2026-003', fir_number: 'FIR #104/2026', metadata_json: { complainant_name: 'Rajesh K. Singhania' } },
        { id: 'CASE-2026-004', fir_number: 'FIR #405/2026', metadata_json: { complainant_name: 'Pooja Hegde' } }
      ]);
    });
  });
}

async function runAudit() {
  console.log('======================================================================');
  console.log('  TARKA APPENDIX B: CASE-SYNC BASELINE AUDIT');
  console.log('======================================================================\n');

  const rawCases = await fetchCases();
  const cases = rawCases.map(c => ({
    id: c.id,
    fir_number: c.fir_number || (c.metadata_json && c.metadata_json.fir_number) || '',
    victim_name: (c.metadata_json && c.metadata_json.complainant_name) || c.victim_name || ''
  }));

  console.log('Target Cases:', cases.map(c => `${c.id} (${c.victim_name} / ${c.fir_number})`).join(', '));
  console.log('');

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  const results = {
    total: 0,
    passed: 0,
    failed: 0,
    failures: []
  };

  function assert(condition, testName, details = '') {
    results.total++;
    if (condition) {
      results.passed++;
      console.log(`  [PASS] ${testName}`);
    } else {
      results.failed++;
      console.error(`  [FAIL] ${testName}${details ? ` -> ${details}` : ''}`);
      results.failures.push({ testName, details });
    }
  }

  try {
    // 1. Data-case-id fingerprints & cross-case data leaks
    console.log('\n--- 1. Testing Route Sync, Fingerprints & Data Leaks ---');
    for (const c of cases) {
      for (const view of ROUTES) {
        const url = `${BASE_URL}/?case=${c.id}&view=${view}`;
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 15000 });
        await page.waitForTimeout(600);

        // Check data-case-id fingerprint
        const ids = await page.locator('[data-case-id]').evaluateAll(els =>
          [...new Set(els.map(e => e.getAttribute('data-case-id')).filter(Boolean))]
        );

        const fingerprintPass = ids.length > 0 && ids.every(id => id === c.id);
        assert(
          fingerprintPass,
          `Fingerprint [data-case-id] for ${c.id} on view=${view}`,
          ids.length === 0 ? 'No [data-case-id] elements found on screen' : `Found mismatched IDs: ${ids.join(', ')} (expected only ${c.id})`
        );

        const bodyText = await page.locator('body').innerText();

        // Check if other cases' victim or FIR leaked in
        for (const other of cases) {
          if (other.id === c.id) continue;
          if (other.victim_name && other.victim_name.length > 3) {
            const victimLeaked = bodyText.includes(other.victim_name);
            assert(
              !victimLeaked,
              `Leak check: ${other.id} victim "${other.victim_name}" must NOT leak into ${c.id} on ${view}`,
              `Leaked victim name "${other.victim_name}" detected on ${c.id} ${view}`
            );
          }
          if (other.fir_number && other.fir_number.length > 4) {
            const firLeaked = bodyText.includes(other.fir_number);
            assert(
              !firLeaked,
              `Leak check: ${other.id} FIR "${other.fir_number}" must NOT leak into ${c.id} on ${view}`,
              `Leaked FIR "${other.fir_number}" detected on ${c.id} ${view}`
            );
          }
        }

        // Check for undefined or NaN
        const hasUndefined = /\bundefined\b/.test(bodyText);
        const hasNaN = /\bNaN\b/.test(bodyText);
        assert(!hasUndefined && !hasNaN, `No broken values (undefined/NaN) on ${c.id} ${view}`);
      }
    }

    // 2. Static amounts check across cases (Court Dossier & Privacy)
    console.log('\n--- 2. Testing Court Dossier & Privacy Dynamic Value Separation ---');
    await page.goto(`${BASE_URL}/?case=CASE-2026-001&view=court-proof`);
    await page.waitForTimeout(600);
    const court001 = await page.locator('body').innerText();

    await page.goto(`${BASE_URL}/?case=CASE-2026-003&view=court-proof`);
    await page.waitForTimeout(600);
    const court003 = await page.locator('body').innerText();

    // Check that loss amount in court dossier is different between Case 001 (5L) and Case 003 (85L)
    const courtHasDifferentAmounts = court001 !== court003 && !court003.includes('₹5,00,000') && !court003.includes('₹5.00L');
    assert(
      courtHasDifferentAmounts,
      'Court Dossier dynamically separates amounts between CASE-2026-001 and CASE-2026-003',
      'Court Dossier appears to render identical static numbers across different cases'
    );

    // 3. Unknown case handling
    console.log('\n--- 3. Testing Unknown Case Handling ---');
    await page.goto(`${BASE_URL}/?case=CASE-TEST-999&view=network`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(800);
    const unknownText = await page.locator('body').innerText();
    const showsNotFound = /case not found/i.test(unknownText);
    const doesNotRenderCase001 = !unknownText.includes('Sunil Kumar') && !unknownText.includes('FIR #149');
    assert(
      showsNotFound && doesNotRenderCase001,
      'Unknown case ?case=CASE-TEST-999 renders Case Not Found page and zero fallback data',
      showsNotFound ? 'Shows Not Found, but leaked case data' : 'Did NOT show "Case Not Found" page'
    );

    // 4. In-app case switching keeps current screen & updates URL
    console.log('\n--- 4. Testing In-App Case Switcher ---');
    await page.goto(`${BASE_URL}/?case=CASE-2026-001&view=network`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(800);

    // Click case switcher
    const switcherBtn = page.locator('[data-testid="case-switcher-button"], button:has-text("CASE-"), button:has-text("FIR #")').first();
    const btnExists = await switcherBtn.count() > 0;
    if (btnExists) {
      await switcherBtn.click();
      await page.waitForTimeout(400);
      const case2Option = page.locator('[data-case-option="CASE-2026-002"]').first();
      const optionExists = await case2Option.count() > 0;
      if (optionExists) {
        await case2Option.click();
        await page.waitForTimeout(800);

        const currentUrl = page.url();
        const keepsView = currentUrl.includes('view=network');
        const updatesCase = currentUrl.includes('case=CASE-2026-002');
        const bodyAfterSwitch = await page.locator('body').innerText();
        const noSunil = !bodyAfterSwitch.includes('Sunil Kumar');

        assert(keepsView, 'Switching cases keeps the active screen (view=network)', `URL is: ${currentUrl}`);
        assert(updatesCase, 'Switching cases updates the URL to case=CASE-2026-002', `URL is: ${currentUrl}`);
        assert(noSunil, 'Switched screen contains no leaked data from previous case (no Sunil Kumar)');
      } else {
        assert(false, 'Case switcher option for CASE-2026-002 clickable', 'Option not found in menu');
      }
    } else {
      assert(false, 'Case switcher button present in header', 'Switcher button not found');
    }

  } catch (err) {
    console.error('Fatal error during audit:', err);
  } finally {
    await browser.close();
  }

  console.log('\n======================================================================');
  console.log(`BASELINE AUDIT SUMMARY: Total: ${results.total} | Passed: ${results.passed} | Failed: ${results.failed}`);
  console.log('======================================================================');
  if (results.failures.length > 0) {
    console.log('\nKey Failing Baseline Issues Captured:');
    results.failures.forEach((f, i) => console.log(`  ${i + 1}. ${f.testName} (${f.details})`));
  }
}

runAudit();

