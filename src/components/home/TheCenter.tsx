import { CenterPlan } from "@/components/showpiece/CenterPlan";
import { Section, Eyebrow, SectionTitle, Lede } from "@/components/ui/Section";

export function TheCenter() {
  return (
    <Section id="the-center" tone="sunk" grid>
      <div className="max-w-3xl">
        <Eyebrow>The showpiece</Eyebrow>
        <SectionTitle>
          Take a storefront dark.{" "}
          <span className="display-em text-petrol-700">
            Watch what it costs.
          </span>
        </SectionTitle>
        <Lede>
          One lease, in one center, evaluated against the three tests written
          into its co&#8209;tenancy clause. Close a store and the arithmetic
          moves in front of you — the same arithmetic Breakpoint runs nightly
          against every center you occupy.
        </Lede>
      </div>

      <div className="mt-12 lg:mt-16">
        <CenterPlan />
      </div>
    </Section>
  );
}
