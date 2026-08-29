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
import { db } from "@/lib/db";

export const runtime = "nodejs";

/* ------------------------------------------------------------------
   Theo's hands: tasks on the write-paths the product actually has.
   Nothing invented: a scan request files to the same ops queue the
   location page files to; a flag moves through the same inbox
   lifecycle; a notice package is the same download counsel gets. A
   task Theo cannot ground in a real location is not performed.
   ------------------------------------------------------------------ */

export type TheoLink = { label: string; href: string };

const fold = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

function resolveLocation(question: string) {
  const idMatch = /af[- ]?(\d{4})/i.exec(question);
  if (idMatch) {
    const hit = rows.find((r) => r.id.toLowerCase() === `af-${idMatch[1]}`);
    if (hit) return hit;
  }
  const q = ` ${fold(question)} `;
  let best: (typeof rows)[number] | null = null;
  let bestLen = 0;
  for (const r of rows) {
    const name = fold(r.center.name);
    if (name.length > bestLen && q.includes(` ${name} `)) {
      best = r;
      bestLen = name.length;
    }
    /* also try without generic words: "danbury" finds Danbury Fair */
    const distinct = name
      .split(" ")
      .filter((w) => !["the", "mall", "center", "at", "shops", "of"].includes(w))
      .join(" ");
    if (distinct && distinct.length > bestLen && q.includes(` ${distinct} `)) {
      best = r;
      bestLen = distinct.length;
    }
  }
  return best;
}

const locLink = (r: (typeof rows)[number]): TheoLink => ({
  label: `Open ${r.id} · ${r.center.name}`,
  href: `/app/locations/${r.id}`,
});

type TaskOutcome = {
  interpreted: string;
  lead: string;
  links: TheoLink[];
} | null;

async function tryTask(question: string): Promise<TaskOutcome> {
  const q = question.toLowerCase();
  const loc = resolveLocation(question);
  const slug = currentOrg().slug;

  const wantsScan =
    /(request|run|order|schedule|start|get)[^.?!]*\bscan\b|\bscan\b[^.?!]*\b(request|now|please)\b/.test(q);
  const wantsEstoppel = /\bestoppel\b[^.?!]*\b(check|review|request|run)\b|\b(check|review|request|run)\b[^.?!]*\bestoppel\b/.test(q);
  const wantsReview = /\b(start|begin|open)\b[^.?!]*\breview\b/.test(q);
  const wantsHandled = /\bmark\b[^.?!]*\bhandled\b|\bhandled\b[^.?!]*\bflag\b/.test(q);
  const wantsPackage = /\b(assemble|draft|download|prepare|build)\b[^.?!]*\b(notice|package)\b/.test(q);
  const wantsJump = /\b(open|show me|take me to|go to|pull up)\b/.test(q);

  const needsLocation =
    wantsScan || wantsEstoppel || wantsReview || wantsHandled || wantsPackage;
  if (needsLocation && !loc) {
    const flagged = rows.filter(
      (r) =>
        r.evaluation.state === "claimable" ||
        r.evaluation.state === "election_open",
    );
    return {
      interpreted: "A task, but the location is ambiguous",
      lead: "Tell me which location and I will do it. These are the ones currently flagged:",
      links: flagged.slice(0, 4).map(locLink),
    };
  }

  if (wantsScan && loc) {
    await db().query(
      `insert into client_request (org_slug, location_ref, center_name, kind, body)
       values ($1, $2, $3, 'manual_scan', $4)`,
      [slug, loc.id, loc.center.name, "Requested through Theo."],
    );
    await db().query(
      `insert into audit_log (actor, action, org_slug, subject, detail)
       values ('client', 'theo_task', $1, $2, 'manual_scan requested')`,
      [slug, loc.id],
    );
    return {
      interpreted: `Task: request a scan of ${loc.center.name}`,
      lead: `Done. A scan of ${loc.center.name} is on the operations queue, marked as requested through me. The pass reads every watched storefront there and files what it finds to your activity record. You will see it in Scan history when it lands.`,
      links: [locLink(loc), { label: "Activity", href: "/app/activity" }],
    };
  }

  if (wantsEstoppel && loc) {
    await db().query(
      `insert into client_request (org_slug, location_ref, center_name, kind, body)
       values ($1, $2, $3, 'estoppel_review', $4)`,
      [slug, loc.id, loc.center.name, "Requested through Theo."],
    );
    await db().query(
      `insert into audit_log (actor, action, org_slug, subject, detail)
       values ('client', 'theo_task', $1, $2, 'estoppel_review requested')`,
      [slug, loc.id],
    );
    return {
      interpreted: `Task: estoppel review at ${loc.center.name}`,
      lead: `Done. An estoppel review for ${loc.center.name} is on the operations queue. Before anyone signs an estoppel certificate there, the live position gets checked against it, because certifying "no claims or offsets" can bar a position this clause is carrying.`,
      links: [locLink(loc)],
    };
  }

  if ((wantsReview || wantsHandled) && loc) {
    const to = wantsHandled ? "handled" : "in_review";
    const fromCond = wantsHandled ? `status <> 'handled'` : `status = 'new'`;
    const { rowCount } = await db().query(
      `update finding_alert
          set status = $1, actor = 'client',
              handled_at = case when $1 = 'handled' then now() else null end,
              updated_at = now()
        where org_slug = $2 and location_ref = $3 and ${fromCond}`,
      [to, slug, loc.id],
    );
    if (!rowCount)
      return {
        interpreted: `Task: move the flag on ${loc.center.name}`,
        lead: `There is no flag on ${loc.center.name} in a state I can move ${
          wantsHandled ? "to handled" : "into review"
        }. The inbox has the live picture.`,
        links: [{ label: "Open the inbox", href: "/app/inbox" }, locLink(loc)],
      };
    await db().query(
      `insert into audit_log (actor, action, org_slug, subject, detail)
       values ('client', 'theo_task', $1, $2, $3)`,
      [slug, loc.id, `flag moved to ${to}`],
    );
    return {
      interpreted: `Task: ${wantsHandled ? "mark handled" : "start review"} at ${loc.center.name}`,
      lead: wantsHandled
        ? `Done. The flag on ${loc.center.name} is marked handled, on the record with a timestamp. If the condition recurs later, a fresh flag files with a new date.`
        : `Done. The flag on ${loc.center.name} is in review under your name. When the decision is made, mark it handled and it leaves the queue but stays in the ledger.`,
      links: [{ label: "Open the inbox", href: "/app/inbox" }, locLink(loc)],
    };
  }

  if (wantsPackage && loc) {
    return {
      interpreted: `Task: the notice package for ${loc.center.name}`,
      lead: `The package for ${loc.center.name} is assembled from the live record: the counsel-ready letter, the clause extract with its citation, the dated evidence chain, and the computation. Download it below, stamped with its assembly time.`,
      links: [
        {
          label: "Download the package",
          href: `/app/api/notice-package?location=${loc.id}`,
        },
        { label: "Notice desk", href: "/app/notices" },
        locLink(loc),
      ],
    };
  }

  if (wantsJump && loc) {
    return {
      interpreted: `Jump to ${loc.center.name}`,
      lead: `${loc.center.name} is ${STATE_META[loc.evaluation.state].label.toLowerCase()}. The full file is one click away.`,
      links: [locLink(loc)],
    };
  }

  return null;
}

/** Jump buttons derived from any answer: every location it cites. */
function deriveLinks(texts: string[]): TheoLink[] {
  const joined = texts.join(" ");
  const seen = new Set<string>();
  const links: TheoLink[] = [];
  for (const m of joined.matchAll(/AF-(\d{4})/gi)) {
    const id = `AF-${m[1]}`;
    if (seen.has(id)) continue;
    const r = rows.find((x) => x.id === id);
    if (r) {
      seen.add(id);
      links.push(locLink(r));
    }
    if (links.length >= 4) break;
  }
  return links;
}

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

  /* Layer 0: tasks. When the client asks Theo to DO something the
     product can do, he does it on the real write-path and confirms
     with a receipt. Evaluated fresh on every request; nothing cached. */
  try {
    const task = await tryTask(question);
    if (task) {
      return NextResponse.json({
        engine: "action",
        answer: {
          interpreted: task.interpreted,
          lead: task.lead,
          blocks: [],
          followUps: [
            "What else is flagged right now?",
            "What changed in the last sweep?",
            "Which deadlines are closest?",
          ],
        },
        links: task.links,
      });
    }
  } catch {
    /* a task failure falls through to a normal answer; Theo is never down */
  }

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
    const lead = polish.lead?.trim() || answer.lead || "";
    return NextResponse.json({
      engine: "model",
      answer: {
        ...answer,
        interpreted: polish.interpreted?.trim() || answer.interpreted,
        lead,
        followUps:
          Array.isArray(polish.followUps) && polish.followUps.length
            ? polish.followUps.slice(0, 3).map((f) => String(f).slice(0, 120))
            : answer.followUps,
        /* When the router missed, the model's lead carries the answer
           and the engine's apology block would contradict it. */
        blocks: routerMissed ? [] : answer.blocks,
      },
      links: deriveLinks([lead, blocksText]),
    });
  }

  return NextResponse.json({
    engine: "index",
    answer,
    links: deriveLinks([answer.lead ?? "", blocksText]),
  });
}
