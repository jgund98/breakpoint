/**
 * Live performance probe: loads a URL in headless Chrome (optionally
 * with mobile emulation + throttling) and reports paint timings plus
 * the slowest / heaviest network requests.
 *
 *   node scripts/perf-probe.mjs <url> [mobile]
 */
import puppeteer from "puppeteer-core";

const URL = process.argv[2] || "https://breakpoint.epicdevsolutions.com";
const MOBILE = process.argv[3] === "mobile";

const browser = await puppeteer.launch({
  headless: true,
  executablePath:
    process.env.CHROME_PATH ||
    "C:/Program Files/Google/Chrome/Application/chrome.exe",
  args: ["--no-sandbox"],
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
  await page.setUserAgent(
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1",
  );
  // Fast-4G-ish throttling so mobile pain is visible
  const client = await page.createCDPSession();
  await client.send("Network.emulateNetworkConditions", {
    offline: false,
    downloadThroughput: (4 * 1024 * 1024) / 8,
    uploadThroughput: (1 * 1024 * 1024) / 8,
    latency: 60,
  });
  await client.send("Emulation.setCPUThrottlingRate", { rate: 4 });
} else {
  await page.setViewport({ width: 1440, height: 900 });
}

const requests = new Map();
page.on("requestfinished", async (req) => {
  try {
    const res = req.response();
    const timing = res?.timing();
    const headers = res?.headers() ?? {};
    const len = Number(headers["content-length"] || 0);
    requests.set(req.url(), {
      status: res?.status(),
      len,
      type: req.resourceType(),
      ms: timing ? timing.receiveHeadersEnd : 0,
    });
  } catch {}
});
page.on("requestfailed", (req) => {
  requests.set(req.url(), {
    status: "FAILED " + (req.failure()?.errorText ?? ""),
    len: 0,
    type: req.resourceType(),
    ms: 0,
  });
});

const t0 = Date.now();
await page.goto(URL, { waitUntil: "load", timeout: 120000 });
const loadMs = Date.now() - t0;
await new Promise((r) => setTimeout(r, 4000));

const metrics = await page.evaluate(() => {
  const nav = performance.getEntriesByType("navigation")[0];
  const fcp = performance
    .getEntriesByType("paint")
    .find((e) => e.name === "first-contentful-paint");
  const lcpEntries = performance.getEntriesByType("largest-contentful-paint");
  const resources = performance.getEntriesByType("resource").map((r) => ({
    url: r.name,
    dur: Math.round(r.duration),
    size: r.transferSize,
    start: Math.round(r.startTime),
  }));
  return {
    ttfb: Math.round(nav.responseStart),
    domContentLoaded: Math.round(nav.domContentLoadedEventEnd),
    load: Math.round(nav.loadEventEnd),
    fcp: fcp ? Math.round(fcp.startTime) : null,
    lcp: lcpEntries.length
      ? Math.round(lcpEntries[lcpEntries.length - 1].startTime)
      : null,
    resources,
  };
});

console.log(`\n=== ${MOBILE ? "MOBILE (4x CPU, ~4G)" : "DESKTOP"} · ${URL}`);
console.log(
  `TTFB ${metrics.ttfb}ms · FCP ${metrics.fcp}ms · LCP ${metrics.lcp}ms · DCL ${metrics.domContentLoaded}ms · load ${metrics.load}ms (wall ${loadMs}ms)`,
);

const totalBytes = metrics.resources.reduce((s, r) => s + (r.size || 0), 0);
console.log(
  `requests ${metrics.resources.length} · transferred ${(totalBytes / 1024).toFixed(0)} KB`,
);

console.log(`\n--- slowest requests ---`);
for (const r of [...metrics.resources].sort((a, b) => b.dur - a.dur).slice(0, 12)) {
  console.log(
    `${String(r.dur).padStart(6)}ms  ${((r.size || 0) / 1024).toFixed(0).padStart(6)}KB  ${r.url.replace(/^https?:\/\/[^/]+/, "").slice(0, 90)}`,
  );
}

console.log(`\n--- heaviest requests ---`);
for (const r of [...metrics.resources]
  .sort((a, b) => (b.size || 0) - (a.size || 0))
  .slice(0, 10)) {
  console.log(
    `${((r.size || 0) / 1024).toFixed(0).padStart(6)}KB  ${String(r.dur).padStart(6)}ms  ${r.url.replace(/^https?:\/\/[^/]+/, "").slice(0, 90)}`,
  );
}

const failed = [...requests.entries()].filter(([, v]) =>
  String(v.status).startsWith("FAILED"),
);
if (failed.length) {
  console.log(`\n--- FAILED requests ---`);
  for (const [url, v] of failed.slice(0, 10))
    console.log(`${v.status}  ${url.slice(0, 100)}`);
}

await browser.close();
