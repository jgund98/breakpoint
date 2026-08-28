/**
 * Drives the weekly check screen for real.
 *
 * A screenshot proves it renders. This proves it works, and it tests the
 * two cases that matter in opposite directions:
 *
 *   1. a partial paste must be REFUSED, because four names against a two
 *      hundred store roster is a bad copy, not two hundred closures
 *   2. a full listing with one named anchor missing must produce exactly
 *      one confirmable change and move the clause
 *
 * The second case is the product. The first is the reason it can be
 * trusted by someone working quickly.
 */
import puppeteer from "puppeteer-core";
import fs from "node:fs";

const BASE = process.argv[2] || "http://localhost:3510";
const CHROME =
  process.env.CHROME_PATH || "C:/Program Files/Google/Chrome/Application/chrome.exe";

/** React ignores .value assignment; go through the native setter. */
const setTextarea = (page, v) =>
  page.evaluate((val) => {
    const t = document.querySelector("textarea");
    const setter = Object.getOwnPropertyDescriptor(
      window.HTMLTextAreaElement.prototype,
      "value",
    ).set;
    setter.call(t, val);
    t.dispatchEvent(new Event("input", { bubbles: true }));
  }, v);

const browser = await puppeteer.launch({
  headless: true,
  executablePath: CHROME,
  args: ["--no-sandbox"],
});
const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 1200 });

const errors = [];
page.on("pageerror", (e) => errors.push(String(e)));

const origin = new URL(BASE).origin;
await page.setCookie(
  {
    name: "bp_access",
    value: "e6d8d4d5557c63a0eb0913a1345b4b3b149f5ad3b20c9d1a28aae8abfb912e2a",
    url: origin,
  },
  { name: "bp_session", value: "demo-workspace-session-v1", url: origin },
);

await page.goto(`${BASE}/app/check`, { waitUntil: "networkidle0" });

/* ---- case 1: partial paste ---- */
await setTextarea(page, "Sephora\nH&M\nGucci\nCoach");
await new Promise((r) => setTimeout(r, 600));
const partial = await page.evaluate(() => document.body.innerText);
const refused = /This listing looks incomplete/.test(partial);
const boxes1 = await page.$$("button[aria-pressed]");

console.log("--- case 1: partial paste (4 names) ---");
console.log(`  refused:              ${refused ? "yes (correct)" : "NO — WRONG"}`);
console.log(`  confirmable changes:  ${boxes1.length} (want 0)`);
const detail = partial.match(/It accounts for [^.]*\./);
if (detail) console.log(`  message:              ${detail[0]}`);

/* ---- case 2: full listing, one named anchor removed ---- */
const file = JSON.parse(
  fs.readFileSync("src/lib/data/af-portfolio.json", "utf8"),
);
/* Pick a location whose clause names a store that is currently open, so
   removing it is a real change. Not every location has one: Ala Moana's
   only named anchor is already dark, which is why it is failing. */
const watchedOf = (l) => {
  const w = new Set();
  for (const tr of l.clauses[0].triggers) {
    if (tr.kind === "named_tenant") tr.names.forEach((n) => w.add(n));
    if (tr.kind === "tenant_count") tr.pool.forEach((n) => w.add(n));
  }
  return w;
};
let loc, drop;
for (const l of file.locations) {
  const w = watchedOf(l);
  const hit = l.center.suites.find((s) => w.has(s.id) && s.status === "open");
  if (hit) {
    loc = l;
    drop = hit;
    break;
  }
}
if (!loc) throw new Error("no location has an open store its clause names");

/* The screen defaults to the first center, so select the one under test.
   The rail rows carry a watched-count badge after the name, so match on
   inclusion rather than equality. */
await page.evaluate((name) => {
  const btn = [...document.querySelectorAll("button")].find((b) =>
    b.textContent?.includes(name),
  );
  btn?.click();
}, loc.center.name);
await new Promise((r) => setTimeout(r, 500));
const listing = loc.center.suites
  .filter((s) => s.status === "open" && s.id !== drop.id)
  .map((s) => s.name)
  .join("\n");

console.log(`\n--- case 2: ${loc.center.name}, ${drop.name} removed ---`);

await setTextarea(page, listing);
await new Promise((r) => setTimeout(r, 800));

const boxes2 = await page.$$("button[aria-pressed]");
const body2 = await page.evaluate(() => document.body.innerText);
const rows = await page.evaluate(() => [...document.querySelectorAll("li")].filter(li=>li.querySelector("button[aria-pressed]")).map(li=>li.innerText.replace(/s+/g," ").trim()));
console.log("  rows:"); rows.forEach(r=>console.log("    "+r));
console.log(`  confirmable changes:  ${boxes2.length} (want 1)`);
console.log(`  names the clause uses flagged: ${/Named by the clause/.test(body2) ? "yes" : "no"}`);

if (boxes2.length) {
  await boxes2[0].click();
  await new Promise((r) => setTimeout(r, 800));
  const after = await page.evaluate(() => document.body.innerText);
  const i = after.indexOf("Effect on the clause");
  console.log("\n  --- clause impact ---");
  console.log(
    i >= 0
      ? after
          .slice(i, i + 260)
          .split("\n")
          .filter(Boolean)
          .map((l) => "  " + l)
          .join("\n")
      : "  NOT RENDERED",
  );
}

console.log(`\nconsole errors: ${errors.length}`);
await browser.close();
process.exit(refused && boxes1.length === 0 && boxes2.length === 1 && errors.length === 0 ? 0 : 1);
