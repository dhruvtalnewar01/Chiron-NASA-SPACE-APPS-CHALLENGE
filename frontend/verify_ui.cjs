const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs');

async function run() {
  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu'],
    defaultViewport: { width: 1920, height: 1080 }
  });

  const page = await browser.newPage();
  await page.goto('http://127.0.0.1:5173/', { waitUntil: 'networkidle0', timeout: 30000 });
  await new Promise(r => setTimeout(r, 2000));

  const outDir = path.resolve(__dirname, '..', 'verification_screens');

  // Screenshot Row 3: Conformal chart & VoI planner + bottom of Row 2 (Card 07)
  const p4 = path.join(outDir, '04_card07_and_conformal.png');
  await page.screenshot({
    path: p4,
    clip: { x: 260, y: 1350, width: 1640, height: 950 }
  });
  console.log("Saved Card 07 & conformal chart screenshot to:", p4);

  // Screenshot Row 4: Orbital & Buddy-Care Audit
  const p5 = path.join(outDir, '05_orbital_and_buddycare.png');
  await page.screenshot({
    path: p5,
    clip: { x: 260, y: 2200, width: 1640, height: 950 }
  });
  console.log("Saved Orbital & Buddy-care screenshot to:", p5);

  // Click "3D WEBGL TWIN" button using page.evaluate to find by text content
  console.log("Clicking 3D WEBGL TWIN...");
  await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button'));
    const btn = buttons.find(b => b.textContent && b.textContent.includes('3D WEBGL TWIN'));
    if (btn) btn.click();
  });
  await new Promise(r => setTimeout(r, 2000));

  const p6 = path.join(outDir, '06_webgl_3d_twin_active.png');
  await page.screenshot({
    path: p6,
    clip: { x: 260, y: 700, width: 1640, height: 1000 }
  });
  console.log("Saved WebGL 3D Twin active screenshot to:", p6);

  // Click "HOW WE BUILT 3D MODEL"
  console.log("Clicking HOW WE BUILT 3D MODEL...");
  await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button'));
    const btn = buttons.find(b => b.textContent && b.textContent.includes('HOW WE BUILT'));
    if (btn) btn.click();
  });
  await new Promise(r => setTimeout(r, 1000));

  const p7 = path.join(outDir, '07_modal_how_we_built.png');
  await page.screenshot({ path: p7 });
  console.log("Saved HOW WE BUILT modal screenshot to:", p7);

  // Close modal
  await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button'));
    const btn = buttons.find(b => b.textContent && b.textContent.includes('DISMISS'));
    if (btn) btn.click();
  });
  await new Promise(r => setTimeout(r, 500));

  // Click "FULL SIZE CLINICAL VIEW"
  console.log("Clicking FULL SIZE CLINICAL VIEW...");
  await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button'));
    const btn = buttons.find(b => b.textContent && b.textContent.includes('FULL SIZE CLINICAL VIEW'));
    if (btn) btn.click();
  });
  await new Promise(r => setTimeout(r, 1000));

  const p8 = path.join(outDir, '08_modal_full_size_clinical.png');
  await page.screenshot({ path: p8 });
  console.log("Saved FULL SIZE CLINICAL modal screenshot to:", p8);

  await browser.close();
  console.log("All interactive screenshots saved successfully!");
}

run().catch(err => {
  console.error("Puppeteer script failed:", err);
  process.exit(1);
});
