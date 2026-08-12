"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Link2Off } from "lucide-react";
import type { PendingMatch } from "@/lib/matching";
import { cn } from "@/lib/cn";
import { EmptyState, Panel, PanelHead, Pill } from "./ui";

/**
 * TENANT NAMES AWAITING CONFIRMATION
 *
 * The lease names a tenant in its own words and the center's directory
 * lists it in different ones. Where the two match once case and
 * punctuation are folded, the system resolves it and says nothing.
 * Where they do not, it asks, because the alternatives are genuinely
 * ambiguous and choosing wrong is expensive in both directions: accept
 * "Zara Beauty Bar" for "Zara" and a co-tenancy requirement reads as
 * satisfied when it is not.
 *
 * A confirmation is a portfolio-wide decision, not a per-location one,
 * so this queue shrinks as the alias book fills rather than growing
 * with the number of stores.
 */

type Props = { items: PendingMatch[] };

export function MatchQueue({ items }: Props) {
  const [resolved, setResolved] = useState<Record<string, string>>({});
  const key = (m: PendingMatch) => `${m.centerId}:${m.leaseName}`;
  const open = items.filter((m) => !resolved[key(m)]);

  return (
    <Panel flush>
      <div className="flex flex-wrap items-center justify-between gap-3 px-5 pt-5">
        <PanelHead
          title="Tenant names to confirm"
          hint="A tenant your lease names, listed differently in the center's directory. Confirming applies across the portfolio."
        />
        <Pill tone={open.length === 0 ? "open" : "watch"} dot>
          {open.length === 0 ? "All confirmed" : `${open.length} open`}
        </Pill>
      </div>

      {open.length === 0 ? (
        <EmptyState
          title="Every named tenant is matched"
          body="Each tenant named in a co-tenancy clause has been tied to a store in that center's directory."
        />
      ) : (
        <ul className="mt-4 divide-y divide-line border-t border-line">
          <AnimatePresence initial={false}>
            {open.map((m) => (
              <motion.li
                key={key(m)}
                layout
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.25 }}
                className="px-5 py-4 sm:px-6"
              >
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="text-[0.875rem] font-medium text-ink">
                    <span className="text-muted">Lease says</span>{" "}
                    &#8220;{m.leaseName}&#8221;
                  </p>
                  <p className="text-[0.75rem] text-faint">
                    {m.centerName} · {m.cite}
                  </p>
                </div>

                {m.candidates.length === 0 ? (
                  <p className="mt-2 flex items-center gap-2 text-[0.8125rem] text-muted">
                    <Link2Off className="h-3.5 w-3.5 shrink-0" />
                    Nothing in this center&#8217;s directory resembles the name.
                    Confirm by field visit or request the roster from ownership.
                  </p>
                ) : (
                  <>
                    <p className="mt-1 text-[0.75rem] text-muted">
                      {m.candidates.length === 1
                        ? "One possible store in the directory."
                        : `${m.candidates.length} possible stores in the directory.`}
                    </p>
                    <ul className="mt-2.5 flex flex-wrap gap-2">
                      {m.candidates.map((c) => (
                        <li key={c.id}>
                          <button
                            type="button"
                            onClick={() =>
                              setResolved((p) => ({ ...p, [key(m)]: c.id }))
                            }
                            className={cn(
                              /* Two lines of text need more than 12px of
                                 side padding, or the reason line runs
                                 into the rounded corner. */
                              "rounded-xl border border-line bg-surface px-4 py-3 text-left",
                              "transition-colors duration-200 hover:border-petrol-300 hover:bg-surface-sunk",
                            )}
                          >
                            <span className="block text-[0.8125rem] font-medium text-ink">
                              {c.name}
                            </span>
                            <span className="mt-0.5 block text-[0.6875rem] leading-snug text-muted">
                              {c.reason}
                            </span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  </>
                )}
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>
      )}

      {Object.keys(resolved).length > 0 && (
        <div className="border-t border-line px-5 py-3 sm:px-6">
          <p className="text-[0.75rem] text-muted">
            {Object.keys(resolved).length} confirmed this session. Saving is
            wired to the account once the database is connected.
          </p>
        </div>
      )}
    </Panel>
  );
}
