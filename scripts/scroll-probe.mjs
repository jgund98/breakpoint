/**
 * Scroll-jank profiler. Loads a URL, scrolls through the whole page in
 * small steps, and records rAF frame times the entire way. Reports
 * average / p95 / worst frame and where the long frames happened, so a
 * janky animation identifies itself by scroll position.
 *
 *   node scripts/scroll-probe.mjs <url> [cpuThrottle] [mobile]
 */
import puppeteer from "puppeteer-core";

const URL = process.argv[2] || "http://localhost:3511";
const THROTTLE = Number(process.argv[3] || 4);
const MOBILE = process.argv[4] === "mobile";

const browser = await puppeteer.launch({
  headless: true,
  executablePath:
    process.env.CHROME_PATH ||
    "C:/Program Files/Google/Chrome/Application/chrome.exe",
  args: ["--no-sandbox", "--hide-scrollbars"],
});
const page = await browser.newPage();
if (MOBILE) {
  await page.setViewport({
    width: 390,
    height: 844,
    isMobile: true,
    hasTouch: true,
    deviceScaleFactor: 3,
  });
} else {
  await page.setViewport({ width: 1440, height: 900 });
}
const client = await page.createCDPSession();
await client.send("Emulation.setCPUThrottlingRate", { rate: THROTTLE });

await page.goto(URL, { waitUntil: "networkidle2", timeout: 120000 });
await page.evaluate(async () => {
  await document.fonts.ready;
});
await new Promise((r) => setTimeout(r, 1500));

const result = await page.evaluate(async () => {
  const frames = [];
  let last = performance.now();
  let running = true;
  const tick = () => {
    const now = performance.now();
    frames.push({ dt: now - last, y: window.scrollY });
    last = now;
    if (running) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);

  // Scroll like a human: steady steps to the bottom, then back up.
  const step = 24;
  const H = document.body.scrollHeight - window.innerHeight;
  for (let y = 0; y <= H; y += step) {
    window.scrollTo(0, y);
    await new Promise((r) => requestAnimationFrame(r));
  }
  for (let y = H; y >= 0; y -= step * 2) {
    window.scrollTo(0, y);
    await new Promise((r) => requestAnimationFrame(r));
  }
  running = false;

  // Identify what's at each scroll position for blame.
  const sections = [...document.querySelectorAll("main > *, footer")].map(
    (el) => ({
      name:
        el.tagName.toLowerCase() +
        (el.id ? `#${el.id}` : "") +
        "." +
        (el.className?.toString?.().split(" ")[0] ?? ""),
      top: el.getBoundingClientRect().top + window.scrollY,
    }),
  );

  const dts = frames.map((f) => f.dt).sort((a, b) => a - b);
  const p = (q) => dts[Math.floor(dts.length * q)] ?? 0;
  const long = frames.filter((f) => f.dt > 32);

  // Bucket long frames by nearest section
  const blame = {};
  for (const f of long) {
    let owner = "top";
    for (const s of sections) if (s.top <= f.y + innerHeight) owner = s.name;
    blame[owner] = (blame[owner] || 0) + 1;
  }

  return {
    frames: frames.length,
    avg: dts.reduce((a, b) => a + b, 0) / dts.length,
    p50: p(0.5),
    p95: p(0.95),
    worst: dts[dts.length - 1],
    longCount: long.length,
    blame: Object.entries(blame).sort((a, b) => b[1] - a[1]),
  };
});

console.log(
  `\n=== SCROLL ${MOBILE ? "MOBILE" : "DESKTOP"} ${THROTTLE}x CPU · ${URL}`,
);
console.log(
  `frames ${result.frames} · avg ${result.avg.toFixed(1)}ms · p50 ${result.p50.toFixed(1)}ms · p95 ${result.p95.toFixed(1)}ms · worst ${result.worst.toFixed(0)}ms`,
);
console.log(`frames >32ms (visible jank): ${result.longCount}`);
for (const [name, n] of result.blame.slice(0, 8))
  console.log(`  ${String(n).padStart(4)} long frames near ${name}`);

await browser.close();
