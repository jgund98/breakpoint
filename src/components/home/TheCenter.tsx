import dynamic from "next/dynamic";

// The demo is the heaviest client component on the site — it gets its
// own chunk and hydrates after first paint.
const CenterPlan = dynamic(() =>
  import("@/components/showpiece/CenterPlan").then((m) => m.CenterPlan),
);
import { Section, Eyebrow, SectionTitle, Lede } from "@/components/ui/Section";
import { Deferred } from "@/components/ui/Deferred";

export function TheCenter() {
  return (
    <Section id="the-center" tone="sunk" grid>
      <div className="max-w-3xl">
        <Eyebrow>Interactive demonstration</Eyebrow>
        <SectionTitle>
          Close a storefront.{" "}
          <span className="display-em text-petrol-700">
            Watch your lease react.
          </span>
        </SectionTitle>
        <Lede>
          One center, one lease — the outlined store is yours. Close a
          storefront and watch what it could mean for your&nbsp;rent.
        </Lede>
      </div>

      <Deferred minHeight={760} className="mt-10 lg:mt-12">
        <CenterPlan />
      </Deferred>
    </Section>
  );
}
