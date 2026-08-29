import { ExtractionQueue } from "@/components/admin/ExtractionQueue";
import { CapturePanel } from "@/components/admin/CapturePanel";

/** Human-in-the-loop review of extracted clause records, plus the
    capture checklist the extraction prompt is assembled from. */
export default function ExtractionPage() {
  return (
    <div className="space-y-6">
      <ExtractionQueue />
      <CapturePanel />
    </div>
  );
}

export const dynamic = "force-dynamic";
