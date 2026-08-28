import { sweeps, activitySummary } from "@/lib/activity";
import { Overview, type WeekBar } from "@/components/admin/Overview";

/**
 * Breakpoint HQ: the whole company on one screen.
 *
 * The sweep history is serialized server-side so the console bundle
 * never carries the 400 KB portfolio dataset the activity lib derives
 * it from.
 */
export default function AdminHome() {
  const weeks: WeekBar[] = [...sweeps]
    .slice(0, 12)
    .reverse()
    .map((s) => ({
      ranOn: s.ranOn,
      checked: s.targetsChecked,
      changes: s.changes,
    }));

  return (
    <Overview
      weeks={weeks}
      lastSweep={{
        ranOn: activitySummary.lastSweep,
        checked: sweeps[0]?.targetsChecked ?? 0,
        changes: sweeps[0]?.changes ?? 0,
        findings: sweeps[0]?.findings ?? 0,
      }}
    />
  );
}

export const dynamic = "force-dynamic";
