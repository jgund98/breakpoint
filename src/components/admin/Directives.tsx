"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";
import { cn } from "@/lib/cn";
import { ActionButton } from "@/components/app/ui";

/**
 * Agent programming, one scope at a time.
 *
 * The system-wide canon is edited at HQ and reaches every client; a
 * client's own rules are edited on that client's board and reach only
 * their runs. The same editor renders both, but a board only ever
 * writes the scope it owns — system logic is not editable from inside
 * a client profile.
 */

export type Directive = {
  id: string;
  scope: string;
  topic: string;
  body: string;
  active: boolean;
};

const TOPICS = ["general", "extraction", "scanning", "matching", "notices"];

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
  onPost: (payload: Record<string, unknown>) => Promise<boolean>;
}) {
  const [topic, setTopic] = useState("general");
  const [body, setBody] = useState("");

  return (
    <section className="overflow-hidden rounded-xl border border-line">
      <div className="border-b border-line px-4 py-3">
        <h2 className="text-[0.875rem] font-semibold text-ink">{title}</h2>
        <p className="mt-0.5 text-[0.75rem] text-muted">{blurb}</p>
      </div>

      <ul className="space-y-1.5 px-4 py-3">
        {directives.map((d) => (
          <li
            key={d.id}
            className={cn(
              "flex items-start justify-between gap-2 rounded-md border border-line px-2.5 py-2",
              !d.active && "opacity-50",
            )}
          >
            <p className="min-w-0 text-[0.75rem] leading-snug text-ink-soft">
              <span className="mr-1.5 rounded bg-surface-sunk px-1 py-0.5 text-[0.625rem] font-semibold text-muted">
                {d.topic}
              </span>
              {d.body}
            </p>
            <span className="flex shrink-0 gap-1.5">
              <button
                type="button"
                onClick={() => void onPost({ action: "directive_toggle", id: d.id })}
                className="text-[0.6875rem] font-medium text-muted hover:text-ink"
              >
                {d.active ? "Disable" : "Enable"}
              </button>
              <button
                type="button"
                onClick={() => void onPost({ action: "directive_remove", id: d.id })}
                className="text-faint hover:text-clay-700"
                aria-label="Remove directive"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </span>
          </li>
        ))}
        {directives.length === 0 && (
          <li className="rounded-md border border-dashed border-line px-2.5 py-2 text-[0.75rem] text-muted">
            Nothing yet.
          </li>
        )}
      </ul>

      <div className="flex flex-wrap items-center gap-2 border-t border-line px-4 py-3">
        <select
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          className="rounded-md border border-line bg-surface px-2 py-1.5 text-[0.75rem] text-ink focus:border-petrol-500 focus:outline-none"
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
          className="min-w-0 flex-1 rounded-md border border-line bg-surface px-2.5 py-1.5 text-[0.75rem] text-ink placeholder:text-faint focus:border-petrol-500 focus:outline-none"
        />
        <ActionButton
          variant="secondary"
          disabled={!body.trim()}
          onClick={async () => {
            const ok = await onPost({ action: "directive_add", scope, topic, body });
            if (ok) setBody("");
          }}
        >
          Add
        </ActionButton>
      </div>
    </section>
  );
}
