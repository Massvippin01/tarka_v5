import { test, expect } from '@playwright/test';

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

test('every screen follows the active case', async ({ page, request }) => {
  test.setTimeout(90000);
  let cases: any[] = [];
  try {
    const res = await request.get('http://localhost:8000/api/v1/cases');
    if (res.ok()) {
      cases = await res.json();
    }
  } catch {
    // fallback if backend unavailable
  }

  if (!cases || cases.length === 0) {
    cases = [
      { id: 'CASE-2026-001', fir_number: 'FIR #149/2026', metadata_json: { complainant_name: 'Sunil Kumar' } },
      { id: 'CASE-2026-002', fir_number: 'FIR #882/2026', metadata_json: { complainant_name: 'Meera Nair' } },
      { id: 'CASE-2026-003', fir_number: 'FIR #104/2026', metadata_json: { complainant_name: 'Rajesh K. Singhania' } },
      { id: 'CASE-2026-004', fir_number: 'FIR #405/2026', metadata_json: { complainant_name: 'Pooja Hegde' } }
    ];
  }

  const markers: Record<string, string[]> = Object.fromEntries(
    cases.map((c: any) => [
      c.id,
      [c.metadata_json?.complainant_name || c.victim_name, c.fir_number].filter(Boolean)
    ])
  );

  for (const c of cases) {
    for (const view of ROUTES) {
      await page.goto(`http://localhost:5173/?case=${c.id}&view=${view}`);
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(600);

      // 1. Fingerprint check: every case-bound panel renders data from the active case
      const ids = await page
        .locator('[data-case-id]')
        .evaluateAll(els => [...new Set(els.map(e => e.getAttribute('data-case-id')).filter(Boolean))]);
      
      expect(ids, `${view} panels for ${c.id}`).toEqual([c.id]);

      const text = await page.locator('body').innerText();

      // 2. No other case's victim or FIR leaks in
      for (const [other, ms] of Object.entries(markers)) {
        if (other !== c.id) {
          for (const m of ms) {
            expect(text, `${view}: ${other} marker "${m}" leaked into ${c.id}`).not.toContain(m);
          }
        }
      }

      // 3. Never render broken values
      expect(text).not.toMatch(/\bundefined\b|\bNaN\b/);
    }
  }

  // 4. Unknown case -> not-found, never another case's data
  await page.goto('http://localhost:5173/?case=CASE-TEST-999&view=network');
  await page.waitForTimeout(600);
  await expect(page.getByText(/case not found/i)).toBeVisible();
});

test('in-app switch keeps the screen and updates the URL', async ({ page }) => {
  await page.goto('http://localhost:5173/?case=CASE-2026-001&view=network');
  await page.waitForTimeout(600);
  await page.getByRole('button', { name: /switch case|CASE-2026-001|FIR #149/i }).click();
  await page.getByText(/CASE-2026-002|Meera Nair/).first().click();
  await expect(page).toHaveURL(/case=CASE-2026-002/);
  await expect(page).toHaveURL(/view=network/);
  await expect(page.locator('body')).not.toContainText('Sunil Kumar');
});

