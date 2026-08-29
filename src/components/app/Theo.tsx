"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  ArrowRight,
  ArrowUp,
  Download,
  FileText,
  Info,
  Sparkles,
} from "lucide-react";
import { type AnswerBlock, type TheoAnswer, greeting, theo } from "@/lib/theo";
import {
  answerToCsv,
  answerToPrintable,
  hasTabularContent,
} from "@/lib/theo-export";

import { Panel, Pill } from "./ui";

/**
 * THEO
 *
 * Light, like the rest of the product — the dark "AI room" read as
 * cheap and is dead (2026-08-29). The intelligence shows through life,
 * not paint: a haloed mark, a soft light source behind the opening,
 * gradient accents, and answers that move. Still a working surface:
 * tables, figures and verbatim lease text with their sources,
 * exportable, with jump buttons into the files Theo cites. Theo also
 * DOES things — scan requests, estoppel queues, flag moves, the notice
 * package — each on the product's real write-path with a receipt.
 */

type TheoLink = { label: string; href: string };

type Turn =
  | { role: "user"; text: string }
  | { role: "theo"; answer: TheoAnswer; links?: TheoLink[] };

/* Questions a co-tenancy professional is actually holding when they
   open this. The kickstarters respect the reader's expertise. */
const STARTERS = [
  "Which locations are closest to tripping, and by how much margin?",
  "Where does relief run from notice only? Those files cannot sit.",
  "Which caps or election windows run out next?",
  "What did the last sweep change, and does any of it touch a named anchor?",
  "Request a scan of Danbury Fair",
];

export function Theo() {
  const [turns, setTurns] = useState<Turn[]>([]);
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const [engine, setEngine] = useState<"model" | "index" | "action" | null>(
    null,
  );
  const [exportMeta, setExportMeta] = useState<{ org: string; asOf: string }>({
    org: "Breakpoint",
    asOf: "",
  });
  useEffect(() => {
    fetch("/app/api/workspace-lite")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d?.org)
          setExportMeta({
            org: d.org.name,
            asOf: d.today ? `Evaluated through ${d.today}` : "",
          });
      })
      .catch(() => {});
  }, []);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [turns, thinking]);

  const send = async (text: string) => {
    const q = text.trim();
    if (!q || thinking) return;
    setInput("");
    setTurns((t) => [...t, { role: "user", text: q }]);
    setThinking(true);

    /* The last few exchanges travel with the question so the brain can
       follow "what about the second one". */
    const history = turns
      .reduce<{ q: string; a: string }[]>((acc, t) => {
        if (t.role === "user") acc.push({ q: t.text, a: "" });
        else if (acc.length)
          acc[acc.length - 1].a = t.answer.lead ?? t.answer.interpreted;
        return acc;
      }, [])
      .slice(-6);

    try {
      const res = await fetch("/app/api/theo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: q, history }),
      });
      if (!res.ok) throw new Error();
      const data = (await res.json()) as {
        engine: "model" | "index" | "action";
        answer: TheoAnswer;
        links?: TheoLink[];
      };
      setEngine(data.engine);
      setTurns((t) => [
        ...t,
        { role: "theo", answer: data.answer, links: data.links },
      ]);
    } catch {
      setTurns((t) => [
        ...t,
        {
          role: "theo",
          answer: {
            interpreted: q,
            lead: "I could not reach the portfolio just now. Try again in a moment.",
            provenance: "",
            blocks: [],
            followUps: [],
          },
        },
      ]);
    } finally {
      setThinking(false);
    }
  };

  /* Viewport-bound, the way a chat surface has to be: the panel fills
     the screen below the topbar and page head, the conversation
     scrolls INSIDE it, and the composer is always on screen, on a
     laptop or a 4K monitor alike. Heights apply at lg only; small
     screens keep natural flow. */
  return (
    <div className="grid gap-4 lg:h-[calc(100svh-13.5rem)] lg:min-h-[540px] lg:grid-cols-[minmax(0,1fr)_260px]">
      <div className="relative flex min-h-[480px] flex-col overflow-hidden rounded-2xl border border-slate-200/60 bg-white shadow-xl shadow-slate-200/50 lg:h-full lg:min-h-0">
        {/* the light source: one soft wash above the conversation */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-64"
          style={{
            background:
              "radial-gradient(65% 100% at 50% 0%, rgba(99,102,241,0.09), transparent 75%)",
          }}
        />

        {/* conversation */}
        <div className="scroll-sleek relative min-h-0 flex-1 space-y-5 overflow-y-auto p-5 sm:p-6">
          {turns.length === 0 && (
            <div className="flex min-h-full flex-col justify-center py-6">
              <div className="flex items-center gap-4">
                {/* the mark, haloed and breathing */}
                <span className="relative flex h-12 w-12 items-center justify-center">
                  <span className="absolute inset-0 animate-pulse rounded-2xl bg-indigo-400/40 blur-xl" />
                  <span className="relative flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-600 shadow-lg shadow-indigo-500/40">
                    <Sparkles className="h-5 w-5 text-white" />
                  </span>
                </span>
                <div>
                  <p className="text-[1rem] font-bold tracking-tight text-slate-900">
                    {theo.name}
                  </p>
                  <p className="text-[0.75rem] font-medium text-indigo-600">
                    {theo.role}
                  </p>
                </div>
              </div>
              <p className="mt-6 max-w-xl text-[1.0625rem] leading-relaxed text-slate-900">
                {greeting()}
              </p>
              <p className="mt-3 max-w-lg text-[0.8125rem] leading-relaxed text-slate-500">
                {theo.charter}
              </p>

              <div className="mt-6 flex flex-wrap gap-2">
                {STARTERS.map((s, i) => (
                  <motion.button
                    key={s}
                    type="button"
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.08 * i, duration: 0.35 }}
                    onClick={() => void send(s)}
                    className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-left text-[0.8125rem] text-slate-700 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-indigo-300 hover:bg-indigo-50/60 hover:text-indigo-800 hover:shadow-md hover:shadow-indigo-100"
                  >
                    {s}
                  </motion.button>
                ))}
              </div>
            </div>
          )}

          <AnimatePresence initial={false}>
            {turns.map((t, i) =>
              t.role === "user" ? (
                <motion.div
                  key={`u${i}`}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex justify-end"
                >
                  <p className="max-w-[80%] rounded-2xl rounded-br-md bg-gradient-to-br from-indigo-600 to-violet-600 px-4 py-2.5 text-[0.875rem] text-white shadow-md shadow-indigo-500/25">
                    {t.text}
                  </p>
                </motion.div>
              ) : (
                <motion.div
                  key={`t${i}`}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                  className="flex gap-3"
                >
                  <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-600 to-violet-600 shadow-md shadow-indigo-500/30">
                    <Sparkles className="h-3.5 w-3.5 text-white" />
                  </span>
                  <div className="min-w-0 flex-1 space-y-3">
                    <p className="text-[0.75rem] font-medium text-indigo-600">
                      {t.answer.interpreted}
                    </p>
                    {t.answer.lead && (
                      <p className="text-[0.9375rem] leading-relaxed text-slate-900">
                        {t.answer.lead}
                      </p>
                    )}
                    {t.answer.blocks.map((b, k) => (
                      <Block key={k} block={b} />
                    ))}

                    {/* jump buttons: straight into the file Theo cites */}
                    {t.links && t.links.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {t.links.map((l) =>
                          l.href.startsWith("/app/api/") ? (
                            <a
                              key={l.href}
                              href={l.href}
                              className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3 py-2 text-[0.8125rem] font-semibold text-white shadow-md shadow-indigo-500/30 transition-all hover:bg-indigo-500 active:scale-95"
                            >
                              <Download className="h-3.5 w-3.5" />
                              {l.label}
                            </a>
                          ) : (
                            <Link
                              key={l.href}
                              href={l.href}
                              className="inline-flex items-center gap-1.5 rounded-xl border border-indigo-200 bg-indigo-50 px-3 py-2 text-[0.8125rem] font-semibold text-indigo-800 shadow-sm transition-all hover:border-indigo-300 hover:bg-indigo-100 active:scale-95"
                            >
                              {l.label}
                              <ArrowRight className="h-3.5 w-3.5" />
                            </Link>
                          ),
                        )}
                      </div>
                    )}

                    {/* An answer that cannot leave the screen is half an
                        answer. A real request from a regional manager was
                        for "a one pager" to take into a meeting. */}
                    <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 pt-2.5">
                      <button
                        type="button"
                        onClick={() => {
                          const w = window.open("", "_blank");
                          if (!w) return;
                          w.document.write(
                            answerToPrintable(t.answer!, {
                              org: exportMeta.org,
                              asOf: exportMeta.asOf,
                            }),
                          );
                          w.document.close();
                        }}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-[0.75rem] font-semibold text-slate-700 shadow-sm transition-colors hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-800"
                      >
                        <FileText className="h-3 w-3" />
                        One pager
                      </button>
                      {hasTabularContent(t.answer) && (
                        <button
                          type="button"
                          onClick={() => {
                            const blob = new Blob([answerToCsv(t.answer!)], {
                              type: "text/csv",
                            });
                            const url = URL.createObjectURL(blob);
                            const a = document.createElement("a");
                            a.href = url;
                            a.download = `breakpoint-${t.answer!.interpreted
                              .toLowerCase()
                              .replace(/[^a-z0-9]+/g, "-")
                              .slice(0, 48)}.csv`;
                            a.click();
                            URL.revokeObjectURL(url);
                          }}
                          className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-[0.75rem] font-semibold text-slate-700 shadow-sm transition-colors hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-800"
                        >
                          <Download className="h-3 w-3" />
                          CSV
                        </button>
                      )}
                      <p className="flex items-center gap-1.5 text-[0.6875rem] text-slate-400">
                        <Info className="h-3 w-3" />
                        {t.answer.provenance}
                      </p>
                    </div>
                    {t.answer.followUps.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {t.answer.followUps.map((f) => (
                          <button
                            key={f}
                            type="button"
                            onClick={() => void send(f)}
                            className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-[0.75rem] text-slate-500 transition-colors hover:border-indigo-300 hover:bg-indigo-50/60 hover:text-indigo-700"
                          >
                            {f}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </motion.div>
              ),
            )}
          </AnimatePresence>

          {thinking && (
            <div className="flex items-center gap-3 text-[0.8125rem] text-slate-500">
              <span className="relative flex h-7 w-7 items-center justify-center">
                <span className="absolute inset-0 animate-pulse rounded-lg bg-indigo-400/30 blur-md" />
                <span className="relative flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-600 to-violet-600 shadow-md shadow-indigo-500/30">
                  <Sparkles className="h-3.5 w-3.5 animate-pulse text-white" />
                </span>
              </span>
              Reading your portfolio
            </div>
          )}
          <div ref={endRef} />
        </div>

        {/* composer */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void send(input);
          }}
          className="flex items-center gap-2 border-t border-slate-100 bg-slate-50/60 p-3"
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={`Ask ${theo.name}, or tell him to do something`}
            className="h-10 flex-1 rounded-xl border border-slate-200 bg-white px-3.5 text-[0.875rem] text-slate-900 shadow-sm placeholder:text-slate-400 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/15 focus:outline-none"
          />
          <button
            type="submit"
            disabled={!input.trim() || thinking}
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600 text-white shadow-md shadow-indigo-500/30 transition-all hover:from-indigo-500 hover:to-violet-500 active:scale-95 disabled:opacity-40 disabled:shadow-none"
          >
            <ArrowUp className="h-4 w-4" />
          </button>
        </form>
      </div>

      {/* what he can do */}
      <div className="scroll-sleek space-y-3 lg:h-full lg:min-h-0 lg:overflow-y-auto">
        <Panel>
          <p className="text-[0.8125rem] font-semibold text-slate-900">
            What {theo.name} can answer
          </p>
          <ul className="mt-3 space-y-2.5 text-[0.8125rem] text-slate-500">
            {[
              "Which leases depend on a given retailer",
              "What is happening at any center",
              "The exact wording of a clause, with its section",
              "When a store was last checked, and by which sources",
              "What may qualify for co-tenancy rent, and what it is worth",
              "Which reporting rights you can exercise",
            ].map((x) => (
              <li key={x} className="flex gap-2">
                <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-indigo-600" />
                {x}
              </li>
            ))}
          </ul>
        </Panel>

        <Panel>
          <p className="text-[0.8125rem] font-semibold text-slate-900">
            What {theo.name} can do
          </p>
          <ul className="mt-3 space-y-2.5 text-[0.8125rem] text-slate-500">
            {[
              "Request a scan of any center",
              "Queue an estoppel review before anyone signs",
              "Move a flag through the inbox for you",
              "Hand you the counsel-ready notice package",
              "Jump you straight to any location's file",
            ].map((x) => (
              <li key={x} className="flex gap-2">
                <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-violet-600" />
                {x}
              </li>
            ))}
          </ul>
          <p className="mt-3 border-t border-slate-100 pt-2.5 text-[0.6875rem] leading-relaxed text-slate-400">
            Every task lands on the same queue and record the buttons use, on
            the audit trail.
          </p>
        </Panel>

        <Panel>
          <p className="text-[0.8125rem] font-semibold text-slate-900">Engine</p>
          <p className="mt-2 text-[0.8125rem] leading-relaxed text-slate-500">
            {engine === "model"
              ? "Reasoning model over your portfolio index and the operations canon. Figures always come from the index."
              : engine === "action"
                ? "That was a task: performed on the live record and confirmed with a receipt."
                : "Portfolio index. Every figure is computed from your leases and our observations. The reasoning model joins when connected."}
          </p>
          {engine && (
            <Pill
              tone={engine === "index" ? "muted" : "petrol"}
              className="mt-2.5"
            >
              {engine === "model"
                ? "Model + index"
                : engine === "action"
                  ? "Task performed"
                  : "Index"}
            </Pill>
          )}
        </Panel>

        <Panel>
          <p className="text-[0.8125rem] font-semibold text-slate-900">Limits</p>
          <p className="mt-2 text-[0.8125rem] leading-relaxed text-slate-500">
            {theo.name} answers only from your own data and cites the source
            each time. He does not estimate occupancy where the denominator
            lives in a site plan we have not been given, and he does not give
            legal advice.
          </p>
          <Link
            href="/app/coverage"
            className="mt-3 inline-flex items-center gap-1.5 text-[0.8125rem] font-semibold text-indigo-700 hover:underline"
          >
            <FileText className="h-3.5 w-3.5" />
            See coverage
          </Link>
        </Panel>
      </div>
    </div>
  );
}

/* Answer blocks on the light surface: white cards, real borders, no
   washed grays. */
function Block({ block }: { block: AnswerBlock }) {
  if (block.type === "text")
    return (
      <p className="text-[0.875rem] leading-relaxed text-slate-700">
        {block.body}
      </p>
    );

  if (block.type === "stat")
    return (
      <div className="grid gap-2 sm:grid-cols-3">
        {block.items.map((s) => (
          <div
            key={s.label}
            className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm"
          >
            <p className="text-[0.75rem] text-slate-500">{s.label}</p>
            <p className="tnum mt-1 text-[1.25rem] font-bold leading-none text-slate-900">
              {s.value}
            </p>
            {s.hint && (
              <p className="mt-1 text-[0.6875rem] leading-snug text-slate-400">
                {s.hint}
              </p>
            )}
          </div>
        ))}
      </div>
    );

  if (block.type === "verbatim")
    return (
      <div className="rounded-xl border border-slate-200 border-l-4 border-l-indigo-600 bg-white p-4 shadow-sm">
        <p className="text-[0.6875rem] font-semibold tracking-wide text-indigo-700 uppercase">
          {block.cite}
        </p>
        <p className="mt-2 text-[0.8125rem] leading-[1.8] text-slate-700">
          {block.body}
        </p>
      </div>
    );

  if (block.type === "gap")
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
        <p className="text-[0.8125rem] leading-relaxed text-slate-700">
          {block.body}
        </p>
        {block.action && (
          <Link
            href={block.action.href}
            className="mt-2.5 inline-block text-[0.8125rem] font-semibold text-amber-700 hover:underline"
          >
            {block.action.label}
          </Link>
        )}
      </div>
    );

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 shadow-sm">
      <table className="w-full border-collapse text-left">
        <thead>
          <tr className="bg-slate-50">
            {block.columns.map((c) => (
              <th
                key={c}
                className="px-3 py-2 text-[0.6875rem] font-semibold tracking-wider text-slate-400 uppercase"
              >
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 bg-white">
          {block.rows.map((r, i) => (
            <tr key={i} className="hover:bg-indigo-50/40">
              {r.cells.map((cell, j) => (
                <td key={j} className="px-3 py-2 text-[0.8125rem] text-slate-700">
                  {j === 0 && r.href ? (
                    <Link
                      href={r.href}
                      className="font-semibold text-indigo-800 hover:underline"
                    >
                      {cell}
                    </Link>
                  ) : (
                    cell
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {block.caption && (
        <p className="border-t border-slate-200 bg-white px-3 py-2 text-[0.75rem] text-slate-500">
          {block.caption}
        </p>
      )}
    </div>
  );
}
