import "server-only";
import { db } from "@/lib/db";

/**
 * The capture checklist: what a lease abstraction must hunt for,
 * field by field, in the expert's own words. Rows live in
 * extraction_field (migration 018, seeded from the gold-set schema)
 * and are edited on /admin/extraction, so refining the agent's
 * attention is a row edit and not a deploy.
 *
 * This steers the model. The structural JSON contract the extractor
 * validates against stays in code (ingest/provider.ts), where it is
 * enforceable.
 */

export type ExtractionField = {
  id: string;
  field_key: string;
  label: string;
  instruction: string;
  category: string;
  required: boolean;
  active: boolean;
  sort: number;
  source: string | null;
};

const CATEGORY_TITLE: Record<string, string> = {
  identity: "The document and the clause",
  trigger: "The trigger (each limb separately)",
  remedy: "The remedy and its clocks",
  preconditions: "Tenant preconditions",
  status: "What has already happened",
  review: "Honesty about the read",
};

export const CATEGORY_ORDER = [
  "identity",
  "trigger",
  "remedy",
  "preconditions",
  "status",
  "review",
];

export async function listExtractionFields(): Promise<ExtractionField[]> {
  const { rows } = await db().query(
    `select id, field_key, label, instruction, category, required, active, sort, source
       from extraction_field
      order by array_position($1::text[], category), sort, created_at`,
    [CATEGORY_ORDER],
  );
  return rows as ExtractionField[];
}

/** Render the active checklist as prompt text. Empty string if the
    table is empty or unreachable — the checklist is an enhancement,
    never a dependency. */
export async function captureChecklist(): Promise<string> {
  let fields: ExtractionField[];
  try {
    fields = (await listExtractionFields()).filter((f) => f.active);
  } catch {
    return "";
  }
  if (!fields.length) return "";

  const lines: string[] = [
    "CAPTURE CHECKLIST — the abstraction is incomplete without an answer (or an explicit null with a reason) for every REQUIRED item:",
  ];
  let lastCategory = "";
  for (const f of fields) {
    if (f.category !== lastCategory) {
      lines.push(`\n${CATEGORY_TITLE[f.category] ?? f.category}:`);
      lastCategory = f.category;
    }
    lines.push(
      `- ${f.label}${f.required ? " (REQUIRED)" : ""}: ${f.instruction}`,
    );
  }
  return lines.join("\n");
}
