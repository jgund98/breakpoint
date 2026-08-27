/**
 * The whole database loop, end to end, then cleaned up.
 *
 *   node scripts/db-loop-probe.mjs [base]
 *
 * A client files a scan request, a closure report and an estoppel
 * review from a location page. An onboarding submits. The operations
 * board shows all of it, a request gets marked handled, a location gets
 * configured, a source gets linked, and every edit is checked AFTER a
 * reload, because state that only exists until the next render is not
 * persistence. Every row the probe created is deleted at the end.
 */
import puppeteer from "puppeteer-core";
import { readFileSync } from "node:fs";
import pg from "pg";

const BASE = process.argv[2] || "http://localhost:3510";
const CHROME =
  process.env.CHROME_PATH || "C:/Program Files/Google/Chrome/Application/chrome.exe";
const MARK = "PROBE-" + Date.now();

function loadEnv(file) {
  try {
    return Object.fromEntries(
      readFileSync(file, "utf8")
        .split(/\r?\n/)
        .map((l) => /^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/.exec(l))
        .filter(Boolean)
        .map((m) => [m[1], m[2].replace(/^["']|["']$/g, "")]),
    );
  } catch {
    return {};
  }
}
const env = { ...loadEnv(".env.local"), ...process.env };
const sql = new pg.Client({
  connectionString: env.DATABASE_URL_UNPOOLED || env.DATABASE_URL,
});
await sql.connect();

const browser = await puppeteer.launch({
  headless: true,
  executablePath: CHROME,
  args: ["--no-sandbox"],
});
const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 1400 });
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

const pause = (ms = 450) => new Promise((r) => setTimeout(r, ms));
const body = () => page.evaluate(() => document.body.innerText);
const clickText = (needle) =>
  page.evaluate((n) => {
    const b = [...document.querySelectorAll("button")].find(
      (x) => (x.textContent || "").trim().includes(n) && !x.disabled,
    );
    if (b) b.click();
    return !!b;
  }, needle);
const waitFor = async (selector, ms = 8000) => {
  const until = Date.now() + ms;
  while (Date.now() < until) {
    if (await page.evaluate((s) => !!document.querySelector(s), selector)) return true;
    await pause(150);
  }
  return false;
};

let fails = 0;
const check = (label, ok) => {
  console.log(`  ${ok ? "pass" : "FAIL"}  ${label}`);
  if (!ok) fails++;
};

/* ================= 1. the client files things ================= */
console.log("--- location page: AF-1126 (Annapolis, remedy active) ---");
await page.goto(`${BASE}/app/locations/AF-1126`, { waitUntil: "networkidle0" });
await pause(600);

const t0 = await body();
check("estoppel check shows a live position", /Position live/.test(t0));

await clickText("Request");
await pause(900);
check("scan request confirmed", /Requested/.test(await body()));

await clickText("Report");
await pause(400);
await page.evaluate((mark) => {
  const sel = document.querySelector("select");
  const opts = [...sel.options].filter((o) => o.value);
  sel.value = opts[0].value;
  sel.dispatchEvent(new Event("change", { bubbles: true }));
  const ta = [...document.querySelectorAll("textarea")].at(-1);
  const set = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value").set;
  set.call(ta, mark + " closure note");
  ta.dispatchEvent(new Event("input", { bubbles: true }));
}, MARK);
await pause(250);
await clickText("File the report");
await pause(900);
check("closure report filed", /Filed/.test(await body()));

await clickText("Tell us");
await pause(400);
await page.evaluate((mark) => {
  const ta = [...document.querySelectorAll("textarea")].at(-1);
  const set = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value").set;
  set.call(ta, mark + " estoppel from buyer counsel");
  ta.dispatchEvent(new Event("input", { bubbles: true }));
}, MARK);
await pause(250);
await clickText("Record it");
await pause(900);
check("estoppel recorded", /Recorded\. We review/.test(await body()));

/* the rows are really in the database */
const { rows: filed } = await sql.query(
  `select kind from client_request where location_ref = 'AF-1126'
    and created_at > now() - interval '3 minutes' order by created_at`,
);
check(
  `three rows in client_request (got ${filed.length}: ${filed.map((r) => r.kind).join(", ")})`,
  filed.length === 3,
);

/* reload: the open-requests list survives */
await page.reload({ waitUntil: "networkidle0" });
await pause(800);
check("requests listed after reload", /Scan requested|Closure reported/.test(await body()));

/* ================= 2. an onboarding submits ================= */
const sub = await page.evaluate(async (mark) => {
  const res = await fetch("/onboarding/api", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      clientName: mark + " Client",
      clientSlug: "probe-client",
      storeEstimate: 3,
      state: { version: 1, parsed: [{ a: 1 }, { a: 2 }], record: {} },
    }),
  });
  return res.status;
}, MARK);
check(`onboarding submission accepted (${sub})`, sub === 200);

/* ================= 3a. HQ: the whole company ================= */
console.log("--- HQ (/admin) ---");
await page.goto(`${BASE}/admin`, { waitUntil: "networkidle0" });
await pause(1000);
const hq = await body();
check(
  "HQ shows the registry with company stats",
  /Locations under watch/i.test(hq) && /Abercrombie/.test(hq),
);
check("submission visible as a work order", new RegExp(MARK + " Client").test(hq));
check("system canon present at HQ", /Never fuzzy-match a tenant name/.test(hq));

/* the registry is searchable */
const setSearch = (value) =>
  page.evaluate((v) => {
    const input = [...document.querySelectorAll("input")].find((i) =>
      (i.placeholder || "").includes("Find a client"),
    );
    const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set;
    set.call(input, v);
    input.dispatchEvent(new Event("input", { bubbles: true }));
  }, value);
await setSearch("zzz-no-such-client");
await pause(300);
check("roster search filters", /No clients match/.test(await body()));
await setSearch("");
await pause(300);

/* a submission is promoted into a client account */
await clickText("Create the account");
await pause(1200);
const { rows: newOrg } = await sql.query(
  `select status from org where slug = 'probe-client'`,
);
check(
  "submission promoted to an org (status onboarding)",
  newOrg.length === 1 && newOrg[0].status === "onboarding",
);
check("new client appears on the roster", new RegExp(MARK + " Client").test(await body()));

/* the global directive editor writes from HQ */
await page.evaluate((mark) => {
  const input = [...document.querySelectorAll("input")].find((i) =>
    (i.placeholder || "").includes("One instruction"),
  );
  const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set;
  set.call(input, mark + " directive body");
  input.dispatchEvent(new Event("input", { bubbles: true }));
}, MARK);
await pause(200);
await clickText("Add");
await pause(900);
const { rows: dir } = await sql.query(
  `select scope from agent_directive where body like $1`,
  [MARK + "%"],
);
check(
  "global directive persisted from HQ",
  dir.length === 1 && dir[0].scope === "global",
);

/* ================= 3b. the new client's setup-state board ================= */
console.log("--- setup board (/admin/clients/probe-client) ---");
await page.goto(`${BASE}/admin/clients/probe-client`, { waitUntil: "networkidle0" });
await pause(1000);
const setup = await body();
check(
  "setup board renders before any portfolio exists",
  /Open requests/i.test(setup) && /awaiting portfolio import/i.test(setup),
);

/* ================= 3c. the pilot client's board ================= */
console.log("--- client board (/admin/clients/abercrombie-fitch) ---");
await page.goto(`${BASE}/admin/clients/abercrombie-fitch`, {
  waitUntil: "networkidle0",
});
await pause(1000);
const a0 = await body();
check("client board loads with gap counters", /Open requests/i.test(a0));
check("client requests visible", /Closure reported|Closure report/.test(a0));
check("no submissions on the client board", !new RegExp(MARK + " Client").test(a0));

await clickText("Mark handled");
await pause(1000);
check("request marked handled", /Handled/.test(await body()));

/* configure the first location and link a source */
await page.evaluate(() => {
  const row = [...document.querySelectorAll("tbody tr")].find((r) =>
    /missing|inherits/.test(r.textContent || ""),
  );
  row?.click();
});
await pause(500);
await page.evaluate((mark) => {
  const input = [...document.querySelectorAll("input")].find((i) =>
    (i.placeholder || "").startsWith("ChIJ"),
  );
  const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set;
  set.call(input, mark + "-PLACE");
  input.dispatchEvent(new Event("input", { bubbles: true }));
}, MARK);
await clickText("Save location");
await pause(900);

await page.evaluate(() => {
  const input = [...document.querySelectorAll("input")].find((i) =>
    (i.placeholder || "").includes("directory"),
  );
  const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set;
  set.call(input, "https://probe.example/directory");
  input.dispatchEvent(new Event("input", { bubbles: true }));
});
await pause(200);
await clickText("Add");
await pause(900);

/* persistence is only proven after a reload */
await page.reload({ waitUntil: "networkidle0" });
await pause(1000);
const { rows: cfg } = await sql.query(
  `select place_id from location_config where place_id like $1`,
  [MARK + "%"],
);
check("location config persisted to the database", cfg.length === 1);
const { rows: src } = await sql.query(
  `select id from center_source where url = 'https://probe.example/directory'`,
);
check("center source persisted to the database", src.length === 1);

/* ================= 4. lease papers per location ================= */
const doc = await page.evaluate(async (mark) => {
  const fd = new FormData();
  fd.append(
    "file",
    new Blob([new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d])], {
      type: "application/pdf",
    }),
    mark + "-lease.pdf",
  );
  fd.append("org", "abercrombie-fitch");
  fd.append("locationRef", "AF-1126");
  fd.append("kind", "lease");
  const up = await fetch("/admin/api/documents", { method: "POST", body: fd });
  const listRes = await fetch(
    "/admin/api/documents?org=abercrombie-fitch&location=AF-1126",
    { cache: "no-store" },
  );
  const list = listRes.ok ? await listRes.json() : { documents: [] };
  const mine = list.documents.find((d) => d.filename === mark + "-lease.pdf");
  let viewOk = false;
  if (mine) {
    const view = await fetch(`/admin/api/documents?id=${mine.id}`);
    viewOk =
      view.ok && (view.headers.get("content-type") || "").includes("pdf");
  }
  return { upStatus: up.status, listed: !!mine, viewOk };
}, MARK);
check(`lease document uploaded (${doc.upStatus})`, doc.upStatus === 200);
check("lease document listed for its location", doc.listed);
check("lease document streams back as a PDF", doc.viewOk);
const { rows: docRows } = await sql.query(
  `select byte_size from lease_document where filename like $1`,
  [MARK + "%"],
);
check("lease document row in the database", docRows.length === 1);

console.log(`\nconsole errors: ${errors.length}`);
if (errors.length) errors.slice(0, 3).forEach((e) => console.log("  " + e.slice(0, 160)));

/* ================= cleanup: leave no probe rows ================= */
const cleaned = [];
for (const [label, q, args] of [
  ["client_request", `delete from client_request where location_ref = 'AF-1126' and (body like $1 or created_at > now() - interval '4 minutes')`, [MARK + "%"]],
  ["onboarding_submission", `delete from onboarding_submission where client_name like $1`, [MARK + "%"]],
  ["location_config", `delete from location_config where place_id like $1`, [MARK + "%"]],
  ["center_source", `delete from center_source where url = 'https://probe.example/directory'`, []],
  ["agent_directive", `delete from agent_directive where body like $1`, [MARK + "%"]],
  ["lease_document", `delete from lease_document where filename like $1`, [MARK + "%"]],
  ["org", `delete from org where slug = 'probe-client'`, []],
]) {
  const r = await sql.query(q, args);
  cleaned.push(`${label}:${r.rowCount}`);
}
console.log(`cleaned: ${cleaned.join("  ")}`);

await sql.end();
await browser.close();
console.log(fails === 0 ? "\nALL CHECKS PASSED" : `\n${fails} CHECK(S) FAILED`);
process.exit(fails === 0 && errors.length === 0 ? 0 : 1);
