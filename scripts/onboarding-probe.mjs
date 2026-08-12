/**
 * Exercises the onboarding workspace the way a client team would, then
 * reloads the page to prove the work survived.
 *
 * Persistence is the whole premise of this screen: it runs over days
 * across several people, so "it saved" is not a detail, it is the
 * feature. A screenshot cannot tell you it worked; only closing the page
 * and coming back can.
 */
import puppeteer from "puppeteer-core";

const BASE = process.argv[2] || "http://localhost:3510";
const CHROME =
  process.env.CHROME_PATH || "C:/Program Files/Google/Chrome/Application/chrome.exe";

const ROSTER = [
  "Store #,Street Address,City,ST,Zip,Property Name,Landlord Entity,Rentable SF,Annual Rent,Lease Start,Lease End,Status",
  "4417,7007 Friars Road,San Diego,CA,92108,Fashion Valley,Fashion Valley Mall LLC,8302,747180,2018-03-01,2031-01-31,open",
  "4422,7 Backus Avenue,Danbury,CT,06810,Danbury Fair,Danbury Mall LLC,5100,397000,2019-09-01,2030-01-31,open",
  "4417,1 Dup Way,Toledo,OH,43617,Franklin Park Mall,Franklin LLC,4000,236000,2020-01-01,2032-01-31,open",
  "4431,55 Bad State Rd,Somewhere,ZZ,00000,Some Mall,Some LLC,4200,250000,2020-01-01,2031-01-31,open",
].join("\n");

const browser = await puppeteer.launch({
  headless: true,
  executablePath: CHROME,
  args: ["--no-sandbox"],
});
const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 1400 });
const errors = [];
page.on("pageerror", (e) => errors.push(String(e)));

await page.setCookie({
  name: "bp_access",
  value: "e6d8d4d5557c63a0eb0913a1345b4b3b149f5ad3b20c9d1a28aae8abfb912e2a",
  url: new URL(BASE).origin,
});

const pause = (ms = 450) => new Promise((r) => setTimeout(r, ms));
const body = () => page.evaluate(() => document.body.innerText);

const clickText = (needle, exact = false) =>
  page.evaluate(
    (n, ex) => {
      const b = [...document.querySelectorAll("button")].find((x) => {
        const t = (x.textContent || "").trim();
        return ex ? t === n : t.includes(n);
      });
      if (b) b.click();
      return !!b;
    },
    needle,
    exact,
  );

const openTask = (title) =>
  page.evaluate((t) => {
    const b = [...document.querySelectorAll("aside button")].find((x) =>
      (x.textContent || "").includes(t),
    );
    if (b) b.click();
    return !!b;
  }, title);

const progress = async () => {
  const t = await body();
  const m = /(\d+) of (\d+) complete/.exec(t);
  return m ? `${m[1]} of ${m[2]}` : "—";
};

await page.goto(`${BASE}/onboarding?client=Abercrombie%20%26%20Fitch&stores=830`, {
  waitUntil: "networkidle0",
});

/* Start from a known state. */
await clickText("Clear everything");
await pause(400);

const tasks = await page.evaluate(() =>
  [...document.querySelectorAll("aside button")]
    .map((b) => (b.textContent || "").replace(/\s+/g, " ").trim())
    .filter((t) => t && !/clear everything/i.test(t)),
);
console.log(`tasks on the board: ${tasks.length}`);
tasks.forEach((t) => console.log(`  - ${t}`));
console.log(`progress at start: ${await progress()}`);

/* ---- portfolio ---- */
await openTask("Store portfolio");
await pause();
await clickText("A spreadsheet we maintain");
await pause();
await page.evaluate(() => {
  const d = [...document.querySelectorAll("details")].find((x) =>
    /paste it instead/i.test(x.textContent || ""),
  );
  if (d) d.open = true;
});
await pause(250);
await page.evaluate((v) => {
  const t = document.querySelector("details textarea");
  Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value").set.call(t, v);
  t.dispatchEvent(new Event("input", { bubbles: true }));
}, ROSTER);
await pause(300);
await clickText("Read the roster");
await pause(900);

const afterRoster = await body();
const held = /Held\s*\n\s*([\d,]+)/.exec(afterRoster);
const mapped = /(\d+) of (\d+) matched/.exec(afterRoster);
console.log(`\nroster: ${mapped ? mapped[0] : "no mapping shown"}, held ${held ? held[1] : "—"} (want 2)`);
console.log(`against expectation: ${/we expected/.test(afterRoster) ? "compared" : "not compared"}`);

/* ---- the record ---- */
await openTask("already on the record");
await pause();
const answered = await page.evaluate(() => {
  const b = [...document.querySelectorAll("button")].filter(
    (x) => (x.textContent || "").trim() === "We have it",
  );
  b.forEach((x) => x.click());
  return b.length;
});
await pause(500);
console.log(`record rows answered: ${answered} (want 5)`);
console.log(`notice log upload appeared: ${/Send the notice log/.test(await body()) ? "yes" : "no"}`);

/* ---- priorities ---- */
await openTask("Where we start");
await pause();
await clickText("Start with the centers");
await pause();
await page.evaluate(() => {
  const t = document.querySelector("textarea");
  if (!t) return;
  Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value").set.call(
    t,
    "4417, 4422, anything in a Centennial center",
  );
  t.dispatchEvent(new Event("input", { bubbles: true }));
});
await pause(500);

/* ---- people ---- */
await openTask("People and authority");
await pause();
await page.evaluate(() => {
  const vals = ["S. Aggarwal", "VP, Real Estate", "Katten", "counsel@katten.com", "re@af.com"];
  document.querySelectorAll("input").forEach((el, i) => {
    if (el.type === "checkbox") return;
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set.call(
      el,
      vals[i] ?? "x",
    );
    el.dispatchEvent(new Event("input", { bubbles: true }));
  });
});
await pause(500);

/* ---- leases ---- */
await openTask("Lease documents");
await pause();
await clickText("Share a folder");
await pause(300);
await page.evaluate(() => {
  const cb = document.querySelector('input[type="checkbox"]');
  if (cb && !cb.checked) cb.click();
});
await pause(500);

const before = await progress();
console.log(`\nprogress before reload: ${before}`);

/* ---- the actual test: does it survive a reload ---- */
await page.reload({ waitUntil: "networkidle0" });
await pause(800);
const after = await progress();
const t2 = await body();
console.log(`progress after reload:  ${after}`);
console.log(`saved indicator: ${/Saved \d/.test(t2) || /Saves as you go/.test(t2) ? "shown" : "missing"}`);

await openTask("Store portfolio");
await pause(600);
const keptRoster = /matched/.test(await body());
console.log(`roster survived reload: ${keptRoster ? "yes" : "NO"}`);

console.log(`\nconsole errors: ${errors.length}`);
await page.screenshot({ path: "shots/onboarding.png", fullPage: true });

await browser.close();
process.exit(before === after && keptRoster && errors.length === 0 ? 0 : 1);
