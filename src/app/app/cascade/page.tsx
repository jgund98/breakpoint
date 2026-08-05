import { cascades } from "@/lib/cascade";
import { matrix } from "@/lib/matrix";
import { ExposureView } from "@/components/app/ExposureView";
import { PageHead } from "@/components/app/ui";

export default function ExposurePage() {
  return (
    <div className="space-y-6">
      <PageHead
        eyebrow="Anchor exposure"
        title="How much of the portfolio rides on one retailer"
        lede="Operators down the side, your centers across the top. A filled cell means that retailer is named in your co-tenancy test there. Select any row and we close every one of its stores at once: wave one is the leases that name it, wave two is the leases that trip anyway when occupancy follows it down."
      />
      <ExposureView matrix={matrix} cascades={cascades} />
      <p className="rounded-xl border border-line bg-surface-sunk p-5 text-[0.75rem] leading-relaxed text-muted">
        A model, not a forecast. It assumes every location of the selected
        operator closes at once and that no landlord cures. Real outcomes depend
        on cure periods, replacement tenants and the preconditions in each
        lease. Illustrative sample data.
      </p>
    </div>
  );
}
