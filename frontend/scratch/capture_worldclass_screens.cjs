const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");

const ARTIFACT_DIR = "C:/Users/User/.gemini/antigravity/brain/249cd97f-a6aa-46cc-9ccf-37d2236e6dbe";

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    deviceScaleFactor: 1,
  });
  const page = await context.newPage();

  console.log("Navigating to http://127.0.0.1:5173...");
  await page.goto("http://127.0.0.1:5173", { waitUntil: "networkidle" });
  await page.waitForTimeout(1000);

  // Helper to click sidebar nav buttons by text
  const navTo = async (titleSubstring) => {
    const buttons = await page.$$("aside nav button");
    for (const b of buttons) {
      const title = (await b.getAttribute("title")) || "";
      if (title.includes(titleSubstring)) {
        await b.click();
        await page.waitForTimeout(600);
        return;
      }
    }
    console.log("Could not find nav button for:", titleSubstring);
  };

  const copyAndSave = async (filename) => {
    const localPath = path.join(__dirname, "../e2e/screens", filename);
    await page.screenshot({ path: localPath });
    const artifactPath = path.join(ARTIFACT_DIR, filename);
    fs.copyFileSync(localPath, artifactPath);
    console.log("Captured and saved:", filename);
  };

  // 1. Screen 1: Evidence Intake
  console.log("Capturing Screen 1: Intake...");
  await navTo("01 Evidence Intake");
  await copyAndSave("worldclass_screen1_intake.png");

  // 2. Screen 2: Attribution Screen - Lens 1 (CGNAT Funnel)
  console.log("Capturing Screen 2 Lens 1: CGNAT Funnel...");
  await navTo("02 CGNAT Attribution");
  // Click Lens 1 button
  const lens1Btn = await page.$("button:has-text('① CGNAT Intersection Funnel')");
  if (lens1Btn) await lens1Btn.click();
  await page.waitForTimeout(500);
  await copyAndSave("worldclass_screen2_lens1_cgnat.png");

  // Screen 2 - Lens 2: Hotspot Topology
  console.log("Capturing Screen 2 Lens 2: Hotspot Topology...");
  const lens2Btn = await page.$("button:has-text('② SIM-Swap & Wi-Fi Hotspot Topology')");
  if (lens2Btn) await lens2Btn.click();
  await page.waitForTimeout(500);
  await copyAndSave("worldclass_screen2_lens2_hotspot.png");

  // Screen 2 - Lens 3: Hardware Twin & Z3
  console.log("Capturing Screen 2 Lens 3: Hardware Twin & Z3...");
  const lens3Btn = await page.$("button:has-text('③ Hardware Twin, JA4 TLS & Z3 Clock Proof')");
  if (lens3Btn) await lens3Btn.click();
  await page.waitForTimeout(500);
  await copyAndSave("worldclass_screen2_lens3_hardware.png");

  // 3. Screen 3: Taint Engine - Mode 1 (DAG & Min-Cut)
  console.log("Capturing Screen 3 Mode 1: Taint DAG & Min-Cut...");
  await navTo("03 Taint & BNSS Liens");
  const mode1Btn = await page.$("button:has-text('Interactive Taint DAG & Min-Cut Optimizer')");
  if (mode1Btn) await mode1Btn.click();
  await page.waitForTimeout(500);
  await copyAndSave("worldclass_screen3_mode1_dag.png");

  // Screen 3 - Mode 2: MHA Orders
  console.log("Capturing Screen 3 Mode 2: Orders...");
  const mode2Btn = await page.$("button:has-text('MHA 2026 SOP Clock & BNSS Statutory Orders')");
  if (mode2Btn) await mode2Btn.click();
  await page.waitForTimeout(500);
  await copyAndSave("worldclass_screen3_mode2_orders.png");

  // 4. Screen 4: Court Proof Dossier - Tab 1 LOO
  console.log("Capturing Screen 4 Tab 1: LOO...");
  await navTo("04 Court Proof Dossier");
  const tab1Btn = await page.$("button:has-text('Leave-One-Out (LOO) Defense Stress-Tester')");
  if (tab1Btn) await tab1Btn.click();
  await page.waitForTimeout(500);
  await copyAndSave("worldclass_screen4_tab1_loo.png");

  // Screen 4 - Tab 2 Certificates
  console.log("Capturing Screen 4 Tab 2: Certificates...");
  const tab2Btn = await page.$("button:has-text('BSA §63(4) Split Certificates & Offline Verifier')");
  if (tab2Btn) await tab2Btn.click();
  await page.waitForTimeout(500);
  await copyAndSave("worldclass_screen4_tab2_certificates.png");

  // Screen 4 - Tab 3 Syndicate
  console.log("Capturing Screen 4 Tab 3: Syndicate...");
  const tab3Btn = await page.$("button:has-text('CBI ₹10.42 Cr Multi-State Syndicate & STR Audit')");
  if (tab3Btn) await tab3Btn.click();
  await page.waitForTimeout(500);
  await copyAndSave("worldclass_screen4_tab3_syndicate.png");

  await browser.close();
  console.log("All screenshots captured successfully!");
}

main().catch((err) => {
  console.error("Error capturing screenshots:", err);
  process.exit(1);
});

