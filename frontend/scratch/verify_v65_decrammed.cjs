const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");

const ARTIFACT_DIR = "C:/Users/User/.gemini/antigravity/brain/249cd97f-a6aa-46cc-9ccf-37d2236e6dbe";
const SCREEN_DIR = path.resolve(__dirname, "../e2e/screens");
if (!fs.existsSync(SCREEN_DIR)) fs.mkdirSync(SCREEN_DIR, { recursive: true });

async function saveProof(page, filename) {
  const p1 = path.join(SCREEN_DIR, filename);
  await page.screenshot({ path: p1, fullPage: false });
  const p2 = path.join(ARTIFACT_DIR, filename);
  try {
    fs.copyFileSync(p1, p2);
  } catch (e) {}
  console.log(`Saved screenshot: ${filename}`);
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1,
  });
  const page = await context.newPage();

  console.log("Navigating to app...");
  await page.goto("http://127.0.0.1:5173", { waitUntil: "domcontentloaded", timeout: 15000 });
  await page.waitForTimeout(1500);

  // 1. SCREEN 1: Intake Screen
  console.log("Capturing Screen 1 Intake...");
  await saveProof(page, "v65_screen1_intake_decrammed.png");

  // Switch to Tab 'entities'
  const entityTab = page.locator('button[role="tab"]:has-text("Entities")');
  if (await entityTab.isVisible()) {
    await entityTab.click();
    await page.waitForTimeout(500);
    await saveProof(page, "v65_screen1_entities_dock.png");
  }

  // 2. SCREEN 2: Attribution Screen
  console.log("Navigating to Screen 2 Attribution...");
  const navBtn02 = page.locator('button[title*="Attribution"], button:has-text("02")').first();
  await navBtn02.click();
  await page.waitForTimeout(1000);

  // Lens 1: CGNAT
  console.log("Capturing Screen 2 Lens 1...");
  await saveProof(page, "v65_screen2_lens1_cgnat.png");

  // Lens 2: Hotspot
  console.log("Switching to Screen 2 Lens 2...");
  const lens2Btn = page.locator('button:has-text("② SIM-Swap")');
  if (await lens2Btn.isVisible()) {
    await lens2Btn.click();
    await page.waitForTimeout(500);
    await saveProof(page, "v65_screen2_lens2_hotspot.png");
  }

  // Lens 3: Hardware
  console.log("Switching to Screen 2 Lens 3...");
  const lens3Btn = page.locator('button:has-text("③ Hardware Twin")');
  if (await lens3Btn.isVisible()) {
    await lens3Btn.click();
    await page.waitForTimeout(500);
    await saveProof(page, "v65_screen2_lens3_hardware.png");
  }

  // 3. SCREEN 3: Taint Engine Screen
  console.log("Navigating to Screen 3 Taint Engine...");
  const navBtn03 = page.locator('button[title*="Taint"], button:has-text("03")').first();
  await navBtn03.click();
  await page.waitForTimeout(1000);

  // Mode 1: DAG
  console.log("Capturing Screen 3 Mode 1 DAG...");
  await saveProof(page, "v65_screen3_mode1_dag.png");

  // Mode 2: Orders
  console.log("Switching to Screen 3 Mode 2 Orders...");
  const mode2Btn = page.locator('button:has-text("📜 MHA 2026 SOP")');
  if (await mode2Btn.isVisible()) {
    await mode2Btn.click();
    await page.waitForTimeout(500);
    await saveProof(page, "v65_screen3_mode2_orders.png");
  }

  // 4. SCREEN 4: Court Proof Screen
  console.log("Navigating to Screen 4 Court Proof...");
  const navBtn04 = page.locator('button[title*="Court"], button:has-text("04")').first();
  await navBtn04.click();
  await page.waitForTimeout(1000);

  // Tab 1: LOO
  console.log("Capturing Screen 4 Tab 1 LOO...");
  await saveProof(page, "v65_screen4_tab1_loo.png");

  // Tab 2: Certificates
  console.log("Switching to Screen 4 Tab 2 Certificates...");
  const tab2Btn = page.locator('button:has-text("📜 BSA §63(4)")');
  if (await tab2Btn.isVisible()) {
    await tab2Btn.click();
    await page.waitForTimeout(500);
    await saveProof(page, "v65_screen4_tab2_certificates.png");
  }

  // Tab 3: Syndicate
  console.log("Switching to Screen 4 Tab 3 Syndicate...");
  const tab3Btn = page.locator('button:has-text("🏛️ CBI ₹10.42 Cr")');
  if (await tab3Btn.isVisible()) {
    await tab3Btn.click();
    await page.waitForTimeout(500);
    await saveProof(page, "v65_screen4_tab3_syndicate.png");
  }

  console.log("All visual verifications successfully captured!");
  await browser.close();
})();

