import puppeteer from "puppeteer-core";

const b = await puppeteer.launch({
  headless: true,
  executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
  args: ["--no-sandbox"],
});
const p = await b.newPage();
await p.setViewport({ width: 375, height: 812, isMobile: true, hasTouch: true });
await p.goto("http://localhost:3511/", { waitUntil: "networkidle2" });
await p.evaluate(() => document.getElementById("the-center").scrollIntoView());
await new Promise((r) => setTimeout(r, 2500));
await p.evaluate(() => window.scrollBy(0, 400));
await new Promise((r) => setTimeout(r, 1200));

const before = await p.evaluate(() =>
  document.body.innerText.includes("LIVE RESULT"),
);

const tabs = await p.$$("button");
for (const t of tabs) {
  const txt = await t.evaluate((el) => el.textContent);
  if (txt && txt.includes("Anchor closes")) {
    await t.click();
    break;
  }
}
await new Promise((r) => setTimeout(r, 1500));
const after = await p.evaluate(() =>
  document.body.innerText.includes("LIVE RESULT"),
);

console.log(
  "bar before interaction (expect false):",
  before,
  "· after scenario tap (expect true):",
  after,
);
await p.screenshot({ path: "shots/livebar-context.png" });
await b.close();
