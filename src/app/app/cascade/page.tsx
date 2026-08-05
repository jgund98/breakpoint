import { cascades } from "@/lib/cascade";
import { CascadeBoard } from "@/components/app/CascadeBoard";
import { PageHead } from "@/components/app/ui";

export default function CascadePage() {
  return (
    <div className="space-y-6">
      <PageHead
        eyebrow="Cascade"
        title="If an operator fails, what&#160;happens&#160;to&#160;us?"
        lede="Pick a retailer trading in your centers and we close every one of its stores at once. Wave one is the leases that name it. Wave two is the leases that do not, and trip anyway when occupancy follows it down."
      />
      <CascadeBoard cascades={cascades} />
      <p className="rounded-xl border border-line bg-surface-sunk p-5 text-[0.75rem] leading-relaxed text-muted">
        A model, not a forecast. It assumes every location of the selected
        operator closes simultaneously and that no landlord cures. Real
        outcomes depend on cure periods, replacement tenants and the
        preconditions in each lease. Illustrative sample data.
      </p>
    </div>
  );
}
