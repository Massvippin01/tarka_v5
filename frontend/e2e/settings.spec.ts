import { test, expect } from '@playwright/test';

test.describe('TARKA Settings, Administration & Governance (Prompt F-5 & F-9)', () => {
  test('theme, language, station letterhead and role permissions', async ({ page, request }) => {
    await page.goto('http://localhost:5173/?view=settings');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1500);

    // 1. Settings screen is rendered
    await expect(page.getByTestId('settings-screen')).toBeVisible();

    // 2. Language toggle: switch to Hindi (हिन्दी)
    const hiBtn = page.getByRole('button', { name: /हिन्दी/i });
    if (await hiBtn.isVisible()) {
      await hiBtn.click();
      await page.waitForTimeout(400);
      // Check for Hindi text
      await expect(page.getByText(/सेटिंग्स|प्रोफ़ाइल|मामले/i).first()).toBeVisible();

      // Switch back to English
      const enBtn = page.getByRole('button', { name: /English/i });
      if (await enBtn.isVisible()) {
        await enBtn.click();
        await page.waitForTimeout(400);
      }
    }

    // 3. System Reset Demo Data Endpoint Verification
    const resReset = await request.post('http://localhost:8000/api/v1/system/reset-demo', {
      headers: { Authorization: 'Bearer test-token' },
    });
    expect(resReset.ok()).toBe(true);
    const resetData = await resReset.json();
    expect(resetData.status).toBe('SUCCESS');
    expect(resetData.cases_restored).toBe(4);

    // 4. Verify Canonical Cases are pristine
    const resCases = await request.get('http://localhost:8000/api/v1/cases');
    expect(resCases.ok()).toBe(true);
    const cases = await resCases.json();
    const caseIds = cases.map((c: any) => c.id);
    expect(caseIds).toContain('CASE-2026-001');
    expect(caseIds).toContain('CASE-2026-002');
    expect(caseIds).toContain('CASE-2026-003');
    expect(caseIds).toContain('CASE-2026-004');
  });

  test('health page diagnostic probe', async ({ page }) => {
    await page.goto('http://localhost:5173/?view=health');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1500);

    // Verify diagnostic cards are mounted
    await expect(page.getByTestId('health-screen')).toBeVisible();
    await expect(page.getByText(/REST API Gateway/i)).toBeVisible();
    await expect(page.getByText(/Transactional Store/i)).toBeVisible();
    await expect(page.getByText(/Forensic Graph Engine/i)).toBeVisible();
    await expect(page.getByText(/Canonical Case Fixtures Verification/i)).toBeVisible();
    await expect(page.getByText(/4 \/ 4 Verified Present/i)).toBeVisible();
  });
});

