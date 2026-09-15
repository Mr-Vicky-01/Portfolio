/* Render all icon formats from the authoritative SVG source. */
const fs = require('node:fs');
const path = require('node:path');
let chromium;
try { ({ chromium } = require('playwright')); }
catch { ({ chromium } = require('../.preview/node_modules/playwright')); }
(async () => {
  let executablePath = process.env.CHROME_PATH || chromium.executablePath();
  if (!fs.existsSync(executablePath) && process.platform === 'win32') {
    const cache = path.dirname(path.dirname(path.dirname(executablePath)));
    executablePath = fs.readdirSync(cache).filter(name => /^chromium-\d+$/.test(name))
      .sort((a, b) => Number(b.split('-')[1]) - Number(a.split('-')[1]))
      .map(name => path.join(cache, name, 'chrome-win64', 'chrome.exe'))
      .find(candidate => fs.existsSync(candidate));
    if (!executablePath) throw new Error('Install a Playwright browser or set CHROME_PATH.');
  }
  const browser = await chromium.launch({ headless: true, executablePath });
  try {
    const page = await browser.newPage({ viewport: { width: 1024, height: 1024 } });
    const svg = fs.readFileSync(path.join(__dirname, '../favicon.svg'), 'utf8');
    await page.setContent(`<style>html,body{margin:0;background:transparent}svg{display:block;width:1024px;height:1024px}</style>${svg}`);
    await page.screenshot({ path: process.argv[2], omitBackground: true });
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
