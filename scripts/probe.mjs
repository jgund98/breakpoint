import puppeteer from "puppeteer-core";

const BASE = process.argv[2] || "http://localhost:3510";
const ROUTE = process.argv[3] || "/";
const SEL = process.argv[4] || "h1 span";

const browser = await puppeteer.launch({
  headless: true,
  executablePath:
    process.env.CHROME_PATH ||
    "C:/Program Files/Google/Chrome/Application/chrome.exe",
  args: ["--no-sandbox"],
});
const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 900 });
const errs = [];
page.on("console", (m) => m.type() === "error" && errs.push(m.text()));
page.on("pageerror", (e) => errs.push(String(e)));
await page.goto(BASE + ROUTE, { waitUntil: "networkidle2" });
await new Promise((r) => setTimeout(r, 1200));

const out = await page.evaluate((sel) => {
  const els = [...document.querySelectorAll(sel)];
  return els.map((el) => {
    const cs = getComputedStyle(el);
    const r = el.getBoundingClientRect();
    return {
      text: (el.textContent || "").trim().slice(0, 44),
      cls: el.className?.toString?.().slice(0, 120),
      fontSize: cs.fontSize,
      display: cs.display,
      w: Math.round(r.width),
      h: Math.round(r.height),
    };
  });
}, SEL);

console.log(JSON.stringify(out, null, 2));
if (errs.length) console.log("\nERRORS:\n" + errs.slice(0, 6).join("\n"));
await browser.close();
