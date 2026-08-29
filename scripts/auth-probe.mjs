/**
 * AUTH, ROLES, AND TENANT ISOLATION — the adversarial probe.
 *
 *   node scripts/auth-probe.mjs [base]
 *
 * Plain fetch, no browser. Proves, against a running server:
 *  - wrong password and unknown user are the same 401
 *  - real credentials issue a working session
 *  - the legacy demo cookie still resolves (probe/back-compat)
 *  - viewer role is read-only (403 on writes, 200 on reads)
 *  - a second org NEVER sees the first org's data (flags, requests,
 *    notice packages) — cross-org reads are empty or 404
 *  - /admin is staff-only: org members get 403, staff gets 200
 *  - writes land under the SESSION org, not any client-named org
 * Cleans up every row it creates.
 */
import { readFileSync } from "node:fs";
import pg from "pg";

const BASE = process.argv[2] || "http://localhost:3510";
const GATE =
  "bp_access=e6d8d4d5557c63a0eb0913a1345b4b3b149f5ad3b20c9d1a28aae8abfb912e2a";

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

let passed = 0;
let failed = 0;
const check = (label, ok) => {
  console.log(`  ${ok ? "pass" : "FAIL"}  ${label}`);
  ok ? passed++ : failed++;
};

async function login(email, password) {
  const r = await fetch(`${BASE}/login/api`, {
    method: "POST",
    headers: { "Content-Type": "application/json", cookie: GATE },
    body: JSON.stringify({ email, password }),
  });
  if (!r.ok) return null;
  const setCookie = r.headers.get("set-cookie") ?? "";
  const m = /bp_session=([a-f0-9]{48})/.exec(setCookie);
  return m ? m[1] : null;
}

const api = (token) => ({
  get: (path) =>
    fetch(`${BASE}${path}`, {
      headers: { cookie: `${GATE}; bp_session=${token}` },
    }),
  post: (path, body) =>
    fetch(`${BASE}${path}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        cookie: `${GATE}; bp_session=${token}`,
      },
      body: JSON.stringify(body),
    }),
});

console.log("--- credentials ---");
const bad = await fetch(`${BASE}/login/api`, {
  method: "POST",
  headers: { "Content-Type": "application/json", cookie: GATE },
  body: JSON.stringify({ email: "admin@gmail.com", password: "wrong" }),
});
check("wrong password is 401", bad.status === 401);
const ghost = await fetch(`${BASE}/login/api`, {
  method: "POST",
  headers: { "Content-Type": "application/json", cookie: GATE },
  body: JSON.stringify({ email: "nobody@nowhere.test", password: "x" }),
});
check("unknown user is the same 401", ghost.status === 401);

const demoTok = await login("admin@gmail.com", "password123");
check("demo credentials issue a real session token", !!demoTok);
const demo = api(demoTok);

const me = await demo.get("/app/api/me").then((r) => r.json());
check(
  `session resolves identity (${me.email}, org ${me.orgSlug}, staff ${me.platformAdmin})`,
  me.email === "admin@gmail.com" &&
    me.orgSlug === "abercrombie-fitch" &&
    me.platformAdmin === true,
);

console.log("--- legacy alias ---");
const legacy = api("demo-workspace-session-v1");
const legacyMe = await legacy.get("/app/api/me");
check("legacy demo cookie still resolves", legacyMe.status === 200);
const legacyFlags = await legacy.get("/app/api/findings");
check("legacy cookie reaches the inbox", legacyFlags.status === 200);

console.log("--- roles: viewer is read-only ---");
const viewerTok = await login("viewer@abercrombie.test", "breakpoint-demo-1");
check("viewer signs in", !!viewerTok);
const viewer = api(viewerTok);
const vFlags = await viewer.get("/app/api/findings").then((r) => r.json());
check("viewer reads the inbox", Array.isArray(vFlags.flags));
const vMove = await viewer.post("/app/api/findings", {
  id: vFlags.flags?.[0]?.id ?? 1,
  action: "start",
});
check("viewer cannot move a flag (403)", vMove.status === 403);
const vReq = await viewer.post("/app/api/requests", {
  kind: "manual_scan",
  locationId: "AF-1007",
  centerName: "Ala Moana Center",
});
check("viewer cannot file a request (403)", vReq.status === 403);
const vNotice = await viewer.post("/app/api/notice-status", {
  locationRef: "AF-1014",
  stage: "acknowledged",
});
check("viewer cannot record notice status (403)", vNotice.status === 403);

const counselTok = await login("counsel@abercrombie.test", "breakpoint-demo-1");
const counsel = api(counselTok);
const cReq = await counsel.post("/app/api/requests", {
  kind: "manual_scan",
  locationId: "AF-1007",
  centerName: "Ala Moana Center",
});
check("counsel can file a request (200)", cReq.status === 200);

console.log("--- tenant isolation: meridian must see nothing of A&F ---");
const merTok = await login("owner@meridian.test", "breakpoint-demo-1");
check("meridian owner signs in", !!merTok);
const mer = api(merTok);
const merMe = await mer.get("/app/api/me").then((r) => r.json());
check("meridian session scopes to meridian", merMe.orgSlug === "meridian-outfitters");
const merFlags = await mer.get("/app/api/findings").then((r) => r.json());
check(
  `meridian inbox is meridian-only (${merFlags.flags?.length ?? "?"} flags, none A&F)`,
  Array.isArray(merFlags.flags) && merFlags.flags.length === 0,
);
const merPkg = await mer.get("/app/api/notice-package?location=AF-1007");
check("meridian cannot download an A&F notice package (404)", merPkg.status === 404);
const merTheo = await mer.post("/app/api/theo", { question: "What is flagged?" });
const merTheoBody = await merTheo.json();
check(
  "theo gives meridian an honest no-portfolio answer, no A&F data",
  merTheo.status === 200 &&
    !JSON.stringify(merTheoBody).includes("AF-1") &&
    /not imported/i.test(merTheoBody.answer?.lead ?? ""),
);
const merReq = await mer.post("/app/api/requests", {
  kind: "manual_scan",
  locationId: "MER-0001",
  centerName: "Meridian Test Center",
});
check("meridian can file its own request", merReq.status === 200);
const { rows: merRows } = await sql.query(
  `select org_slug from client_request where location_ref = 'MER-0001'`,
);
check(
  "meridian's request landed under meridian, not A&F",
  merRows.length >= 1 && merRows.every((r) => r.org_slug === "meridian-outfitters"),
);
const afSeesMer = await demo.get("/app/api/findings").then((r) => r.json());
check(
  "A&F inbox carries no meridian rows",
  (afSeesMer.flags ?? []).every((f) => !String(f.location_ref).startsWith("MER-")),
);

console.log("--- staff gate ---");
const merAdmin = await mer.get("/admin/api");
check("org member without staff gets 403 on /admin/api", merAdmin.status === 403);
const staffAdmin = await demo.get("/admin/api");
check("platform staff reaches /admin/api", staffAdmin.status === 200);
const viewerAdmin = await viewer.get("/admin/api");
check("A&F viewer (not staff) gets 403 on /admin/api", viewerAdmin.status === 403);

console.log("--- notice workflow: separation of duties ---");
const REF = "AF-9999-PROBE";
const wAssemble = await demo.post("/app/api/notice-workflow", {
  locationRef: REF,
  to: "assembled",
});
check("owner assembles a package", wAssemble.status === 200);
const wToCounsel = await demo.post("/app/api/notice-workflow", {
  locationRef: REF,
  to: "counsel_review",
});
check("owner sends it to counsel", wToCounsel.status === 200);
const wViewerApprove = await viewer.post("/app/api/notice-workflow", {
  locationRef: REF,
  to: "approved",
});
check("viewer cannot approve (403)", wViewerApprove.status === 403);
const wCounselServe = await counsel.post("/app/api/notice-workflow", {
  locationRef: REF,
  to: "served",
});
check("counsel cannot serve, by design (403)", wCounselServe.status === 403);
const wApprove = await counsel.post("/app/api/notice-workflow", {
  locationRef: REF,
  to: "approved",
});
check("counsel approves after review", wApprove.status === 200);
const sigTok = await login("signatory@abercrombie.test", "breakpoint-demo-1");
check("signatory signs in", !!sigTok);
const sig = api(sigTok);
const wSigApprove = await sig.post("/app/api/notice-workflow", {
  locationRef: REF,
  to: "approved",
});
check(
  "signatory cannot approve (wrong lane, 403 or 409)",
  wSigApprove.status === 403 || wSigApprove.status === 409,
);
const wServe = await sig.post("/app/api/notice-workflow", {
  locationRef: REF,
  to: "served",
});
const served = await wServe.json();
check(
  `signatory records it served (${served.servedOn ?? "?"})`,
  wServe.status === 200 && !!served.servedOn,
);
const wSkip = await demo.post("/app/api/notice-workflow", {
  locationRef: REF,
  to: "approved",
});
check("illegal transition from served is refused (409)", wSkip.status === 409);
const merWorkflow = await mer.get("/app/api/notice-workflow").then((r) => r.json());
check(
  "meridian sees none of A&F's workflow rows",
  (merWorkflow.workflows ?? []).every(
    (w) => !String(w.location_ref).startsWith("AF-"),
  ),
);
const afFlows = await demo.get("/app/api/notice-workflow").then((r) => r.json());
check(
  "A&F sees only its own workflow rows",
  (afFlows.workflows ?? []).every((w) => !String(w.location_ref).startsWith("MER-")),
);

console.log("--- sign-out ---");
const out = await fetch(`${BASE}/login/api`, {
  method: "DELETE",
  headers: { cookie: `${GATE}; bp_session=${merTok}` },
});
check("sign-out succeeds", out.status === 200);
const dead = await mer.get("/app/api/me");
check("destroyed session no longer resolves", dead.status === 401);

/* ---- cleanup ---- */
const del1 = await sql.query(
  `delete from client_request where (org_slug = 'meridian-outfitters' or (location_ref = 'AF-1007' and kind = 'manual_scan' and handled_at is null)) and created_at > now() - interval '15 minutes'`,
);
const del2 = await sql.query(
  `delete from audit_log where action in ('login') and created_at > now() - interval '10 minutes'`,
);
const del3 = await sql.query(
  `delete from auth_session where expires_at < now() or user_id in (select id from app_user where email like '%@meridian.test' or email like '%@abercrombie.test')`,
);
const del4 = await sql.query(
  `delete from notice_workflow where location_ref = 'AF-9999-PROBE'`,
);
const del5 = await sql.query(
  `delete from audit_log where action = 'notice_stage' and subject = 'AF-9999-PROBE'`,
);
console.log(`cleaned workflow rows:${del4.rowCount} stage audits:${del5.rowCount}`);
console.log(
  `cleaned: requests:${del1.rowCount} logins:${del2.rowCount} sessions:${del3.rowCount}`,
);
await sql.end();

console.log(failed === 0 ? "\nALL AUTH CHECKS PASSED" : `\n${failed} FAILED`);
process.exit(failed === 0 ? 0 : 1);
