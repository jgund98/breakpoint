"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";
import { cn } from "@/lib/cn";
import { ActionButton } from "@/components/app/ui";
import { Section } from "@/components/admin/ui";

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
    <Section title={title} blurb={blurb} flush>
      <ul className="space-y-1.5 px-5 py-4">
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

      <div className="flex flex-wrap items-center gap-2 border-t border-line px-5 py-3">
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
    </Section>
  );
}
