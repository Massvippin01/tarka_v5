import { test, expect } from '@playwright/test';

const AUTH_HEADERS = { Authorization: 'Bearer test-token' };

test.describe('TARKA Case Lifecycle & Management (Prompt F-2 & F-9)', () => {
  test('valid and invalid lifecycle transitions with audit log validation', async ({ request }) => {
    const uid = Math.floor(Math.random() * 89999 + 10000);
    // 1. Create a transient test case in DRAFT
    const resCreate = await request.post('http://localhost:8000/api/v1/cases', {
      headers: AUTH_HEADERS,
      data: {
        case_number: `T${uid}`,
        title: 'E2E Test Phishing Syndicate',
        fir_number: `FIR #${uid}/2026`,
        crime_type: 'TASK_FRAUD',
        typology: 'TASK_FRAUD',
        priority: 'P1_CRITICAL',
        status: 'DRAFT',
        police_station: 'Noida Cyber Crime PS, UP',
        description: 'Automated Playwright lifecycle test',
        booked_loss_inr: 250000,
        claimed_loss_inr: 250000,
      },
    });
    expect(resCreate.ok()).toBe(true);
    const caseData = await resCreate.json();
    const caseId = caseData.id;

    // 2. Invalid Transition: DRAFT -> CLOSED directly should fail with 409 Conflict
    const resInvalid = await request.post(`http://localhost:8000/api/v1/cases/${caseId}/status`, {
      headers: AUTH_HEADERS,
      data: { status: 'CLOSED' },
    });
    expect(resInvalid.status()).toBe(409);
    const errData = await resInvalid.json();
    expect(errData.detail || errData.message).toContain('Invalid lifecycle transition');

    // 3. Valid Step-by-Step Lifecycle: DRAFT -> INTAKE -> INVESTIGATING -> ACTION_PENDING -> FROZEN -> COURT_READY -> CLOSED
    const validStates = ['INTAKE', 'INVESTIGATING', 'ACTION_PENDING', 'FROZEN', 'COURT_READY'];
    for (const st of validStates) {
      const resStep = await request.post(`http://localhost:8000/api/v1/cases/${caseId}/status`, {
        headers: AUTH_HEADERS,
        data: { status: st },
      });
      expect(resStep.ok()).toBe(true);
      expect((await resStep.json()).status).toBe(st);
    }

    // 4. Close Case with Checklist
    const resClose = await request.post(`http://localhost:8000/api/v1/cases/${caseId}/status`, {
      headers: AUTH_HEADERS,
      data: {
        status: 'CLOSED',
        reason: 'Statutory restitution secured under §106/§107 BNSS',
        closure_checklist: { chargesheet_filed: true, recovered_inr: 250000 },
      },
    });
    expect(resClose.ok()).toBe(true);
    expect((await resClose.json()).status).toBe('CLOSED');

    // 5. Archive Case (Read-Only)
    const resArchive = await request.post(`http://localhost:8000/api/v1/cases/${caseId}/archive`, {
      headers: AUTH_HEADERS,
    });
    expect(resArchive.ok()).toBe(true);
    expect((await resArchive.json()).status).toBe('ARCHIVED');

    // 6. Attempted mutation on ARCHIVED case must fail with 400 Bad Request
    const resPatchArchived = await request.patch(`http://localhost:8000/api/v1/cases/${caseId}`, {
      headers: AUTH_HEADERS,
      data: { title: 'Illegal Modification While Archived' },
    });
    expect(resPatchArchived.status()).toBe(400);

    // 7. Restore Case from Archive
    const resRestore = await request.post(`http://localhost:8000/api/v1/cases/${caseId}/restore`, {
      headers: AUTH_HEADERS,
    });
    expect(resRestore.ok()).toBe(true);
    expect((await resRestore.json()).status).toBe('CLOSED');

    // 8. Verify Audit Ledger records each step
    const resAudit = await request.get(`http://localhost:8000/api/v1/cases/${caseId}/audit`, {
      headers: AUTH_HEADERS,
    });
    expect(resAudit.ok()).toBe(true);
    const auditEvents = await resAudit.json();
    expect(auditEvents.length).toBeGreaterThanOrEqual(6);
  });

  test('draft deletion vs active case protection', async ({ request }) => {
    const uid1 = Math.floor(Math.random() * 89999 + 10000);
    // 1. Create a DRAFT case
    const resDraft = await request.post('http://localhost:8000/api/v1/cases', {
      headers: AUTH_HEADERS,
      data: {
        case_number: `DRAFT-${uid1}`,
        title: 'Transient Draft For Deletion',
        fir_number: `FIR #DRAFT-${uid1}/2026`,
        crime_type: 'DIGITAL_ARREST',
        typology: 'DIGITAL_ARREST',
        priority: 'P2_HIGH',
        status: 'DRAFT',
      },
    });
    expect(resDraft.ok()).toBe(true);
    const draftId = (await resDraft.json()).id;

    // 2. Delete DRAFT case succeeds
    const resDel = await request.delete(`http://localhost:8000/api/v1/cases/${draftId}`, {
      headers: AUTH_HEADERS,
    });
    expect(resDel.ok()).toBe(true);

    // 3. Confirm deletion
    const resCheck = await request.get(`http://localhost:8000/api/v1/cases/${draftId}`, {
      headers: AUTH_HEADERS,
    });
    expect(resCheck.status()).toBe(404);

    const uid2 = Math.floor(Math.random() * 89999 + 10000);
    // 4. Create an INTAKE case and verify deletion is blocked (409 Conflict)
    const resActive = await request.post('http://localhost:8000/api/v1/cases', {
      headers: AUTH_HEADERS,
      data: {
        case_number: `GUARD-${uid2}`,
        title: 'Active Case Deletion Guard',
        fir_number: `FIR #GUARD-${uid2}/2026`,
        crime_type: 'APK_SIM_SWAP',
        typology: 'APK_SIM_SWAP',
        priority: 'P1_CRITICAL',
        status: 'INTAKE',
      },
    });
    const activeId = (await resActive.json()).id;
    const resDelActive = await request.delete(`http://localhost:8000/api/v1/cases/${activeId}`, {
      headers: AUTH_HEADERS,
    });
    expect(resDelActive.status()).toBe(409);
    expect((await resDelActive.json()).detail).toContain('Only DRAFT cases can be deleted');
  });

  test('search and filter in switcher UI', async ({ page }) => {
    await page.goto('http://localhost:5173/?case=CASE-2026-001&view=network');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1000);

    // Open Upgraded Case Switcher
    const switcherBtn = page.getByRole('button', { name: /switch case|CASE-2026-001/i });
    if (await switcherBtn.isVisible()) {
      await switcherBtn.click();
      await page.waitForTimeout(400);

      // Search for Meera Nair (CASE-2026-002)
      const searchInput = page.getByPlaceholder(/search cases/i);
      if (await searchInput.isVisible()) {
        await searchInput.fill('Meera Nair');
        await page.waitForTimeout(300);
        await expect(page.getByText(/CASE-2026-002|Dr\. Meera Nair/i).first()).toBeVisible();
      }
    }
  });
});
