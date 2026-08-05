import type { Metadata } from "next";
import { Theo } from "@/components/app/Theo";
import { PageHead } from "@/components/app/ui";
import { theo } from "@/lib/theo";

export const metadata: Metadata = { title: theo.name };

export default function TheoPage() {
  return (
    <div className="space-y-5">
      <PageHead
        eyebrow="Assistant"
        title={theo.name}
        lede="Ask about your leases, your centers, or anything the sweeps have seen."
      />
      <Theo />
    </div>
  );
}
