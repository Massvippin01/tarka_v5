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

  const screens = [
    { id: "intake", route: "?view=intake", name: "v7_screen1_intake.png", title: "01 Intake & Falsification Gate" },
    { id: "entities", route: "?view=entities", name: "v7_screen2_entities.png", title: "02 Entity Resolution Framework" },
    { id: "attribution", route: "?view=attribution", name: "v7_screen3_attribution.png", title: "03 Fraud Attribution & SIM-Swap" },
    { id: "network", route: "?view=network", name: "v7_screen4_network.png", title: "04 Fraud-Network & Relationships" },
    { id: "taint-engine", route: "?view=taint-engine", name: "v7_screen5_taint.png", title: "05 Transaction Flow & Mule DAG" },
    { id: "court-proof", route: "?view=court-proof", name: "v7_screen6_courtproof.png", title: "06 Actionable Intel & BSA §63(4)" },
  ];

  for (const scr of screens) {
    console.log(`\nNavigating to Screen ${scr.title} (${scr.route})...`);
    await page.goto(`http://127.0.0.1:5173/${scr.route}`, { waitUntil: "networkidle" });
    await page.waitForTimeout(800);

    // Check scroll height vs client height
    const scrollInfo = await page.evaluate(() => {
      return {
        bodyScrollHeight: document.body.scrollHeight,
        bodyClientHeight: document.body.clientHeight,
        docScrollHeight: document.documentElement.scrollHeight,
        docClientHeight: document.documentElement.clientHeight,
        hasOuterScroll: document.documentElement.scrollHeight > document.documentElement.clientHeight,
      };
    });
    console.log(`[${scr.title}] Scroll Check:`, scrollInfo);

    const localPath = path.join(__dirname, "../e2e/screens", scr.name);
    fs.mkdirSync(path.dirname(localPath), { recursive: true });
    await page.screenshot({ path: localPath });
    const artifactPath = path.join(ARTIFACT_DIR, scr.name);
    fs.copyFileSync(localPath, artifactPath);
    console.log(`Captured and saved: ${scr.name}`);
  }

  await browser.close();
  console.log("\nAll 6 screens captured and verified successfully!");
}

main().catch((err) => {
  console.error("Error capturing v7 screens:", err);
  process.exit(1);
});

