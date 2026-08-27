/**
 * Assemble what the agent is told for one run.
 *
 * Two layers, both rows in agent_directive and both editable from
 * operations: Breakpoint-wide judgment first, then the client's own
 * specifics. The hard laws — matching, dates, evidence tiers — live in
 * code where they are enforceable; directives carry the judgment that
 * has to reach a model's context instead.
 *
 * Server-only. Every future agent entry point (clause extraction, scan
 * reasoning, notice drafting) builds its system prompt through this so
 * tuning the agent is a row edit, not a deploy.
 */
import { db } from "./db";

export async function assembleDirectives(
  orgSlug: string,
  topic?: "general" | "extraction" | "scanning" | "matching" | "notices",
): Promise<string> {
  const { rows } = await db().query<{ scope: string; topic: string; body: string }>(
    `select scope, topic, body from agent_directive
      where active and scope in ('global', $1)
        and ($2::text is null or topic in ('general', $2))
      order by case when scope = 'global' then 0 else 1 end, sort, created_at`,
    [orgSlug, topic ?? null],
  );

  if (!rows.length) return "";

  const global = rows.filter((r) => r.scope === "global");
  const org = rows.filter((r) => r.scope !== "global");

  const section = (title: string, list: typeof rows) =>
    list.length
      ? `${title}\n${list.map((r) => `- ${r.body}`).join("\n")}`
      : "";

  return [
    section("Standing instructions:", global),
    section("Instructions for this client:", org),
  ]
    .filter(Boolean)
    .join("\n\n");
}
