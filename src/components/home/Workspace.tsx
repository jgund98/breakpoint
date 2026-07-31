import { WorkspaceMock } from "@/components/showpiece/WorkspaceMock";
import { Section, Eyebrow, SectionTitle, Lede } from "@/components/ui/Section";
import { Reveal } from "@/components/ui/Reveal";
import { Button } from "@/components/ui/Button";

export function Workspace() {
  return (
    <Section tone="sunk" grid>
      <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-2xl">
          <Eyebrow>The workspace</Eyebrow>
          <SectionTitle>
            Upload through the portal.{" "}
            <span className="display-em text-petrol-700">
              Watch it come back as money math.
            </span>
          </SectionTitle>
          <Lede>
            Upload a lease. The answer comes back in your workspace — triggers
            flagged, money estimated, package&nbsp;ready.
          </Lede>
        </div>
        <Button href="/demo" className="shrink-0 self-start lg:self-auto">
          Start your evaluation
        </Button>
      </div>

      <Reveal className="mt-12" y={34}>
        <WorkspaceMock />
      </Reveal>
      <p className="mt-4 text-xs text-muted">
        Product rendering with illustrative sample data — not client results.
      </p>
    </Section>
  );
}
