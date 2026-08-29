/**
 * Seed real users, credentials, and the synthetic second customer.
 *
 *   node scripts/seed-users.mjs
 *
 * Idempotent: upserts by email/slug, never deletes. Creates:
 *  - the demo account (admin@gmail.com / password123) as platform
 *    staff AND owner of abercrombie-fitch, so the pitch walkthrough
 *    and every existing probe keep working through real auth;
 *  - extra A&F members for role testing (counsel, viewer);
 *  - MERIDIAN OUTFITTERS (FICTIONAL TEST DATA): an isolated synthetic
 *    org with owner / analyst / counsel / viewer users, used by
 *    auth-probe to prove tenant isolation.
 *
 * Passwords for synthetic users: breakpoint-demo-1 (dev only).
 */
import { readFileSync } from "node:fs";
import { randomBytes, scryptSync } from "node:crypto";
import pg from "pg";

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
const url = env.DATABASE_URL_UNPOOLED || env.DATABASE_URL;
if (!url) {
  console.error("No DATABASE_URL.");
  process.exit(1);
}

const hash = (password) => {
  const salt = randomBytes(16).toString("hex");
  return `${salt}:${scryptSync(password, salt, 64).toString("hex")}`;
};

const client = new pg.Client({ connectionString: url });
await client.connect();

async function ensureOrg(slug, name, status, descriptor) {
  const { rows } = await client.query(`select id from org where slug = $1`, [slug]);
  if (rows[0]) return rows[0].id;
  const ins = await client.query(
    `insert into org (name, slug) values ($1, $2) returning id`,
    [name, slug],
  );
  /* status/descriptor columns arrived in 007 */
  await client.query(
    `update org set status = $2, descriptor = $3 where id = $1`,
    [ins.rows[0].id, status, descriptor],
  ).catch(() => {});
  console.log(`org created: ${slug}`);
  return ins.rows[0].id;
}

async function ensureUser(email, name, title, password, platformAdmin) {
  const { rows } = await client.query(
    `select id, password_hash from app_user where email = $1`,
    [email],
  );
  if (rows[0]) {
    if (!rows[0].password_hash) {
      await client.query(
        `update app_user set password_hash = $2, title = $3, platform_admin = $4 where id = $1`,
        [rows[0].id, hash(password), title, platformAdmin],
      );
      console.log(`user credentialed: ${email}`);
    }
    return rows[0].id;
  }
  const ins = await client.query(
    `insert into app_user (email, name, title, password_hash, platform_admin)
     values ($1, $2, $3, $4, $5) returning id`,
    [email, name, title, hash(password), platformAdmin],
  );
  console.log(`user created: ${email}`);
  return ins.rows[0].id;
}

async function ensureMembership(orgId, userId, role) {
  await client.query(
    `insert into membership (org_id, user_id, role) values ($1, $2, $3)
     on conflict (org_id, user_id) do update set role = excluded.role`,
    [orgId, userId, role],
  );
}

/* ---- Abercrombie & Fitch (the pilot) ---- */
const af = await ensureOrg(
  "abercrombie-fitch",
  "Abercrombie & Fitch",
  "live",
  "Specialty apparel · 20 watched locations",
);
const demo = await ensureUser(
  "admin@gmail.com",
  "S. Aggarwal",
  "Director, Lease Administration",
  "password123",
  true, // platform staff: the demo account walks both seats
);
await ensureMembership(af, demo, "owner");

const afCounsel = await ensureUser(
  "counsel@abercrombie.test",
  "R. Whitfield",
  "Associate General Counsel",
  "breakpoint-demo-1",
  false,
);
await ensureMembership(af, afCounsel, "counsel");

const afViewer = await ensureUser(
  "viewer@abercrombie.test",
  "T. Okafor",
  "Finance Analyst (read-only)",
  "breakpoint-demo-1",
  false,
);
await ensureMembership(af, afViewer, "viewer");

/* The only role that can record a notice as served. */
const afSignatory = await ensureUser(
  "signatory@abercrombie.test",
  "M. Reyes",
  "SVP, Store Development",
  "breakpoint-demo-1",
  false,
);
await ensureMembership(af, afSignatory, "signatory");

/* ---- Meridian Outfitters: FICTIONAL TEST DATA ---- */
const meridian = await ensureOrg(
  "meridian-outfitters",
  "Meridian Outfitters (Fictional Test Data)",
  "onboarding",
  "Synthetic customer for isolation and permission testing",
);
const mUsers = [
  ["owner@meridian.test", "J. Calloway", "VP, Real Estate", "owner"],
  ["analyst@meridian.test", "P. Reyes", "Lease Analyst", "analyst"],
  ["counsel@meridian.test", "D. Huang", "Counsel", "counsel"],
  ["viewer@meridian.test", "A. Novak", "Portfolio Viewer", "viewer"],
];
for (const [email, name, title, role] of mUsers) {
  const id = await ensureUser(email, name, title, "breakpoint-demo-1", false);
  await ensureMembership(meridian, id, role);
}

const { rows: counts } = await client.query(
  `select (select count(*) from app_user)::int as users,
          (select count(*) from membership)::int as memberships,
          (select count(*) from org)::int as orgs`,
);
console.log(
  `seeded. users=${counts[0].users} memberships=${counts[0].memberships} orgs=${counts[0].orgs}`,
);
await client.end();
