/**
 * Workspace verification rig.
 *
 *   node scripts/app-shoot.mjs [baseUrl] [route,route,...]
 *
 * Same job as shoot.mjs, but it plants the preview-gate cookie first so
 * the product routes behind the lock can be audited, and it reports
 * console errors, horizontal overflow and heading orphans per width.
 */
import puppeteer from "puppeteer-core";
import fs from "node:fs";
import path from "node:path";

const BASE = process.argv[2] || "http://localhost:3510";
const ROUTES = (
  process.argv[3] || "/app,/app/locations,/app/cascade,/app/notices,/onboarding"
).split(",");
const OUT = path.join(process.cwd(), "shots", "app");

const CHROME =
  process.env.CHROME_PATH ||
  "C:/Program Files/Google/Chrome/Application/chrome.exe";

const GATE_COOKIE = "bp_access";
const GATE_TOKEN =
  "e6d8d4d5557c63a0eb0913a1345b4b3b149f5ad3b20c9d1a28aae8abfb912e2a";

const WIDTHS = [
  { w: 390, h: 844, tag: "390" },
  { w: 768, h: 1024, tag: "768" },
  { w: 1440, h: 900, tag: "1440" },
];

const slug = (r) => r.replace(/\//g, "-").replace(/^-/, "") || "root";

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await puppeteer.launch({
    headless: true,
    executablePath: CHROME,
    args: ["--no-sandbox", "--hide-scrollbars", "--force-device-scale-factor=1"],
  });

  const report = [];

  for (const route of ROUTES) {
    for (const { w, h, tag } of WIDTHS) {
      const page = await browser.newPage();
      await page.setViewport({ width: w, height: h });

      const errors = [];
      page.on("console", (m) => {
        const t = m.text();
        // Next's dev tooling emits generic resource failures that say
        // nothing about the page. Real failures are captured by the
        // response listener below, which knows the URL.
        if (m.type() === "error" && !t.includes("Failed to load resource"))
          errors.push(t.slice(0, 180));
      });
      page.on("pageerror", (e) => errors.push(`pageerror: ${e.message.slice(0, 180)}`));
      page.on("response", (res) => {
        const status = res.status();
        const url = res.url();
        if (status < 400) return;
        // dev-only endpoints: HMR, the devtools overlay, source maps
        if (/__nextjs|_next\/static\/chunks\/.*\.map|hmr|turbopack/i.test(url))
          return;
        errors.push(`${status} ${url.replace(BASE, "").slice(0, 120)}`);
      });

      const url = new URL(route, BASE).toString();
      await page.setCookie({
        name: GATE_COOKIE,
        value: GATE_TOKEN,
        url: BASE,
        path: "/",
      });

      await page.goto(url, { waitUntil: "networkidle0", timeout: 45000 });
      await new Promise((r) => setTimeout(r, 900));

      const audit = await page.evaluate(() => {
        const docW = document.documentElement.clientWidth;
        const offenders = [];
        for (const el of document.querySelectorAll("body *")) {
          const r = el.getBoundingClientRect();
          if (r.width === 0 || r.height === 0) continue;
          if (r.right > docW + 1.5 || r.left < -1.5) {
            const style = getComputedStyle(el);
            if (style.position === "fixed") continue;
            // ignore anything inside a deliberate horizontal scroller
            let p = el.parentElement,
              inScroller = false;
            while (p) {
              const ps = getComputedStyle(p);
              if (ps.overflowX === "auto" || ps.overflowX === "scroll") {
                inScroller = true;
                break;
              }
              p = p.parentElement;
            }
            if (inScroller) continue;
            offenders.push(
              `${el.tagName.toLowerCase()}.${(el.className || "").toString().split(" ")[0]} right=${Math.round(r.right)}`,
            );
          }
        }

        const orphans = [];
        for (const hEl of document.querySelectorAll("h1,h2,h3")) {
          const text = (hEl.textContent || "").trim();
          if (!text.includes(" ")) continue;
          const range = document.createRange();
          range.selectNodeContents(hEl);
          // getClientRects returns one rect per inline box, not per line,
          // so a heading containing a <span> false-positives unless the
          // boxes are grouped back into lines by their vertical position.
          const lines = new Map();
          for (const r of range.getClientRects()) {
            if (r.width === 0) continue;
            const key = Math.round(r.top);
            const cur = lines.get(key);
            if (cur) {
              cur.left = Math.min(cur.left, r.left);
              cur.right = Math.max(cur.right, r.right);
            } else lines.set(key, { left: r.left, right: r.right });
          }
          if (lines.size < 2) continue;
          const widths = [...lines.values()].map((l) => l.right - l.left);
          const last = widths[widths.length - 1];
          const lastWord = text.split(/\s+/).pop() || "";
          if (last < 90 && lastWord.length < 12)
            orphans.push(`${text.slice(0, 60)} [last line ${Math.round(last)}px]`);
        }

        return {
          scrollW: document.documentElement.scrollWidth,
          docW,
          offenders: offenders.slice(0, 5),
          orphans: orphans.slice(0, 4),
          headings: document.querySelectorAll("h1").length,
        };
      });

      await page.screenshot({
        path: path.join(OUT, `${slug(route)}-${tag}.png`),
        fullPage: true,
      });

      report.push({
        route,
        width: tag,
        overflow: audit.scrollW > audit.docW + 1 ? audit.scrollW - audit.docW : 0,
        offenders: audit.offenders,
        orphans: audit.orphans,
        errors,
      });

      await page.close();
    }
  }

  await browser.close();

  let bad = 0;
  for (const r of report) {
    const issues = [];
    if (r.overflow) issues.push(`overflow +${r.overflow}px [${r.offenders.join(" | ")}]`);
    if (r.orphans.length) issues.push(`orphans: ${r.orphans.join(" / ")}`);
    if (r.errors.length) issues.push(`console: ${r.errors.join(" | ")}`);
    if (issues.length) {
      bad++;
      console.log(`FAIL ${r.route} @${r.width}\n   ${issues.join("\n   ")}`);
    } else {
      console.log(`ok   ${r.route} @${r.width}`);
    }
  }
  console.log(`\n${report.length - bad}/${report.length} clean. Shots in ${OUT}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
