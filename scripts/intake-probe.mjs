/**
 * Drives the onboarding intake for real.
 *
 * Pastes a roster containing deliberately broken rows and reads back
 * what the screen said, because "it renders" and "it catches a bad state
 * code on row 4" are different claims and only one of them matters to a
 * client sending eight hundred stores.
 */
import puppeteer from "puppeteer-core";

const BASE = process.argv[2] || "http://localhost:3510";
const CHROME =
  process.env.CHROME_PATH || "C:/Program Files/Google/Chrome/Application/chrome.exe";

const setTextarea = (page, v) =>
  page.evaluate((val) => {
    const t = document.querySelector("textarea");
    const setter = Object.getOwnPropertyDescriptor(
      window.HTMLTextAreaElement.prototype,
      "value",
    ).set;
    setter.call(t, val);
    t.dispatchEvent(new Event("input", { bubbles: true }));
    t.dispatchEvent(new Event("blur", { bubbles: true }));
  }, v);

/* One clean row, then one of each failure the rules are meant to catch. */
const ROSTER = [
  "Store #,Street Address,City,ST,Zip,Property Name,Landlord Entity,Rentable SF,Annual Rent,Lease Start,Lease End,Status",
  "4417,7007 Friars Road,San Diego,CA,92108,Fashion Valley,Fashion Valley Mall LLC,8302,747180,2018-03-01,2031-01-31,open",
  "4422,7 Backus Avenue,Danbury,CT,06810,Danbury Fair,Danbury Mall LLC,5100,397000,2019-09-01,2030-01-31,open",
  "4417,1 Duplicate Way,Toledo,OH,43617,Franklin Park Mall,Franklin LLC,4000,236000,2020-01-01,2032-01-31,open",
  "4431,55 Bad State Rd,Somewhere,ZZ,00000,Some Mall,Some LLC,4200,250000,2020-01-01,2031-01-31,open",
  "4440,9 Backwards Ave,Novi,MI,48375,Twelve Oaks,Twelve LLC,3800,462978,2031-01-31,2020-01-01,open",
  "4451,12 Not A Number St,Edina,MN,55435,Southdale Center,Southdale LLC,abc,456000,2019-01-01,2031-01-31,open",
  ",77 No Store Number Ln,Houston,TX,77056,The Galleria,Galleria LLC,6000,722000,2019-01-01,2031-01-31,open",
].join("\n");

const browser = await puppeteer.launch({
  headless: true,
  executablePath: CHROME,
  args: ["--no-sandbox"],
});
const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 1200 });

const errors = [];
page.on("pageerror", (e) => errors.push(String(e)));

await page.setCookie({
  name: "bp_access",
  value: "e6d8d4d5557c63a0eb0913a1345b4b3b149f5ad3b20c9d1a28aae8abfb912e2a",
  url: new URL(BASE).origin,
});

await page.goto(`${BASE}/onboarding`, { waitUntil: "networkidle0" });
console.log(`landed on: ${page.url()}`);
console.log(`sign-in required: ${/login/.test(page.url()) ? "YES — WRONG" : "no (correct)"}`);

/* Walk to the locations step, answering whatever each step needs. */
const fill = async () => {
  await page.evaluate(() => {
    const setter = (el, v) => {
      const proto = el instanceof HTMLTextAreaElement
        ? HTMLTextAreaElement.prototype
        : HTMLInputElement.prototype;
      Object.getOwnPropertyDescriptor(proto, "value").set.call(el, v);
      el.dispatchEvent(new Event("input", { bubbles: true }));
    };
    for (const el of document.querySelectorAll("input")) {
      if (el.type === "radio" || el.type === "checkbox") continue;
      if (el.value) continue;
      const label = (el.getAttribute("placeholder") || el.name || "") + (el.id || "");
      setter(el, /mail/i.test(label + el.type) || el.type === "email"
        ? "sumer@breakpoint.re"
        : "Abercrombie & Fitch");
    }
  });
};

for (let i = 0; i < 14; i++) {
  const has = await page.evaluate(() => !!document.querySelector("textarea"));
  if (has) break;
  await fill();
  await new Promise((r) => setTimeout(r, 250));
  const moved = await page.evaluate(() => {
    const cont = [...document.querySelectorAll("button")].find(
      (x) => /continue/i.test(x.textContent || "") && !x.disabled,
    );
    if (cont) { cont.click(); return "continue"; }
    // otherwise pick an option on a choice step
    const opt = [...document.querySelectorAll("button")].find(
      (x) => !x.disabled && /store|door|location|d/i.test(x.textContent || "") &&
             !/continue|back|save|sample|template/i.test(x.textContent || ""),
    );
    if (opt) { opt.click(); return "option"; }
    return null;
  });
  if (!moved) break;
  await new Promise((r) => setTimeout(r, 450));
}

const hasTextarea = await page.evaluate(() => !!document.querySelector("textarea"));
console.log(`reached the roster step: ${hasTextarea ? "yes" : "no"}`);
if (!hasTextarea) {
  console.log(await page.evaluate(() => document.body.innerText.slice(0, 300)));
  await browser.close();
  process.exit(1);
}

const tmpl = await page.evaluate(() =>
  [...document.querySelectorAll("button")].some((b) =>
    /download the template/i.test(b.textContent || ""),
  ),
);
console.log(`template offered before upload: ${tmpl ? "yes" : "NO"}`);

await setTextarea(page, ROSTER);
await new Promise((r) => setTimeout(r, 900));

/* The roster step reads the file on an explicit action. */
await page.evaluate(() => {
  const b = [...document.querySelectorAll("button")].find(
    (x) => /read the file/i.test(x.textContent || "") && !x.disabled,
  );
  if (b) b.click();
});
await new Promise((r) => setTimeout(r, 900));

const text = await page.evaluate(() => document.body.innerText);
const num = (re) => {
  const m = re.exec(text);
  return m ? m[1] : "—";
};

console.log("\n--- validation report ---");
console.log(`  Ready:             ${num(/Ready\s*\n\s*([\d,]+)/)}`);
console.log(`  Loaded with notes: ${num(/Loaded with notes\s*\n\s*([\d,]+)/)}`);
console.log(`  Held:              ${num(/Held\s*\n\s*([\d,]+)/)}`);

console.log("\n--- issues surfaced ---");
for (const re of [
  /also appears on row \d+[^\n]*/,
  /is not a US state code[^\n]*/,
  /on or before commencement[^\n]*/,
  /is not a number[^\n]*/,
  /No store number[^\n]*/,
]) {
  const m = re.exec(text);
  console.log(`  ${m ? "caught  " : "MISSED  "}${m ? m[0].slice(0, 74) : re.source.slice(0, 40)}`);
}

const kickback = /Download the \d+ held row/.test(text);
console.log(`\nreturn file offered: ${kickback ? "yes" : "NO"}`);
console.log(`console errors: ${errors.length}`);

await page.screenshot({ path: "shots/intake.png", fullPage: true });
console.log("screenshot: shots/intake.png");

await browser.close();
process.exit(errors.length === 0 && kickback ? 0 : 1);
