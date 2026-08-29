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
const fvReq = await counsel.post("/app/api/requests", {
  kind: "field_verification",
  locationId: "AF-1007",
  centerName: "Ala Moana Center",
});
check("counsel can request a field verification (200)", fvReq.status === 200);

console.log("--- tenant isolation: meridian must see nothing of A&F ---");
const merTok = await login("owner@meridian.test", "breakpoint-demo-1");
check("meridian owner signs in", !!merTok);
const mer = api(merTok);
const merMe = await mer.get("/app/api/me").then((r) => r.json());
check("meridian session scopes to meridian", merMe.orgSlug === "meridian-outfitters");
const merFlags = await mer.get("/app/api/findings").then((r) => r.json());
check(
  `meridian inbox holds ITS OWN flags (${merFlags.flags?.length ?? "?"}, all MER-)`,
  Array.isArray(merFlags.flags) &&
    merFlags.flags.length > 0 &&
    merFlags.flags.every((f) => String(f.location_ref).startsWith("MER-")),
);
const merPkg = await mer.get("/app/api/notice-package?location=AF-1007");
check("meridian cannot download an A&F notice package (404)", merPkg.status === 404);
const merOwnRef = merFlags.flags?.find((f) => f.kind === "triggered")?.location_ref;
if (merOwnRef) {
  const ownPkg = await mer.get(`/app/api/notice-package?location=${merOwnRef}`);
  const ownText = await ownPkg.text();
  check(
    `meridian downloads ITS OWN notice package (${merOwnRef})`,
    ownPkg.status === 200 &&
      ownText.includes("Meridian Outfitters") &&
      !ownText.includes("AF-10"),
  );
}
const merTheo = await mer.post("/app/api/theo", { question: "What is flagged?" });
const merTheoBody = await merTheo.json();
check(
  "theo answers meridian from MERIDIAN's numbers, no A&F data",
  merTheo.status === 200 &&
    !JSON.stringify(merTheoBody).includes("AF-1") &&
    /65 watched locations/i.test(merTheoBody.answer?.lead ?? ""),
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

console.log("--- alert routing: org policy on the record ---");
const prefGet = await viewer.get("/app/api/preferences").then((r) => r.json());
check(
  "viewer reads routing but cannot edit",
  Array.isArray(prefGet.routing) && prefGet.canEdit === false,
);
const prefViewerPost = await viewer.post("/app/api/preferences", {
  routing: prefGet.routing,
});
check("viewer cannot save routing (403)", prefViewerPost.status === 403);
const originalRouting = await demo
  .get("/app/api/preferences")
  .then((r) => r.json());
const flipped = originalRouting.routing.map((r) =>
  r.kind === "anchor_dark" ? { ...r, inApp: false } : r,
);
const prefSave = await demo.post("/app/api/preferences", { routing: flipped });
check("owner saves a routing change", prefSave.status === 200);
const prefReload = await demo.get("/app/api/preferences").then((r) => r.json());
check(
  "routing change persisted",
  prefReload.routing.find((r) => r.kind === "anchor_dark")?.inApp === false,
);
const prefBad = await demo.post("/app/api/preferences", {
  routing: [{ kind: "not_a_kind", inApp: true }],
});
check("invalid routing refused (400)", prefBad.status === 400);
await demo.post("/app/api/preferences", { routing: originalRouting.routing });
const prefRestored = await demo.get("/app/api/preferences").then((r) => r.json());
check(
  "routing restored to original",
  prefRestored.routing.find((r) => r.kind === "anchor_dark")?.inApp === true,
);

console.log("--- scheduled reevaluation ---");
const cronAnon = await fetch(`${BASE}/api/cron/evaluate`, {
  headers: { cookie: GATE },
});
check("cron without secret or staff is 401", cronAnon.status === 401);
const cronStaff = await demo.get("/api/cron/evaluate").then((r) => r.json());
check(
  `staff manual run works (${cronStaff.flagsChecked ?? "?"} flags checked, ${cronStaff.newFlags ?? "?"} new)`,
  cronStaff.ok === true && typeof cronStaff.flagsChecked === "number",
);

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

console.log("--- workspace pages respect tenancy ---");
const merTok2 = await login("owner@meridian.test", "breakpoint-demo-1");
const pageRes = await fetch(`${BASE}/app`, {
  headers: { cookie: `${GATE}; bp_session=${merTok2}` },
});
const merOverview = await pageRes.text();
check(
  "meridian's /app renders MERIDIAN's own portfolio",
  pageRes.status === 200 &&
    merOverview.includes("Meridian Outfitters") &&
    merOverview.includes("MER-") &&
    !merOverview.includes("AF-10"),
);
const merLocations = await fetch(`${BASE}/app/locations`, {
  headers: { cookie: `${GATE}; bp_session=${merTok2}` },
}).then((r) => r.text());
check(
  "meridian's locations table lists MER doors only",
  merLocations.includes("MER-1003") && !merLocations.includes("AF-10"),
);
const afPage = await fetch(`${BASE}/app`, {
  headers: { cookie: `${GATE}; bp_session=${demoTok}` },
  redirect: "manual",
});
check("A&F still reaches its overview", afPage.status === 200);
await fetch(`${BASE}/login/api`, {
  method: "DELETE",
  headers: { cookie: `${GATE}; bp_session=${merTok2}` },
});

console.log("--- team: invite, join, role, remove ---");
const tViewerInvite = await viewer.post("/app/api/team", {
  action: "invite",
  email: "x@y.test",
  role: "viewer",
});
check("viewer cannot invite (403)", tViewerInvite.status === 403);
const inviteRes = await demo
  .post("/app/api/team", {
    action: "invite",
    email: "probe-invitee@breakpoint.test",
    name: "P. Invitee",
    title: "Probe Counsel",
    role: "counsel",
  })
  .then((r) => r.json());
check("owner creates an invitation with a join link", !!inviteRes.joinPath);
const dupInvite = await demo.post("/app/api/team", {
  action: "invite",
  email: "counsel@abercrombie.test",
  role: "counsel",
});
check("inviting an existing member is refused (409)", dupInvite.status === 409);
const joinToken = String(inviteRes.joinPath ?? "").split("/").pop();
const joinRes = await fetch(`${BASE}/join/api`, {
  method: "POST",
  headers: { "Content-Type": "application/json", cookie: GATE },
  body: JSON.stringify({
    token: joinToken,
    name: "P. Invitee",
    password: "probe-password-1",
  }),
});
const joinCookie = /bp_session=([a-f0-9]{48})/.exec(
  joinRes.headers.get("set-cookie") ?? "",
)?.[1];
check("invitee joins and is signed in", joinRes.status === 200 && !!joinCookie);
const joined = api(joinCookie);
const joinedMe = await joined.get("/app/api/me").then((r) => r.json());
check(
  `joined member lands in the right org with the right role (${joinedMe.role})`,
  joinedMe.orgSlug === "abercrombie-fitch" && joinedMe.role === "counsel",
);
const reuse = await fetch(`${BASE}/join/api`, {
  method: "POST",
  headers: { "Content-Type": "application/json", cookie: GATE },
  body: JSON.stringify({ token: joinToken, name: "X", password: "whatever-else-1" }),
});
check("a used invitation cannot be reused (404)", reuse.status === 404);
const teamList = await demo.get("/app/api/team").then((r) => r.json());
const inviteeRow = (teamList.members ?? []).find(
  (m) => m.email === "probe-invitee@breakpoint.test",
);
check("new member appears in the team list", !!inviteeRow);
const roleChange = await demo.post("/app/api/team", {
  action: "role",
  userId: inviteeRow?.id,
  role: "viewer",
});
check("owner changes the member's role", roleChange.status === 200);
const lastOwner = await demo.post("/app/api/team", {
  action: "role",
  userId: me.email && (teamList.members ?? []).find((m) => m.role === "owner")?.id,
  role: "viewer",
});
check("the last owner cannot be demoted (400)", lastOwner.status === 400);
const removal = await demo.post("/app/api/team", {
  action: "remove",
  userId: inviteeRow?.id,
});
check("owner removes the member", removal.status === 200);
const deadJoined = await joined.get("/app/api/me");
check(
  "removed member's session no longer reaches the org (401)",
  deadJoined.status === 401,
);

console.log("--- ingestion pipeline: upload -> read -> review -> approve ---");
const FICTIONAL_LEASE = [
  "FICTIONAL TEST DOCUMENT - synthetic lease text for pipeline testing.",
  "Section 7.02 Co-Tenancy. So long as Nordstrom is open and operating in the Shopping Center, Tenant's obligations continue unmodified.",
  "In addition, if less than 80% of the inline Gross Leasable Area is open and operating for 3 consecutive months, a Co-Tenancy Failure shall exist.",
  "Upon such failure and written notice by Tenant, Tenant may pay 4% of Gross Sales in lieu of Fixed Minimum Rent.",
  "Section 21. Notices shall be sent to Landlord at the notice address stated in the Basic Lease Provisions.",
  "Section 24. Tenant shall have one option to renew the Term for five (5) years.",
].join("\n");
const mkForm = () => {
  const form = new FormData();
  form.append(
    "file",
    new File([FICTIONAL_LEASE], "probe-fictional-amendment.txt", {
      type: "text/plain",
    }),
  );
  form.append("locationRef", "AF-1007");
  form.append("kind", "amendment");
  return form;
};
const vUp = await fetch(`${BASE}/app/api/documents`, {
  method: "POST",
  headers: { cookie: `${GATE}; bp_session=${viewerTok}` },
  body: mkForm(),
});
check("viewer cannot upload a document (403)", vUp.status === 403);
const up = await fetch(`${BASE}/app/api/documents`, {
  method: "POST",
  headers: { cookie: `${GATE}; bp_session=${counselTok}` },
  body: mkForm(),
});
const upBody = await up.json();
check(
  `counsel uploads; pipeline reads it (provider ${upBody.provider}, status ${upBody.status})`,
  up.status === 200 && upBody.jobId && ["review", "proposed"].includes(upBody.status),
);
const { rows: jobRows } = await sql.query(
  `select j.status, j.provider, j.confidence, j.result, j.citations,
          (select count(*)::int from document_text where document_id = j.document_id) as pages
     from extraction_job j where j.id = $1`,
  [upBody.jobId],
);
const jr = jobRows[0];
const limbs = jr?.result?.co_tenancy_limbs ?? [];
const finds = jr?.result?.tenant_critical_finds ?? [];
check(
  `text extracted (${jr?.pages} pages) and citations anchored (${(jr?.citations ?? []).length})`,
  (jr?.pages ?? 0) >= 1 && (jr?.citations ?? []).length >= 3,
);
check(
  `the scanner found the clause: ${limbs.length} limbs incl. the 80% floor and Nordstrom`,
  limbs.some((l) => l.type === "pct" && l.threshold === 80) &&
    limbs.some((l) => l.type === "named" && /nordstrom/i.test(l.name ?? "")),
);
check(
  `tenant-critical finds kept (${finds.map((f) => f.kind).join(", ")})`,
  finds.some((f) => f.kind === "notice_address") &&
    finds.some((f) => f.kind === "renewal_option"),
);
const deskList = await demo.get("/admin/api?pipeline=1").then((r) => r.json());
check(
  "the document appears on the extraction desk",
  (deskList.jobs ?? []).some((j) => j.id === upBody.jobId),
);
const approveJob = await demo.post("/admin/api", {
  action: "job_approve",
  id: upBody.jobId,
});
check("ops approves the record", approveJob.status === 200);
const { rows: approvedRows } = await sql.query(
  `select status, reviewed_by from extraction_job where id = $1`,
  [upBody.jobId],
);
check(
  "approval is on the record",
  approvedRows[0]?.status === "approved" && approvedRows[0]?.reviewed_by === "ops",
);
const { rows: ingestNotif } = await sql.query(
  `select count(*)::int as n from notification
    where org_slug = 'abercrombie-fitch' and kind = 'extraction'
      and created_at > now() - interval '5 minutes'`,
);
check(
  `the client was told at read and at approval (${ingestNotif[0].n} notifications)`,
  ingestNotif[0].n >= 2,
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
  `delete from client_request where (org_slug = 'meridian-outfitters' or (location_ref = 'AF-1007' and kind in ('manual_scan','field_verification') and handled_at is null)) and created_at > now() - interval '15 minutes'`,
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
await sql.query(
  `delete from audit_log where action in ('alert_routing', 'evaluation_run') and created_at > now() - interval '15 minutes'`,
);
await sql.query(
  `delete from app_user where email = 'probe-invitee@breakpoint.test'`,
);
await sql.query(
  `delete from invitation where email in ('probe-invitee@breakpoint.test', 'counsel@abercrombie.test')`,
);
await sql.query(
  `delete from audit_log where action like 'team_%' and created_at > now() - interval '15 minutes'`,
);
/* ingestion probe artifacts: the document cascades its text; the job
   goes explicitly; the notifications and audits it produced go too */
await sql.query(
  `delete from extraction_job where location_ref = 'AF-1007'
     and created_at > now() - interval '15 minutes'`,
);
await sql.query(
  `delete from lease_document where filename = 'probe-fictional-amendment.txt'`,
);
await sql.query(
  `delete from notification where kind = 'extraction'
     and created_at > now() - interval '15 minutes'`,
);
await sql.query(
  `delete from audit_log where action in ('document_uploaded','extraction_run','extraction_approved','extraction_rejected')
     and created_at > now() - interval '15 minutes'`,
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
