/**
 * EXTRACT A CO-TENANCY CLAUSE RECORD FROM LEASE TEXT
 *
 *   node --experimental-strip-types scripts/extract-clause.ts <lease.txt> [gold.json]
 *
 * The front half of the AI pipeline. The back half — evaluating the
 * extracted record against observed center conditions — already exists
 * and scored 480/480 against the partner's answer key, so the entire
 * job here is producing that record faithfully from prose.
 *
 * The system prompt is assembled at run time from the agent_directive
 * table (the same rows operations edits on the board), so tuning what
 * the extractor is told is a row edit and not a code change. The output
 * contract is the partner's own gold-set schema, because that is the
 * shape a human expert chose for abstracting these clauses and it is
 * the shape our scorer speaks.
 *
 * With ANTHROPIC_API_KEY set, this calls the API and, when a gold
 * record is supplied, scores the result field by field. Without a key
 * it writes the fully assembled prompt to shots/extraction-prompt.txt
 * and exits, so the prompt can be reviewed before a single token is
 * spent. Every extraction is DRAFT ONLY: a person reviews the record
 * before it goes live, and needs_human_review=true is always honored.
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import pg from "pg";
import { scoreExtraction, type GoldRecord } from "../src/lib/goldset.ts";

const leasePath = process.argv[2];
const goldPath = process.argv[3];
if (!leasePath) {
  console.error("Usage: extract-clause.ts <lease.txt> [gold.json]");
  process.exit(1);
}

/* ---- env ---- */
function loadEnv(file: string): Record<string, string> {
  try {
    return Object.fromEntries(
      readFileSync(file, "utf8")
        .split(/\r?\n/)
        .map((l) => /^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/.exec(l))
        .filter((m): m is RegExpExecArray => Boolean(m))
        .map((m) => [m[1], m[2].replace(/^["']|["']$/g, "")]),
    );
  } catch {
    return {};
  }
}
const env = { ...loadEnv(".env.local"), ...process.env };

/* ---- assemble the directives the operations board maintains ---- */
async function directives(): Promise<string> {
  const url = env.DATABASE_URL_UNPOOLED || env.DATABASE_URL;
  if (!url) return "";
  const client = new pg.Client({ connectionString: url });
  await client.connect();
  const { rows } = await client.query<{ body: string }>(
    `select body from agent_directive
      where active and scope = 'global' and topic in ('general', 'extraction', 'matching')
      order by sort, created_at`,
  );
  await client.end();
  return rows.map((r) => `- ${r.body}`).join("\n");
}

/* ---- the output contract: the partner's gold-set schema ---- */
const SCHEMA = `Return ONLY a JSON object with this shape (the abstraction schema our
reviewing expert works in). Use null where the lease is silent; never
invent a value. Quote source_text verbatim from the lease.

{
  "file": "<the lease file name>",
  "property": "<center name>",
  "tenant": "<tenant entity as named>",
  "clause_present": true|false,
  "clause_locations": ["Section 7.02(c)", ...],
  "clause_type": "opening"|"operating"|"both"|null,
  "tenant_preconditions": ["tenant_open_and_operating", "not_in_default", ...],
  "triggers": [{
    "trigger_type": "named_tenant"|"tenant_count"|"occupancy_pct"|"compound",
    "citation": "<section cite>",
    "named_tenants": ["Macy's", ...] | null,
    "required_count": <int> | null,
    "pool": ["..."] | null,
    "threshold_pct": <number> | null,
    "area_basis": "total_gla"|"inline_gla"|"defined_area"|null,
    "measurement_basis": "leased"|"occupied"|"open_and_operating"|null,
    "exclusions_text": "<verbatim>" | null,
    "deemed_open": ["remodel<=90d", "force_majeure", ...],
    "compound_logic": "<how limbs combine, as drafted>" | null
  }],
  "status": {
    "remedy_type": "alternative_rent"|"abatement"|"sequenced"|"deferred_opening"|null,
    "alt_rent": {"pct_of_gross_sales": <number>|null, "selector": "lesser_of"|"greater_of"|null, "text": "<verbatim>"} | null,
    "cure_period_days": <int> | null,
    "cure_period_months": <int> | null,
    "cure_runs_from": "condition"|"tenant_notice"|"unspecified",
    "cap_months": <int> | null,
    "post_cap_election": "<verbatim>" | null,
    "retroactive_cap_days": <int> | null,
    "suspended_until": "YYYY-MM-DD" | null
  },
  "source_text": "<the operative language, verbatim>",
  "defined_terms": ["Floor Area", ...],
  "confidence": <0..1, your honest confidence in this abstraction>,
  "ambiguity_notes": "<anything a lawyer should look at>" | null,
  "needs_human_review": true|false
}`;

async function main() {
  const lease = readFileSync(leasePath, "utf8");
  const canon = await directives();

  const system = [
    "You abstract co-tenancy provisions from US retail leases into a structured record.",
    "You are precise, conservative, and you never invent a term the lease does not state.",
    canon ? `\nStanding instructions:\n${canon}` : "",
    `\n${SCHEMA}`,
  ].join("\n");

  const user = `Abstract the co-tenancy provision from this lease.\n\nFILE: ${leasePath}\n\n${lease}`;

  const key = env.ANTHROPIC_API_KEY;
  if (!key) {
    mkdirSync("shots", { recursive: true });
    writeFileSync(
      "shots/extraction-prompt.txt",
      `=== SYSTEM ===\n${system}\n\n=== USER ===\n${user.slice(0, 4000)}\n...[lease truncated for preview]`,
    );
    console.log(
      "No ANTHROPIC_API_KEY. Assembled prompt written to shots/extraction-prompt.txt for review.",
    );
    console.log(`Directives included: ${canon.split("\n").filter(Boolean).length}`);
    process.exit(2);
  }

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": key,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: env.EXTRACTION_MODEL || "claude-opus-5",
      max_tokens: 4096,
      system,
      messages: [{ role: "user", content: user }],
    }),
  });
  if (!res.ok) {
    console.error(`API ${res.status}: ${(await res.text()).slice(0, 400)}`);
    process.exit(1);
  }
  const data = (await res.json()) as { content: { type: string; text?: string }[] };
  const text = data.content.find((c) => c.type === "text")?.text ?? "";
  const jsonMatch = /\{[\s\S]*\}/.exec(text);
  if (!jsonMatch) {
    console.error("No JSON in the response.");
    console.error(text.slice(0, 600));
    process.exit(1);
  }
  const record = JSON.parse(jsonMatch[0]) as GoldRecord;

  mkdirSync("shots", { recursive: true });
  writeFileSync("shots/extraction-result.json", JSON.stringify(record, null, 2));
  console.log("Extraction written to shots/extraction-result.json");
  console.log(`confidence: ${record.confidence}  needs_human_review: ${record.needs_human_review}`);

  if (goldPath) {
    const truth = JSON.parse(readFileSync(goldPath, "utf8")) as GoldRecord[];
    const { fields, overall } = scoreExtraction(
      truth,
      new Map([[record.file, record]]),
    );
    console.log(`\nscore vs gold: ${(overall * 100).toFixed(1)}%`);
    for (const f of fields) {
      if (f.compared > 0)
        console.log(
          `  ${f.field.padEnd(28)} ${f.correct}/${f.compared}${
            f.misses.length ? `  (${f.misses[0].file}: ${String(f.misses[0].expected).slice(0, 40)} vs ${String(f.misses[0].actual).slice(0, 40)})` : ""
          }`,
        );
    }
  }
}

await main();
