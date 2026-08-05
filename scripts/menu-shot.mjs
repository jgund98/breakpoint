/**
 * Opens the mobile navigation and captures it.
 *   node scripts/menu-shot.mjs [baseUrl] [route]
 */
import puppeteer from "puppeteer-core";
import path from "node:path";
import fs from "node:fs";

const BASE = process.argv[2] || "http://localhost:3510";
const ROUTE = process.argv[3] || "/app";
const OUT = path.join(process.cwd(), "shots", "app");
fs.mkdirSync(OUT, { recursive: true });

const CHROME =
  process.env.CHROME_PATH ||
  "C:/Program Files/Google/Chrome/Application/chrome.exe";

const browser = await puppeteer.launch({
  headless: true,
  executablePath: CHROME,
  args: ["--no-sandbox", "--hide-scrollbars"],
});

const page = await browser.newPage();
await page.setViewport({ width: 390, height: 844 });
await page.setCookie(
  {
    name: "bp_access",
    value: "e6d8d4d5557c63a0eb0913a1345b4b3b149f5ad3b20c9d1a28aae8abfb912e2a",
    url: BASE,
    path: "/",
  },
  { name: "bp_session", value: "demo-workspace-session-v1", url: BASE, path: "/" },
);

await page.goto(new URL(ROUTE, BASE).toString(), { waitUntil: "networkidle0" });
await new Promise((r) => setTimeout(r, 700));

const clicked = await page.evaluate(() => {
  const btn = document.querySelector('button[aria-label*="navigation" i]');
  if (!btn) return false;
  btn.click();
  return true;
});
console.log("hamburger clicked:", clicked);

await new Promise((r) => setTimeout(r, 600));

const geometry = await page.evaluate(() => {
  const q = (s) => document.querySelector(s);
  const rect = (el) => {
    if (!el) return null;
    const r = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    return {
      top: Math.round(r.top),
      left: Math.round(r.left),
      w: Math.round(r.width),
      h: Math.round(r.height),
      z: cs.zIndex,
      pos: cs.position,
      bg: cs.backgroundColor,
    };
  };
  return {
    header: rect(document.querySelector("header")),
    drawerPanel: rect(
      document.querySelector('div[class*="fixed inset-0"] > div:last-child'),
    ),
    bodyOverflow: getComputedStyle(document.body).overflow,
    scrollY: window.scrollY,
  };
});
console.log(JSON.stringify(geometry, null, 2));

await page.screenshot({ path: path.join(OUT, "menu-open-390.png") });
await browser.close();
console.log("shot: shots/app/menu-open-390.png");
