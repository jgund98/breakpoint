/**
 * FULL-PRODUCT QA SWEEP
 *
 *   node scripts/qa-sweep.mjs [baseUrl]
 *
 * Walks every client and admin route at desktop width and reports,
 * per route:
 *   - console errors and failed requests
 *   - dead controls: <a> without href, buttons with no click handler
 *     (React attaches synthetic handlers; we detect the fiber props)
 *   - control-spec drift: buttons/inputs/selects whose rendered height
 *     is outside the sanctioned set (h-8 32, h-9 36, h-10 40, plus
 *     small pills), text below 10px, and any element overflowing the
 *     viewport horizontally
 * Read-only: navigates and inspects, clicks nothing, files nothing.
 */
import puppeteer from "puppeteer-core";

const BASE = process.argv[2] || "http://localhost:3510";
const CHROME =
  process.env.CHROME_PATH ||
  "C:/Program Files/Google/Chrome/Application/chrome.exe";

const CLIENT_ROUTES = [
  "/app",
  "/app/theo",
  "/app/locations",
  "/app/locations/AF-1007",
  "/app/clauses",
  "/app/exposure",
  "/app/landlords",
  "/app/coverage",
  "/app/activity",
  "/app/inbox",
  "/app/deadlines",
  "/app/notices",
  "/app/report",
  "/app/setup",
  "/app/settings",
  "/app/help",
];
const ADMIN_ROUTES = [
  "/admin",
  "/admin/clients",
  "/admin/clients/abercrombie-fitch",
  "/admin/onboarding",
  "/admin/requests",
  "/admin/extraction",
  "/admin/agent",
  "/admin/team",
  "/admin/system",
  "/onboarding",
];

async function login(page) {
  await page.setCookie({
    name: "bp_access",
    value: "e6d8d4d5557c63a0eb0913a1345b4b3b149f5ad3b20c9d1a28aae8abfb912e2a",
    url: BASE,
  });
  const r = await page.evaluate(async (base) => {
    const res = await fetch(base + "/login/api", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "admin@gmail.com", password: "password123" }),
    });
    return res.status;
  }, BASE);
  if (r !== 200) throw new Error("login failed: " + r);
}

async function auditRoute(page, route) {
  const errors = [];
  const onError = (e) => errors.push(String(e.message ?? e).slice(0, 160));
  const onConsole = (m) => {
    if (m.type() === "error") errors.push(m.text().slice(0, 160));
  };
  page.on("pageerror", onError);
  page.on("console", onConsole);

  await page.goto(BASE + route, { waitUntil: "networkidle2", timeout: 45000 });
  await new Promise((r) => setTimeout(r, 800));

  const audit = await page.evaluate(() => {
    const out = {
      deadAnchors: [],
      deadButtons: [],
      sizeDrift: [],
      tinyText: [],
      overflow: [],
      title: document.title,
      finalPath: location.pathname,
    };
    const label = (el) =>
      (el.getAttribute("aria-label") || el.textContent || "")
        .trim()
        .replace(/\s+/g, " ")
        .slice(0, 60) || "<unlabeled>";

    const visible = (el) => {
      const r = el.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) return false;
      const s = getComputedStyle(el);
      return s.visibility !== "hidden" && s.display !== "none";
    };

    const hasReactHandler = (el) => {
      /* React 19 attaches props under a __reactProps$ key */
      for (const k of Object.keys(el)) {
        if (k.startsWith("__reactProps$")) {
          const p = el[k];
          if (p && (p.onClick || p.onMouseDown || p.onSubmit || p.onChange))
            return true;
        }
      }
      return false;
    };

    for (const a of document.querySelectorAll("a")) {
      if (!visible(a)) continue;
      const href = a.getAttribute("href");
      if (!href || href === "#")
        out.deadAnchors.push(label(a));
    }

    for (const b of document.querySelectorAll("button")) {
      if (!visible(b)) continue;
      if (b.disabled) continue;
      if (b.type === "submit" && b.closest("form")) continue;
      if (b.closest("summary")) continue;
      if (!hasReactHandler(b) && !b.onclick) {
        /* a parent may own the handler (label wrapping, summary) */
        let p = b.parentElement;
        let owned = false;
        while (p && p !== document.body) {
          if (hasReactHandler(p)) {
            owned = true;
            break;
          }
          p = p.parentElement;
        }
        if (!owned) out.deadButtons.push(label(b));
      }
    }

    /* The control spec: solid controls sit at h-8/9/10 (32/36/40, with
       a couple of px of tolerance); TEXT buttons (transparent
       background, no border) may be line-height tall; CARD buttons
       (56px+) are the selectable-card idiom. Anything between the
       lanes is drift. */
    const OK_HEIGHTS = new Set([28, 30, 32, 34, 36, 38, 40, 42, 44]);
    for (const el of document.querySelectorAll("button, input, select, textarea")) {
      if (!visible(el)) continue;
      if (el.type === "checkbox" || el.type === "radio" || el.type === "hidden")
        continue;
      if (el.tagName === "TEXTAREA") continue;
      const h = Math.round(el.getBoundingClientRect().height);
      const s = getComputedStyle(el);
      const textButton =
        el.tagName === "BUTTON" &&
        (s.backgroundColor === "rgba(0, 0, 0, 0)" ||
          s.backgroundColor === "transparent") &&
        (s.borderStyle === "none" || parseFloat(s.borderWidth) === 0);
      if (textButton && h <= 26) continue;
      const cardButton = el.tagName === "BUTTON" && h >= 56;
      if (cardButton) continue;
      if (h > 18 && !OK_HEIGHTS.has(h) && (h < 26 || h > 46)) {
        out.sizeDrift.push(`${el.tagName.toLowerCase()} ${h}px "${label(el)}"`);
      }
    }

    for (const el of document.querySelectorAll("body *")) {
      const s = getComputedStyle(el);
      const fs = parseFloat(s.fontSize);
      if (
        fs > 0 &&
        fs < 10 &&
        el.textContent &&
        el.textContent.trim().length > 2 &&
        visible(el) &&
        el.children.length === 0
      ) {
        out.tinyText.push(`${Math.round(fs)}px "${label(el)}"`);
        if (out.tinyText.length > 5) break;
      }
    }

    const docW = document.documentElement.clientWidth;
    for (const el of document.querySelectorAll("body *")) {
      const r = el.getBoundingClientRect();
      if (r.right > docW + 2 && r.width > 40 && visible(el)) {
        const s = getComputedStyle(el);
        let p = el.parentElement;
        let scrolls = false;
        while (p) {
          const ps = getComputedStyle(p);
          if (/(auto|scroll)/.test(ps.overflowX)) {
            scrolls = true;
            break;
          }
          p = p.parentElement;
        }
        if (!scrolls && s.position !== "fixed") {
          out.overflow.push(`${el.tagName.toLowerCase()} +${Math.round(r.right - docW)}px "${label(el)}"`);
          if (out.overflow.length > 4) break;
        }
      }
    }

    /* dedupe */
    for (const k of ["deadAnchors", "deadButtons", "sizeDrift", "tinyText", "overflow"])
      out[k] = [...new Set(out[k])].slice(0, 10);
    return out;
  });

  page.off("pageerror", onError);
  page.off("console", onConsole);
  return { route, errors: [...new Set(errors)].slice(0, 5), ...audit };
}

const browser = await puppeteer.launch({
  headless: true,
  executablePath: CHROME,
  args: ["--no-sandbox"],
});
const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 900 });
await page.goto(BASE + "/unlock", { waitUntil: "domcontentloaded" }).catch(() => {});
await login(page);

let flagged = 0;
for (const route of [...CLIENT_ROUTES, ...ADMIN_ROUTES]) {
  const r = await auditRoute(page, route);
  const issues =
    r.errors.length +
    r.deadAnchors.length +
    r.deadButtons.length +
    r.sizeDrift.length +
    r.tinyText.length +
    r.overflow.length;
  const redirected =
    !r.finalPath.startsWith(route.split("?")[0]) && route !== r.finalPath;
  if (issues === 0 && !redirected) {
    console.log(`ok    ${route}`);
    continue;
  }
  flagged++;
  console.log(`FLAG  ${route}${redirected ? ` (landed on ${r.finalPath})` : ""}`);
  for (const e of r.errors) console.log(`        console: ${e}`);
  for (const a of r.deadAnchors) console.log(`        dead link: ${a}`);
  for (const b of r.deadButtons) console.log(`        dead button: ${b}`);
  for (const s of r.sizeDrift) console.log(`        size: ${s}`);
  for (const t of r.tinyText) console.log(`        tiny text: ${t}`);
  for (const o of r.overflow) console.log(`        overflow: ${o}`);
}

await browser.close();
console.log(flagged === 0 ? "\nSWEEP CLEAN" : `\n${flagged} route(s) flagged`);
