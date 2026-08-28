"use client";

import Link from "next/link";
import { CalendarPlus, CalendarClock, Vote, Radar } from "lucide-react";
import { cn } from "@/lib/cn";
import { Panel, Pill, type Tone } from "./ui";
import type { Deadline } from "@/lib/deadlines";

/* Pure and local, deliberately: importing the ICS builder from
   lib/deadlines would pull the whole portfolio dataset into the
   client bundle. DTSTAMP uses each event's own date so exports stay
   deterministic. */
function deadlinesToICS(items: Deadline[]): string {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Breakpoint//Deadlines//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
  ];
  for (const d of items) {
    const day = d.dateISO.replace(/-/g, "");
    lines.push(
      "BEGIN:VEVENT",
      `UID:${d.uid}@breakpoint`,
      `DTSTAMP:${day}T000000Z`,
      `DTSTART;VALUE=DATE:${day}`,
      `SUMMARY:${d.title.replace(/[,;]/g, " ")}`,
      `DESCRIPTION:${d.detail.replace(/[,;]/g, " ")}`,
      "END:VEVENT",
    );
  }
  lines.push("END:VCALENDAR");
  return lines.join("\r\n");
}

/**
 * The agenda, built to leave. Lease admins live in Outlook — every
 * deadline exports as a calendar event, singly or all at once, so
 * Breakpoint's clock becomes their clock.
 */

const KIND_META: Record<
  Deadline["kind"],
  { label: string; tone: Tone; icon: React.ReactNode }
> = {
  cure: {
    label: "Cure window",
    tone: "watch",
    icon: <CalendarClock className="h-4 w-4" />,
  },
  election: { label: "Election", tone: "clay", icon: <Vote className="h-4 w-4" /> },
  report: { label: "Report", tone: "petrol", icon: <Radar className="h-4 w-4" /> },
};

function download(name: string, ics: string) {
  const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

export function DeadlineList({ items }: { items: Deadline[] }) {
  const byMonth = new Map<string, Deadline[]>();
  for (const d of items) {
    const key = new Date(d.dateISO + "T00:00:00Z").toLocaleDateString("en-US", {
      month: "long",
      year: "numeric",
      timeZone: "UTC",
    });
    byMonth.set(key, [...(byMonth.get(key) ?? []), d]);
  }

  return (
    <Panel flush>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-6 py-4">
        <p className="text-[0.9375rem] font-semibold text-slate-900">
          Upcoming deadlines
        </p>
        <button
          type="button"
          onClick={() => download("breakpoint-deadlines.ics", deadlinesToICS(items))}
          className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 text-[0.8125rem] font-semibold text-slate-700 shadow-sm transition-all hover:border-slate-300 active:scale-95"
        >
          <CalendarPlus className="h-4 w-4" /> Export all (.ics)
        </button>
      </div>

      {items.length === 0 ? (
        <p className="px-6 py-10 text-center text-[0.8125rem] text-slate-400">
          Nothing on the clock. Deadlines appear here the moment a cure window
          or election period starts running.
        </p>
      ) : (
        [...byMonth.entries()].map(([month, list]) => (
          <div key={month}>
            <p className="border-b border-slate-100 bg-slate-50/60 px-6 py-2 text-[0.6875rem] font-semibold uppercase tracking-wider text-slate-400">
              {month}
            </p>
            <ul className="divide-y divide-slate-100">
              {list.map((d) => {
                const meta = KIND_META[d.kind];
                return (
                  <li
                    key={d.uid}
                    className="flex flex-wrap items-center justify-between gap-3 px-6 py-4"
                  >
                    <span className="flex min-w-0 flex-1 items-start gap-3">
                      <span
                        className={cn(
                          "mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl",
                          d.kind === "cure"
                            ? "bg-amber-50 text-amber-600"
                            : d.kind === "election"
                              ? "bg-rose-50 text-rose-600"
                              : "bg-indigo-50 text-indigo-600",
                        )}
                      >
                        {meta.icon}
                      </span>
                      <span className="min-w-0">
                        <span className="flex flex-wrap items-center gap-2">
                          <span className="text-[0.8125rem] font-semibold text-slate-900">
                            {d.locationId ? (
                              <Link
                                href={`/app/locations/${d.locationId}`}
                                className="hover:text-indigo-700"
                              >
                                {d.title}
                              </Link>
                            ) : (
                              d.title
                            )}
                          </span>
                          <Pill tone={meta.tone} dot>
                            {meta.label}
                          </Pill>
                        </span>
                        <span className="mt-0.5 block max-w-xl text-[0.75rem] leading-snug text-slate-500">
                          {d.detail}
                        </span>
                      </span>
                    </span>
                    <span className="flex shrink-0 items-center gap-3">
                      <span className="text-right">
                        <span className="tnum block text-[0.875rem] font-bold text-slate-900">
                          {new Date(d.dateISO + "T00:00:00Z").toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            timeZone: "UTC",
                          })}
                        </span>
                        <span
                          className={cn(
                            "tnum block text-[0.6875rem] font-medium",
                            d.daysAway <= 30 ? "text-rose-600" : "text-slate-400",
                          )}
                        >
                          in {d.daysAway} day{d.daysAway === 1 ? "" : "s"}
                        </span>
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          download(`breakpoint-${d.uid}.ics`, deadlinesToICS([d]))
                        }
                        title="Add to calendar"
                        aria-label="Add to calendar"
                        className="grid h-9 w-9 place-items-center rounded-xl border border-slate-200 bg-white text-slate-500 shadow-sm transition-all hover:border-slate-300 hover:text-indigo-600 active:scale-95"
                      >
                        <CalendarPlus className="h-4 w-4" />
                      </button>
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        ))
      )}
    </Panel>
  );
}
