import { PortfolioOverlay } from "@/components/showpiece/PortfolioOverlay";
import { EventWire } from "@/components/showpiece/EventWire";
import { Button } from "@/components/ui/Button";

const proof = [
  ["24–48 hrs", "to your first evaluated center"],
  ["Every clause", "converted to testable rules"],
  ["Recurring", "evaluation as conditions change"],
];

export function Hero() {
  return (
    <section className="relative overflow-hidden bg-canvas">
      {/* colour washes — green behind the copy, a brass glow behind the
          portfolio so the white ground never reads flat */}
      <div
        aria-hidden
        className="pointer-events-none absolute -left-[22%] -top-[28%] h-[70vh] w-[70vw] rounded-full bg-petrol-100/60 blur-[100px]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -right-[18%] top-[30%] h-[55vh] w-[50vw] rounded-full bg-brass-200/40 blur-[110px]"
      />
      <div
        aria-hidden
        className="plan-grid mask-fade absolute inset-0 opacity-50"
      />

      <div className="relative mx-auto max-w-[1400px] px-5 pt-28 pb-14 sm:px-8 sm:pt-32 lg:pt-36 lg:pb-20">
        <div className="grid items-center gap-10 lg:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)] lg:gap-14 xl:gap-20">
          {/* ---- copy ---- */}
          <div className="max-w-[36rem]">
            <p className="label flex items-center gap-2.5 text-petrol-600">
              <span className="anim-pulse-dot h-1.5 w-1.5 rounded-full bg-brass-500" />
              Co&#8209;tenancy intelligence for multi&#8209;location retailers
            </p>

            <h1 className="mt-6 text-[clamp(2.6rem,7.2vw,4.75rem)]">
              <span className="block">Somewhere in</span>
              <span className="block">your portfolio,</span>
              <span className="display-em block text-petrol-700">
                a clause just triggered.
              </span>
            </h1>

            <p className="lede no-orphan mt-7 max-w-xl text-ink-soft">
              A co&#8209;tenancy failure can be worth six figures a year on a
              single store — and it is still found by a district manager
              noticing a dark storefront. Breakpoint watches the centers you
              occupy and flags the day a test may have failed, with the
              evidence attached.
            </p>

            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <Button href="/demo">Book a walkthrough</Button>
              <Button href="#the-center" variant="secondary">
                Watch a clause break
              </Button>
            </div>

            <dl className="mt-10 grid grid-cols-3 gap-4 border-t border-line pt-7 sm:gap-6">
              {proof.map(([value, label]) => (
                <div key={label}>
                  <dt className="font-display text-[clamp(1.1rem,2.2vw,1.5rem)] leading-none text-petrol-800">
                    {value}
                  </dt>
                  <dd className="no-orphan mt-2 text-[0.8125rem] leading-snug text-muted">
                    {label}
                  </dd>
                </div>
              ))}
            </dl>
          </div>

          {/* ---- the annotated portfolio ---- */}
          <PortfolioOverlay />
        </div>
      </div>

      <EventWire />
    </section>
  );
}
