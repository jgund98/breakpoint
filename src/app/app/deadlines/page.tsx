import { PageHead, Stat } from "@/components/app/ui";
import { DeadlineList } from "@/components/app/DeadlineList";
import { portfolioDeadlines } from "@/lib/deadlines";

/**
 * The calendar: every date on the portfolio that demands something of
 * a person, exportable to the calendar they actually live in.
 */
export default function DeadlinesPage() {
  const items = portfolioDeadlines();
  const cures = items.filter((d) => d.kind === "cure").length;
  const elections = items.filter((d) => d.kind === "election").length;
  const soonest = items[0];

  return (
    <div className="space-y-5">
      <PageHead
        eyebrow="Act"
        title="Deadlines"
        lede="Cure windows, election periods, and the report cadence. Each one exports to your calendar."
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label="On the clock" value={items.length} tone="petrol" />
        <Stat
          label="Cure windows running"
          value={cures}
          tone={cures > 0 ? "watch" : "open"}
        />
        <Stat
          label="Elections open"
          value={elections}
          sub={
            soonest
              ? `Soonest: ${new Date(soonest.dateISO + "T00:00:00Z").toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" })}`
              : undefined
          }
          tone={elections > 0 ? "clay" : "open"}
        />
      </div>

      <DeadlineList items={items} />
    </div>
  );
}

export const metadata = { title: "Deadlines" };
