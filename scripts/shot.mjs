// Dev helper: screenshot a page after scripted key presses / clicks.
// Tip: for signed-in pages use http://localhost:3000/dev/login?next=/shop as the URL.
// Usage: node scripts/shot.mjs <url> <out.png> [key:Enter] [key:1] [click:<css>] [type:<text>] [goto:/path] [wait:300] [shot:<file.png>]
import { createRequire } from "module"; const require = createRequire(import.meta.url); let pw; try { pw = require("playwright"); } catch { pw = require("/opt/node-tools/node_modules/playwright"); } const { chromium } = pw;
const [,, url, out, ...actions] = process.argv;
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
await page.goto(url, { waitUntil: "networkidle", timeout: 120000 });
for (const a of actions) {
  if (a.startsWith("key:")) await page.keyboard.press(a.slice(4));
  else if (a.startsWith("click:")) await page.click(a.slice(6));
  else if (a.startsWith("type:")) await page.keyboard.type(a.slice(5));
  else if (a.startsWith("goto:")) await page.goto(new URL(a.slice(5), url).href, { waitUntil: "networkidle" });
  else if (a.startsWith("wait:")) await page.waitForTimeout(Number(a.slice(5)));
  else if (a.startsWith("shot:")) await page.screenshot({ path: a.slice(5) });
}
await page.waitForTimeout(600);
await page.screenshot({ path: out });
console.log("errors:", JSON.stringify(errors.slice(0, 5)));
await browser.close();
