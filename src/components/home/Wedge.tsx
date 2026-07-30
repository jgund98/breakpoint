import { Section, Eyebrow, SectionTitle, Lede } from "@/components/ui/Section";
import { Confluence } from "@/components/showpiece/Confluence";
import { Reveal } from "@/components/ui/Reveal";
import { coexistsWith } from "@/lib/site";

/**
 * The category argument, drawn instead of argued: two streams — the
 * documents you hold and the reality of the center — converge at the
 * engine and come out as money math. Traditional lease systems only
 * ever held the left half.
 */
export function Wedge() {
  return (
    <Section tone="canvas" grid>
      <div className="max-w-3xl">
        <Eyebrow>Why this isn&#8217;t a feature</Eyebrow>
        <SectionTitle>
          Your lease holds half the problem.{" "}
          <span className="display-em text-petrol-700">
            The center holds the other half.
          </span>
        </SectionTitle>
        <Lede>
          Most lease suites track the clause — a field in a record, entered
          once. The trigger lives outside the document, in a center that
          changes every week. Breakpoint is built on joining the two. And if
          you hold one lease instead of a thousand, the &#8220;system&#8221;
          is a filing cabinet — the gap is the same.
        </Lede>
      </div>

      <Reveal className="mt-12 lg:mt-14" y={30}>
        <Confluence />
      </Reveal>

      {/* coexistence */}
      <div className="mt-12 flex w-fit max-w-full flex-col gap-4 rounded-xl border border-line bg-surface px-6 py-5 sm:flex-row sm:items-center sm:gap-6">
        <span className="label shrink-0 text-muted">Runs alongside</span>
        <ul className="flex flex-wrap gap-x-5 gap-y-2">
          {coexistsWith.map((name) => (
            <li key={name} className="text-[0.9375rem] font-medium text-ink-soft">
              {name}
            </li>
          ))}
        </ul>
      </div>
      <p className="mt-3 text-xs text-muted">
        Named as the systems Breakpoint is built to sit on top of. Not a claim
        of partnership, certification or endorsement by any of them.
      </p>
    </Section>
  );
}
