/**
 * Apply the SQL migrations in db/ to DATABASE_URL, in order, once each.
 *
 *   node scripts/migrate.mjs
 *
 * Reads .env.local, which vercel env pull writes and .gitignore keeps out
 * of the repo. Applied files are recorded in schema_migration so a second
 * run is a no-op, and each file runs inside a transaction so a partial
 * migration cannot leave the schema half-built.
 *
 * The connection string is never printed. Failures report the file and
 * the database's own message, which is enough to fix them.
 */
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import pg from "pg";

/* Minimal .env reader: no dependency, and it must not choke on the
   quoting styles vercel env pull emits. */
function loadEnv(file) {
  let text;
  try {
    text = readFileSync(file, "utf8");
  } catch {
    return {};
  }
  const out = {};
  for (const line of text.split(/\r?\n/)) {
    const m = /^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/.exec(line);
    if (!m) continue;
    let v = m[2].trim();
    if (
      (v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))
    )
      v = v.slice(1, -1);
    out[m[1]] = v;
  }
  return out;
}

const env = { ...loadEnv(".env.local"), ...process.env };
const url = env.DATABASE_URL_UNPOOLED || env.DATABASE_URL;

if (!url) {
  console.error(
    "No DATABASE_URL. Run: npx vercel env pull .env.local --environment=development",
  );
  process.exit(1);
}

const client = new pg.Client({ connectionString: url });
await client.connect();

await client.query(`
  create table if not exists schema_migration (
    filename    text primary key,
    applied_at  timestamptz not null default now()
  )
`);

const { rows: done } = await client.query("select filename from schema_migration");
const applied = new Set(done.map((r) => r.filename));

const files = readdirSync("db")
  .filter((f) => f.endsWith(".sql"))
  .sort();

let ran = 0;
for (const f of files) {
  if (applied.has(f)) {
    console.log(`  skip   ${f}`);
    continue;
  }
  const sql = readFileSync(path.join("db", f), "utf8");
  try {
    await client.query("begin");
    await client.query(sql);
    await client.query("insert into schema_migration (filename) values ($1)", [f]);
    await client.query("commit");
    console.log(`  applied ${f}`);
    ran++;
  } catch (e) {
    await client.query("rollback");
    console.error(`\nFAILED ${f}\n  ${e.message}`);
    await client.end();
    process.exit(1);
  }
}

const { rows: tables } = await client.query(
  `select table_name from information_schema.tables
   where table_schema = 'public' and table_type = 'BASE TABLE'
   order by table_name`,
);

console.log(`\n${ran} migration(s) applied, ${files.length - ran} already current.`);
console.log(`tables (${tables.length}): ${tables.map((t) => t.table_name).join(", ")}`);

await client.end();
