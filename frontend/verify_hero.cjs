const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs');

async function run() {
  console.log("Launching system Chrome for Hero Section verification...");
  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu'],
    defaultViewport: { width: 1920, height: 1080 }
  });

  const page = await browser.newPage();
  const consoleErrors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });

  console.log("Navigating to http://127.0.0.1:5173/ ...");
  await page.goto('http://127.0.0.1:5173/', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await new Promise(r => setTimeout(r, 2000));

  const outDir = path.resolve(__dirname, '..', 'verification_screens');
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  // 1. Capture Full-Screen Hero Landing Section
  const p1 = path.join(outDir, '00_hero_landing_full.png');
  await page.screenshot({ path: p1 });
  console.log("Saved Hero Landing screenshot to:", p1);

  // Copy to assets/screenshots/ as well for GitHub presentation
  const assetsDir = path.resolve(__dirname, '..', 'assets', 'screenshots');
  if (fs.existsSync(assetsDir)) {
    fs.copyFileSync(p1, path.join(assetsDir, '00_hero_landing_full.png'));
    console.log("Copied Hero screenshot to assets/screenshots/00_hero_landing_full.png");
  }

  // 2. Click "initialize mission dashboard" or "enter flight deck" button
  console.log("Testing click on launch button to enter Dashboard...");
  await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button'));
    const btn = buttons.find(b => {
      const text = (b.textContent || '').toLowerCase();
      return text.includes('initialize mission dashboard') || text.includes('enter flight deck') || text.includes('launch command dashboard');
    });
    if (btn) btn.click();
  });
  await new Promise(r => setTimeout(r, 2000));

  // 3. Capture Dashboard after entering
  const p2 = path.join(outDir, '00_dashboard_entered_from_hero.png');
  await page.screenshot({ path: p2, clip: { x: 0, y: 0, width: 1920, height: 1080 } });
  console.log("Saved entered Dashboard screenshot to:", p2);

  // 4. Click "← HERO BRIEFING" to test seamless transition back
  console.log("Testing return to Hero briefing...");
  await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button'));
    const btn = buttons.find(b => b.textContent && b.textContent.includes('HERO BRIEFING'));
    if (btn) btn.click();
  });
  await new Promise(r => setTimeout(r, 1500));

  const p3 = path.join(outDir, '00_returned_to_hero.png');
  await page.screenshot({ path: p3 });
  console.log("Saved returned to Hero screenshot to:", p3);

  console.log("Console errors detected during session:", consoleErrors.length);
  await browser.close();
  console.log("Hero verification finished successfully!");
}

run().catch(err => {
  console.error("Hero verification script failed:", err);
  process.exit(1);
});

