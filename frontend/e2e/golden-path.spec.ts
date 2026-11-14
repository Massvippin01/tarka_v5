import { test, expect } from '@playwright/test';
import path from 'path';
import fs from 'fs';

const AUTH_HEADERS = { Authorization: 'Bearer test-token' };

test.describe('TARKA Golden Path Acceptance Suite (Prompt F-9)', () => {
  const screenshotsDir = path.resolve('../docs/progress/f9');

  test.beforeAll(() => {
    fs.mkdirSync(screenshotsDir, { recursive: true });
  });

  test('end-to-end golden path workflow from dashboard to archived dossier', async ({ page, request }) => {
    // Standard hackathon presentation viewport: 1366x768
    await page.setViewportSize({ width: 1366, height: 768 });

    // -------------------------------------------------------------
    // Step 1: Sign In / Persona Switcher as Investigator
    // -------------------------------------------------------------
    await page.goto('http://localhost:5173/?case=CASE-2026-001&view=intake');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1500);

    const avatar = page.locator('[data-testid="sidebar-io-avatar"]');
    if (await avatar.isVisible()) {
      await avatar.click();
      await page.waitForTimeout(600);
      await page.screenshot({ path: path.join(screenshotsDir, 'f9_01_sign_in_1366.png'), fullPage: false });
      // Close modal by selecting active persona or clicking outside
      const closeBtn = page.getByRole('button', { name: /select|sign out/i }).first();
      if (await closeBtn.isVisible()) {
        await closeBtn.click();
        await page.waitForTimeout(400);
      }
    }

    // -------------------------------------------------------------
    // Step 2: Command Center Dashboard Overview
    // -------------------------------------------------------------
    await page.goto('http://localhost:5173/?view=workspace');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1500);

    await expect(page.getByTestId('saas-metric-banner')).toBeVisible();
    await page.screenshot({ path: path.join(screenshotsDir, 'f9_02_dashboard_1366.png'), fullPage: false });

    // -------------------------------------------------------------
    // Step 3: Ingest & Evidence Pipeline Verification
    // -------------------------------------------------------------
    await page.goto('http://localhost:5173/?case=CASE-2026-001&view=intake');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1500);

    await expect(page.locator('[data-case-id="CASE-2026-001"]').first()).toBeVisible();
    await page.screenshot({ path: path.join(screenshotsDir, 'f9_03_intake_evidence_1366.png'), fullPage: false });

    // -------------------------------------------------------------
    // Step 4: People & Accounts (Entity Resolution & Alias Merging)
    // -------------------------------------------------------------
    await page.goto('http://localhost:5173/?case=CASE-2026-001&view=entities');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1500);

    await expect(page.locator('[data-case-id="CASE-2026-001"]').first()).toBeVisible();
    await page.screenshot({ path: path.join(screenshotsDir, 'f9_04_people_accounts_1366.png'), fullPage: false });

    // -------------------------------------------------------------
    // Step 5: Money Trail (Taint Engine & Conservation Flow)
    // -------------------------------------------------------------
    await page.goto('http://localhost:5173/?case=CASE-2026-001&view=taint-engine');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1500);

    await expect(page.locator('[data-case-id="CASE-2026-001"]').first()).toBeVisible();
    await page.screenshot({ path: path.join(screenshotsDir, 'f9_05_money_trail_1366.png'), fullPage: false });

    // -------------------------------------------------------------
    // Step 6: Fraud Network Graph Topology
    // -------------------------------------------------------------
    await page.goto('http://localhost:5173/?case=CASE-2026-001&view=network');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1500);

    await expect(page.locator('[data-case-id="CASE-2026-001"]').first()).toBeVisible();
    await page.screenshot({ path: path.join(screenshotsDir, 'f9_06_fraud_network_1366.png'), fullPage: false });

    // -------------------------------------------------------------
    // Step 7: Statutory Actions & Bank Response Simulation
    // -------------------------------------------------------------
    await page.goto('http://localhost:5173/?case=CASE-2026-001&view=actions');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1500);

    // Click "Simulate Bank Response" if visible
    const simBtn = page.getByRole('button', { name: /simulate bank response/i });
    if (await simBtn.isVisible()) {
      await simBtn.click();
      await page.waitForTimeout(1000);
    }
    await page.screenshot({ path: path.join(screenshotsDir, 'f9_07_actions_frozen_1366.png'), fullPage: false });

    // -------------------------------------------------------------
    // Step 8: Admissible Formal Investigation Report (Section 6 Actions)
    // -------------------------------------------------------------
    await page.goto('http://localhost:5173/?case=CASE-2026-001&view=report');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1500);

    await expect(page.locator('[data-case-id="CASE-2026-001"]').first()).toBeVisible();
    await page.screenshot({ path: path.join(screenshotsDir, 'f9_08_report_actions_1366.png'), fullPage: false });

    // -------------------------------------------------------------
    // Step 9: Case Closure Transition (on transient test case)
    // -------------------------------------------------------------
    const transUid = Math.floor(Math.random() * 89999 + 10000);
    const transRes = await request.post('http://localhost:8000/api/v1/cases', {
      headers: AUTH_HEADERS,
      data: {
        case_number: `T${transUid}`,
        title: 'Golden Path Transient Test Case',
        fir_number: `FIR #${transUid}/2026`,
        crime_type: 'DIGITAL_ARREST',
        typology: 'DIGITAL_ARREST',
        priority: 'P1_CRITICAL',
        status: 'COURT_READY',
        police_station: 'Cyber Crime PS, New Delhi',
        description: 'Transient case for closure and archival verification',
        booked_loss_inr: 380000,
        claimed_loss_inr: 380000,
      },
    });
    expect(transRes.ok()).toBe(true);
    const transCase = await transRes.json();
    const transCaseId = transCase.id;

    // Perform status transition to CLOSED via backend
    await request.post(`http://localhost:8000/api/v1/cases/${transCaseId}/status`, {
      headers: AUTH_HEADERS,
      data: {
        status: 'CLOSED',
        reason: 'Statutory restitution secured under §106/§107 BNSS',
        closure_checklist: { chargesheet_filed: true, recovered_inr: 380000 },
      },
    });
    await page.goto(`http://localhost:5173/?case=${transCaseId}&view=intake`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(screenshotsDir, 'f9_09_case_closed_1366.png'), fullPage: false });

    // -------------------------------------------------------------
    // Step 10: Archive Case (Read-Only Enforcement on transient case)
    // -------------------------------------------------------------
    const resArch = await request.post(`http://localhost:8000/api/v1/cases/${transCaseId}/archive`, {
      headers: AUTH_HEADERS,
    });
    expect(resArch.ok()).toBe(true);

    await page.goto(`http://localhost:5173/?case=${transCaseId}&view=intake`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
    await expect(page.getByTestId('archived-case-banner')).toBeVisible();
    await page.screenshot({ path: path.join(screenshotsDir, 'f9_10_case_archived_1366.png'), fullPage: false });
  });
});
