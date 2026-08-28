/**
 * THEO'S BRAIN
 *
 * Two layers, deliberately:
 *
 * 1. The engine layer always runs: lib/theo's tool router computes the
 *    structured answer — tables, figures, verbatim clause text — from
 *    the real portfolio. Numbers only ever come from here.
 * 2. The model layer runs when ANTHROPIC_API_KEY is present: the model
 *    receives the question, the conversation, a compact digest of the
 *    portfolio, the engine's structured answer, and the same agent
 *    canon the extraction runner uses — and returns better prose: the
 *    interpretation, a reasoned lead, sharper follow-ups. It may reason
 *    across the digest when the router missed the intent, but it is
 *    instructed to state only figures present in what it was given.
 *
 * If the model call fails for any reason, the engine answer ships
 * alone. Theo is never down because a model is.
 */
import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, SESSION_TOKEN } from "@/lib/session";
import { currentOrg } from "@/lib/repo";
import { assembleDirectives } from "@/lib/directives";
import { ask, theo } from "@/lib/theo";
import { STATE_META, formatCoTenancyRent } from "@/lib/clause";
import { TODAY, org, rows, summary } from "@/lib/portfolio";
import { sweeps } from "@/lib/activity";
import { portfolioDeadlines } from "@/lib/deadlines";

export const runtime = "nodejs";

const MODEL = process.env.THEO_MODEL || "claude-fable-5";

/** One line per location: everything the model may cite. */
function portfolioDigest(): string {
  const lines = rows.map((r) => {
    const ev = r.evaluation;
    const failing = ev.triggers
      .filter((t) => t.failing)
      .map((t) => t.label)
      .join(" + ");
    const clocks = [
      ev.daysUntilCureEnds != null && ev.daysUntilCureEnds > 0
        ? `cure ends in ${ev.daysUntilCureEnds}d`
        : null,
      ev.daysUntilElection != null && ev.daysUntilElection > 0
        ? `election lapses in ${ev.daysUntilElection}d`
        : null,
    ]
      .filter(Boolean)
      .join(", ");
    return [
      `${r.id} ${r.center.name} (${r.center.city}, ${r.center.state})`,
      `state=${STATE_META[ev.state].label}`,
      failing ? `failing=${failing}` : "failing=none",
      `potential=${formatCoTenancyRent(ev.monthlyDelta)}`,
      clocks || null,
    ]
      .filter(Boolean)
      .join(" · ");
  });

  const recent = sweeps
    .slice(0, 3)
    .map(
      (s) =>
        `${s.ranOn}: ${s.targetsChecked} stores read, ${s.changes} changes${
          s.moved.length
            ? ` (${s.moved.map((m) => `${m.store} at ${m.center}: ${m.from} to ${m.to}`).join("; ")})`
            : ""
        }`,
    )
    .join("\n");

  const deadlines = portfolioDeadlines()
    .slice(0, 6)
    .map((d) => `${d.dateISO}: ${d.title}`)
    .join("\n");

  return [
    `Client: ${org.name}. ${org.watched} watched locations across ${summary.centers} centers in ${summary.states} states. Evaluated through ${TODAY}.`,
    `Cumulative potential co-tenancy rent on reported sales: $${Math.round(summary.cumulativeAtRisk).toLocaleString("en-US")}.`,
    `Locations:`,
    ...lines,
    `Recent scan passes:`,
    recent,
    `Upcoming deadlines:`,
    deadlines,
  ].join("\n");
}

type ModelPolish = {
  interpreted?: string;
  lead?: string;
  followUps?: string[];
};

async function polishWithModel(
  question: string,
  history: { q: string; a: string }[],
  engineInterpreted: string,
  engineLead: string,
  engineBlocksText: string,
  routerMissed: boolean,
): Promise<ModelPolish | null> {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return null;

  let canon = "";
  try {
    canon = await assembleDirectives(currentOrg().slug);
  } catch {
    /* the canon is an enhancement, not a dependency */
  }

  const system = [
    `You are Theo, the portfolio analyst inside Breakpoint, a co-tenancy monitoring service for retail tenants. ${theo.charter}`,
    `Hard rules:`,
    `- State only figures, dates, store names and locations that appear in the DIGEST or the ENGINE ANSWER below. Never invent or extrapolate a number.`,
    `- Money is always potential, never owed: say "may qualify", "potential", "estimated". Never state that rent is owed or that a claim exists.`,
    `- You do not give legal advice. Whether a right exists is for the client and their counsel.`,
    `- Refer to locations by their id (for example AF-1126) so the client can open them.`,
    `- Plain American English. No em dashes.`,
    canon ? `Standing instructions from the operations canon:\n${canon}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  const digest = portfolioDigest();
  const convo = history
    .slice(-6)
    .map((h) => `Client asked: ${h.q}\nTheo answered: ${h.a}`)
    .join("\n");

  const user = [
    `DIGEST:\n${digest}`,
    convo ? `CONVERSATION SO FAR:\n${convo}` : "",
    `QUESTION: ${question}`,
    `ENGINE ANSWER (computed from the portfolio; its tables and figures are correct and will be shown to the client unchanged):`,
    `interpreted: ${engineInterpreted}`,
    `lead: ${engineLead}`,
    `blocks: ${engineBlocksText}`,
    routerMissed
      ? `The engine's router did not recognize this question. Answer it yourself in "lead", reasoning over the DIGEST only, and say plainly if the data cannot answer it.`
      : `Improve the prose: write a sharper "interpreted" line and a reasoned "lead" of two to four sentences that adds judgment (what matters most, what to do next) without restating the tables.`,
    `Reply with ONLY a JSON object: {"interpreted": string, "lead": string, "followUps": [three short follow-up questions the client should ask next]}`,
  ]
    .filter(Boolean)
    .join("\n\n");

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 20000);
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      signal: controller.signal,
      headers: {
        "x-api-key": key,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 700,
        system,
        messages: [{ role: "user", content: user }],
      }),
    });
    clearTimeout(timer);
    if (!res.ok) return null;
    const data = (await res.json()) as {
      content?: { type: string; text?: string }[];
    };
    const text =
      data.content?.find((c) => c.type === "text")?.text?.trim() ?? "";
    const raw = text.replace(/^```(?:json)?/m, "").replace(/```$/m, "").trim();
    const parsed = JSON.parse(raw) as ModelPolish;
    if (typeof parsed.lead !== "string") return null;
    return parsed;
  } catch {
    return null;
  }
}

export async function POST(request: NextRequest) {
  if (request.cookies.get(SESSION_COOKIE)?.value !== SESSION_TOKEN)
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const payload = (await request.json().catch(() => null)) as {
    question?: string;
    history?: { q: string; a: string }[];
  } | null;
  const question = String(payload?.question ?? "").trim().slice(0, 500);
  if (!question)
    return NextResponse.json({ error: "Ask something." }, { status: 400 });
  const history = Array.isArray(payload?.history)
    ? payload!.history!.slice(-6).map((h) => ({
        q: String(h?.q ?? "").slice(0, 300),
        a: String(h?.a ?? "").slice(0, 500),
      }))
    : [];

  /* Layer 1: the engine. Always. */
  const answer = ask(question);
  const routerMissed = answer.lead?.startsWith("I am not sure") ?? false;

  /* Layer 2: the model, when the key exists. */
  const blocksText = answer.blocks
    .map((b) => {
      if (b.type === "text") return b.body;
      if (b.type === "stat")
        return b.items.map((s) => `${s.label}: ${s.value}`).join("; ");
      if (b.type === "verbatim") return `${b.cite}: ${b.body}`;
      if (b.type === "gap") return b.body;
      return `${b.columns.join(" | ")}\n${b.rows
        .map((r) => r.cells.join(" | "))
        .join("\n")}`;
    })
    .join("\n---\n")
    .slice(0, 6000);

  const polish = await polishWithModel(
    question,
    history,
    answer.interpreted,
    answer.lead ?? "",
    blocksText,
    routerMissed,
  );

  if (polish) {
    return NextResponse.json({
      engine: "model",
      answer: {
        ...answer,
        interpreted: polish.interpreted?.trim() || answer.interpreted,
        lead: polish.lead?.trim() || answer.lead,
        followUps:
          Array.isArray(polish.followUps) && polish.followUps.length
            ? polish.followUps.slice(0, 3).map((f) => String(f).slice(0, 120))
            : answer.followUps,
        /* When the router missed, the model's lead carries the answer
           and the engine's apology block would contradict it. */
        blocks: routerMissed ? [] : answer.blocks,
      },
    });
  }

  return NextResponse.json({ engine: "index", answer });
}
