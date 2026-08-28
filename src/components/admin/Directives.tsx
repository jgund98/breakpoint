"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";
import { cn } from "@/lib/cn";
import { Btn, Card, inputCls, selectCls } from "@/components/admin/ui";

/**
 * Agent programming.
 *
 * Edited at HQ only for now: the system-wide canon that reaches every
 * client's runs. Per-client programming was deliberately pulled from
 * the client boards until that workflow is designed; the scope prop
 * stays so it can return without another refactor.
 */

export type Directive = {
  id: string;
  scope: string;
  topic: string;
  body: string;
  active: boolean;
};

const TOPICS = ["general", "extraction", "scanning", "matching", "notices"];

const TOPIC_CHIP: Record<string, string> = {
  general: "bg-slate-100 text-slate-600",
  extraction: "bg-indigo-50 text-indigo-600",
  scanning: "bg-sky-50 text-sky-600",
  matching: "bg-violet-50 text-violet-600",
  notices: "bg-amber-50 text-amber-700",
};

export function DirectiveEditor({
  title,
  blurb,
  scope,
  directives,
  onPost,
}: {
  title: string;
  blurb: string;
  /** The one scope this editor reads and writes. */
  scope: "global" | "org";
  directives: Directive[];
  onPost: (payload: Record<string, unknown>) => Promise<unknown>;
}) {
  const [topic, setTopic] = useState("general");
  const [body, setBody] = useState("");

  return (
    <Card className="overflow-hidden">
      <div className="border-b border-slate-100 px-6 py-4">
        <h2 className="text-[0.9375rem] font-semibold text-slate-900">{title}</h2>
        <p className="mt-0.5 max-w-[52rem] text-[0.8125rem] leading-snug text-slate-500">
          {blurb}
        </p>
      </div>

      <ul className="space-y-2 px-6 py-5">
        {directives.map((d) => (
          <li
            key={d.id}
            className={cn(
              "flex items-start justify-between gap-3 rounded-xl border border-slate-100 bg-slate-50/50 px-4 py-3 transition-colors hover:border-slate-200",
              !d.active && "opacity-50",
            )}
          >
            <p className="min-w-0 text-[0.8125rem] leading-snug text-slate-700">
              <span
                className={cn(
                  "mr-2 rounded-md px-1.5 py-0.5 text-[0.625rem] font-bold uppercase tracking-wide",
                  TOPIC_CHIP[d.topic] ?? TOPIC_CHIP.general,
                )}
              >
                {d.topic}
              </span>
              {d.body}
            </p>
            <span className="flex shrink-0 items-center gap-2">
              <button
                type="button"
                onClick={() => void onPost({ action: "directive_toggle", id: d.id })}
                className="text-[0.6875rem] font-semibold text-slate-500 hover:text-slate-900"
              >
                {d.active ? "Disable" : "Enable"}
              </button>
              <button
                type="button"
                onClick={() => void onPost({ action: "directive_remove", id: d.id })}
                className="text-slate-300 transition-colors hover:text-rose-600"
                aria-label="Remove directive"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </span>
          </li>
        ))}
        {directives.length === 0 && (
          <li className="rounded-xl border border-dashed border-slate-200 px-4 py-3 text-[0.8125rem] text-slate-400">
            Nothing yet.
          </li>
        )}
      </ul>

      <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 bg-slate-50/50 px-6 py-4">
        <select
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          className={selectCls}
        >
          {TOPICS.map((x) => (
            <option key={x} value={x}>
              {x}
            </option>
          ))}
        </select>
        <input
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="One instruction, stated plainly."
          className={cn(inputCls, "min-w-0 flex-1")}
        />
        <Btn
          disabled={!body.trim()}
          onClick={async () => {
            await onPost({ action: "directive_add", scope, topic, body });
            setBody("");
          }}
        >
          Add
        </Btn>
      </div>
    </Card>
  );
}
