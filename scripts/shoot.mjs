/**
 * Headless verification rig for the polish loop.
 *
 *   node scripts/shoot.mjs <baseUrl> [route,route,...]
 *
 * Captures every route at the four audit widths and reports the two
 * things that are impossible to eyeball reliably: horizontal overflow
 * (with the offending element) and single-word orphan lines in headings.
 */
import puppeteer from "puppeteer-core";
import fs from "node:fs";
import path from "node:path";

const BASE = process.argv[2] || "http://localhost:3510";
const ROUTES = (process.argv[3] || "/").split(",");
const OUT = path.join(process.cwd(), "shots");

const CHROME =
  process.env.CHROME_PATH ||
  "C:/Program Files/Google/Chrome/Application/chrome.exe";

const WIDTHS = [
  { w: 375, h: 812, tag: "375" },
  { w: 390, h: 844, tag: "390" },
  { w: 768, h: 1024, tag: "768" },
  { w: 1440, h: 900, tag: "1440" },
  { w: 1920, h: 1080, tag: "1920" },
];

const slug = (r) => (r === "/" ? "home" : r.replace(/\//g, "-").replace(/^-/, ""));

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await puppeteer.launch({
    headless: true,
    executablePath: CHROME,
    args: ["--no-sandbox", "--hide-scrollbars", "--force-device-scale-factor=1"],
  });

  const report = [];

  for (const route of ROUTES) {
    for (const vp of WIDTHS) {
      const page = await browser.newPage();
      await page.setViewport({
        width: vp.w,
        height: vp.h,
        deviceScaleFactor: vp.w <= 390 ? 2 : 1,
        isMobile: vp.w <= 390,
        hasTouch: vp.w <= 390,
      });

      const consoleErrors = [];
      page.on("console", (m) => {
        if (m.type() === "error") consoleErrors.push(m.text());
      });
      page.on("pageerror", (e) => consoleErrors.push(String(e)));

      await page.goto(BASE + route, {
        waitUntil: "networkidle2",
        timeout: 60000,
      });
      // Wait for fonts AND for layout to stop moving. On the dev server
      // Turbopack injects CSS asynchronously, so a naive delay can catch
      // a half-styled frame.
      await page.evaluate(async () => {
        await document.fonts.ready;
        let last = -1;
        for (let i = 0; i < 40; i++) {
          const h = document.body.scrollHeight;
          const fs = getComputedStyle(document.querySelector("h1") ?? document.body)
            .fontSize;
          const stamp = h + parseFloat(fs);
          if (stamp === last) return;
          last = stamp;
          await new Promise((r) => setTimeout(r, 100));
        }
      });
      await new Promise((r) => setTimeout(r, 900));

      const audit = await page.evaluate(() => {
        const docW = document.documentElement.clientWidth;

        // Elements that stick out past the viewport
        const offenders = [];
        for (const el of document.querySelectorAll("body *")) {
          const r = el.getBoundingClientRect();
          if (r.width === 0 || r.height === 0) continue;
          const style = getComputedStyle(el);
          if (style.position === "fixed") continue;
          if (r.right > docW + 1.5 || r.left < -1.5) {
            offenders.push({
              tag: el.tagName.toLowerCase(),
              cls: (el.className?.toString?.() || "").slice(0, 90),
              left: Math.round(r.left),
              right: Math.round(r.right),
            });
          }
        }

        // Single-word final lines in headings and ledes
        const orphans = [];
        const range = document.createRange();
        const sel = "h1, h2, h3, p.lede, .no-orphan";
        for (const el of document.querySelectorAll(sel)) {
          const text = el.textContent?.trim() || "";
          if (!text || text.length < 24) continue;
          // The LAST substantial text node — a paragraph's final line
          // lives there. Measuring the first node false-positives on any
          // paragraph containing <em>/<span> breaks.
          const nodes = [...el.childNodes].filter(
            (n) => n.nodeType === 3 && n.textContent.trim().length > 20,
          );
          const node = nodes[nodes.length - 1];
          if (!node) continue;
          range.selectNodeContents(node);
          const rects = [...range.getClientRects()];
          if (rects.length < 2) continue;
          const last = rects[rects.length - 1];
          const prev = rects[rects.length - 2];
          // A final line under 18% of the previous line's width reads as an orphan
          if (last.width < prev.width * 0.18) {
            orphans.push({
              tag: el.tagName.toLowerCase(),
              text: text.slice(0, 70),
              lastW: Math.round(last.width),
              prevW: Math.round(prev.width),
            });
          }
        }

        return {
          scrollW: document.documentElement.scrollWidth,
          clientW: docW,
          offenders: offenders.slice(0, 8),
          orphans: orphans.slice(0, 6),
          height: document.body.scrollHeight,
        };
      });

      const name = `${slug(route)}-${vp.tag}.png`;
      await page.screenshot({ path: path.join(OUT, name) });
      // also a full-page capture at the two key widths
      if (vp.tag === "375" || vp.tag === "1440") {
        await page.screenshot({
          path: path.join(OUT, `${slug(route)}-${vp.tag}-full.png`),
          fullPage: true,
        });
      }

      report.push({ route, vp: vp.tag, ...audit, consoleErrors });
      await page.close();
    }
  }

  await browser.close();

  // ---- report ----
  let problems = 0;
  for (const r of report) {
    const overflow = r.scrollW > r.clientW + 1;
    const flags = [];
    if (overflow) flags.push(`OVERFLOW ${r.scrollW}>${r.clientW}`);
    if (r.orphans.length) flags.push(`${r.orphans.length} orphan`);
    if (r.consoleErrors.length) flags.push(`${r.consoleErrors.length} console err`);
    const status = flags.length ? `❌ ${flags.join(" · ")}` : "✅";
    console.log(`${r.route.padEnd(14)} ${r.vp.padStart(4)}  ${status}`);
    if (overflow) {
      problems++;
      for (const o of r.offenders)
        console.log(`      ↳ <${o.tag}> ${o.left}..${o.right}  ${o.cls}`);
    }
    if (r.orphans.length) {
      problems++;
      for (const o of r.orphans)
        console.log(`      ↳ orphan in <${o.tag}> "${o.text}" (${o.lastW}px)`);
    }
    for (const e of r.consoleErrors.slice(0, 3)) {
      problems++;
      console.log(`      ↳ console: ${e.slice(0, 160)}`);
    }
  }
  console.log(`\n${problems === 0 ? "clean" : problems + " issue group(s)"} · shots → ${OUT}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
