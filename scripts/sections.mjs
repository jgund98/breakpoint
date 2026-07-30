/** Captures each top-level section of a route as its own screenshot. */
import puppeteer from "puppeteer-core";
import fs from "node:fs";
import path from "node:path";

const BASE = process.argv[2] || "http://localhost:3510";
const ROUTE = process.argv[3] || "/";
const WIDTH = Number(process.argv[4] || 1440);
const OUT = path.join(process.cwd(), "shots", "sections");

fs.mkdirSync(OUT, { recursive: true });

const browser = await puppeteer.launch({
  headless: true,
  executablePath:
    process.env.CHROME_PATH ||
    "C:/Program Files/Google/Chrome/Application/chrome.exe",
  args: ["--no-sandbox", "--hide-scrollbars"],
});
const page = await browser.newPage();
await page.setViewport({ width: WIDTH, height: 1000 });
await page.goto(BASE + ROUTE, { waitUntil: "networkidle2", timeout: 60000 });
await page.evaluate(async () => {
  await document.fonts.ready;
});
// Trigger every whileInView animation. Smooth scrolling has to be off
// or scrollTo never actually lands and the observers never fire.
await page.evaluate(async () => {
  const html = document.documentElement;
  const prior = html.style.scrollBehavior;
  html.style.scrollBehavior = "auto";
  const step = window.innerHeight * 0.6;
  for (let y = 0; y < document.body.scrollHeight; y += step) {
    window.scrollTo(0, y);
    await new Promise((r) => setTimeout(r, 220));
  }
  window.scrollTo(0, 0);
  await new Promise((r) => setTimeout(r, 200));
  html.style.scrollBehavior = prior;
});
await new Promise((r) => setTimeout(r, 1600));

const slug = ROUTE === "/" ? "home" : ROUTE.replace(/\//g, "-").replace(/^-/, "");
const boxes = await page.evaluate(() =>
  [...document.querySelectorAll("main > *")].map((el, i) => {
    const r = el.getBoundingClientRect();
    return {
      i,
      top: Math.round(r.top + window.scrollY),
      height: Math.round(r.height),
    };
  }),
);

for (const b of boxes) {
  if (b.height < 60) continue;
  const clipH = Math.min(b.height, 4000);
  await page.screenshot({
    path: path.join(OUT, `${slug}-${WIDTH}-${String(b.i).padStart(2, "0")}.png`),
    clip: { x: 0, y: b.top, width: WIDTH, height: clipH },
    captureBeyondViewport: true,
  });
  console.log(`${slug}-${WIDTH}-${String(b.i).padStart(2, "0")}.png  h=${b.height}`);
}

await browser.close();
