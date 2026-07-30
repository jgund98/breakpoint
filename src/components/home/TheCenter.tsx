import { CenterPlan } from "@/components/showpiece/CenterPlan";
import { Section, Eyebrow, SectionTitle, Lede } from "@/components/ui/Section";

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
          One shopping center, one lease — the outlined unit is your store.
          Pick a scenario or click any other storefront to close it
          (&#8220;going dark,&#8221; in lease terms). Breakpoint re&#8209;runs
          your co&#8209;tenancy tests and shows the potential impact on your
          rent.
        </Lede>
      </div>

      <div className="mt-10 lg:mt-12">
        <CenterPlan />
      </div>
    </Section>
  );
}
