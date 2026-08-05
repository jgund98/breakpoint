import { cascades } from "@/lib/cascade";
import { matrix } from "@/lib/matrix";
import { ExposureView } from "@/components/app/ExposureView";
import { PageHead } from "@/components/app/ui";

export default function ExposurePage() {
  return (
    <div className="space-y-6">
      <PageHead
        eyebrow="Analyze"
        title="Anchor exposure"
        lede="Which retailers your co-tenancy tests depend on, and what fails if one goes dark."
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
