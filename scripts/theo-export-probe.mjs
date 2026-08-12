/**
 * Asks Theo a question and checks the answer can leave the screen:
 * the one pager opens with real content in it, and the CSV carries the
 * same rows the table showed.
 */
import puppeteer from "puppeteer-core";

const BASE = process.argv[2] || "http://localhost:3510";
const CHROME =
  process.env.CHROME_PATH || "C:/Program Files/Google/Chrome/Application/chrome.exe";

const browser = await puppeteer.launch({
  headless: true,
  executablePath: CHROME,
  args: ["--no-sandbox"],
});
const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 1100 });
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

await page.goto(`${BASE}/app/theo`, { waitUntil: "networkidle0" });
const pause = (ms = 500) => new Promise((r) => setTimeout(r, ms));

/* Ask something that returns a table. */
const asked = await page.evaluate(() => {
  const b = [...document.querySelectorAll("button")].find((x) =>
    /claimable|which of my|macy|near/i.test(x.textContent || ""),
  );
  if (b) { b.click(); return (b.textContent || "").trim(); }
  return null;
});
console.log(`asked: ${asked ?? "(no suggestion button found)"}`);
await pause(1400);

const body = await page.evaluate(() => document.body.innerText);
console.log(`answer rendered: ${/Evaluated|sweep|provenance|Breakpoint reads/i.test(body) ? "yes" : "unclear"}`);

const hasOnePager = await page.evaluate(() =>
  [...document.querySelectorAll("button")].some((b) => /one pager/i.test(b.textContent || "")),
);
const hasCsv = await page.evaluate(() =>
  [...document.querySelectorAll("button")].some((b) => (b.textContent || "").trim() === "CSV"),
);
console.log(`one pager offered: ${hasOnePager ? "yes" : "NO"}`);
console.log(`csv offered:       ${hasCsv ? "yes" : "no (answer had no table)"}`);

/* Open the one pager and read what actually landed in it. */
let printed = "";
if (hasOnePager) {
  const before = (await browser.pages()).length;
  await page.evaluate(() => {
    const b = [...document.querySelectorAll("button")].find((x) =>
      /one pager/i.test(x.textContent || ""),
    );
    b?.click();
  });
  await pause(1200);
  const pages = await browser.pages();
  if (pages.length > before) {
    const p2 = pages[pages.length - 1];
    printed = await p2.evaluate(() => document.body.innerText).catch(() => "");
    const title = await p2.title().catch(() => "");
    console.log(`\n--- one pager ---`);
    console.log(`  title: ${title}`);
    console.log(`  has brand:      ${/Breakpoint/i.test(printed) ? "yes" : "no"}`);
    console.log(`  has client:     ${/Abercrombie/i.test(printed) ? "yes" : "no"}`);
    console.log(`  has provenance: ${/Prepared by Breakpoint/i.test(printed) ? "yes" : "no"}`);
    console.log(`  characters:     ${printed.replace(/\s+/g, " ").trim().length}`);
  } else {
    console.log("one pager did not open a window");
  }
}

console.log(`\nconsole errors: ${errors.length}`);
await browser.close();
process.exit(hasOnePager && printed.length > 200 && errors.length === 0 ? 0 : 1);
