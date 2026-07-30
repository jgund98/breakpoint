import puppeteer from "puppeteer-core";

const b = await puppeteer.launch({
  headless: true,
  executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
  args: ["--no-sandbox"],
});
const p = await b.newPage();
await p.setViewport({ width: 1440, height: 900, deviceScaleFactor: 2 });
await p.goto(process.argv[2] || "http://localhost:3511/", {
  waitUntil: "networkidle2",
});
await p.evaluate(async () => {
  await document.fonts.ready;
  document.documentElement.style.scrollBehavior = "auto";
  window.scrollTo(0, document.body.scrollHeight);
});
await new Promise((r) => setTimeout(r, 1500));
const el = await p.$("footer");
await el.screenshot({ path: "shots/footer-check.png" });
console.log("footer captured");
await b.close();
