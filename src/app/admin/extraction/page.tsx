import { ExtractionQueue } from "@/components/admin/ExtractionQueue";

/** Human-in-the-loop review of extracted clause records. */
export default function ExtractionPage() {
  return <ExtractionQueue />;
}

export const dynamic = "force-dynamic";
