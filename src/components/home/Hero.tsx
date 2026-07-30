import Link from "next/link";
import { HeroScene } from "@/components/showpiece/HeroScene";
import { EventWire } from "@/components/showpiece/EventWire";
import { AnimatedGlyph } from "@/components/brand/AnimatedGlyph";
import { Button } from "@/components/ui/Button";

const proof = [
  ["24–48 hrs", "to your first evaluated center"],
  ["One lease", "or an entire national portfolio"],
  ["Recurring", "evaluation as verified conditions change"],
];

/**
 * Desktop: copy column beside the living panel. Phones interleave —
 * headline, then the panel, then the pitch — so the first screen is
 * never just text.
 */
export function Hero() {
  return (
    <section className="relative overflow-hidden bg-canvas">
      {/* color washes so the white ground never reads flat */}
      <div
        aria-hidden
        className="pointer-events-none absolute -left-[22%] -top-[28%] h-[70vh] w-[70vw] rounded-full bg-petrol-100/60 blur-[100px]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -right-[18%] top-[30%] h-[55vh] w-[50vw] rounded-full bg-brass-200/40 blur-[110px]"
      />

      <div className="relative mx-auto max-w-[1400px] px-5 pt-24 pb-14 sm:px-8 sm:pt-32 lg:pt-36 lg:pb-20">
        <div className="grid items-center gap-y-7 lg:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)] lg:grid-rows-[auto_auto] lg:gap-x-14 lg:gap-y-0 xl:gap-x-20">
          {/* ---- headline ---- */}
          <div className="max-w-[36rem] lg:col-start-1 lg:row-start-1 lg:self-end">
            <p className="label flex items-center gap-2 text-petrol-600">
              <AnimatedGlyph className="h-5 w-5 text-petrol-700" />
              <span>
                Co&#8209;tenancy intelligence
                <span className="hidden sm:inline"> for retail tenants</span>
              </span>
            </p>

            {/* One quiet line, one loud one — never a four-line stack. */}
            <h1 className="mt-5 sm:mt-6">
              <span className="block text-[clamp(1.3rem,2.6vw,1.75rem)] font-medium tracking-[-0.02em] text-ink-soft">
                Somewhere in your portfolio,
              </span>
              <span className="display-em balance mt-2 block text-[clamp(2.7rem,6.4vw,4.75rem)] text-petrol-700">
                a clause just triggered.
              </span>
            </h1>
          </div>

          {/* ---- the living panel — second on phones, beside on lg ---- */}
          <div className="lg:col-start-2 lg:row-start-1 lg:row-span-2 lg:self-center">
            <HeroScene />
          </div>

          {/* ---- pitch ---- */}
          <div className="max-w-[36rem] lg:col-start-1 lg:row-start-2 lg:self-start">
            <p className="lede no-orphan max-w-xl text-ink-soft lg:mt-7">
              A co&#8209;tenancy failure can be worth six figures a year on a
              single store — and it is still found by a district manager
              noticing a dark storefront.
              <span className="hidden sm:inline">
                {" "}
                Breakpoint watches the centers you occupy and flags when a
                test may have failed, with the evidence&nbsp;attached.
              </span>
            </p>

            <div className="mt-7 flex flex-col gap-3 sm:flex-row lg:mt-9">
              <Button href="/demo">Start your evaluation</Button>
              <Link
                href="#the-center"
                className="inline-flex items-center justify-center rounded-full border border-line bg-surface px-7 py-4 text-base font-medium text-ink transition-colors hover:border-petrol-300 hover:bg-petrol-50"
              >
                Watch a clause break
              </Link>
            </div>

            <dl className="mt-8 grid grid-cols-3 gap-4 border-t border-line pt-6 sm:gap-6 lg:mt-10 lg:pt-7">
              {proof.map(([value, label]) => (
                <div key={label}>
                  <dt className="font-display text-[clamp(1.05rem,2.2vw,1.5rem)] leading-none text-petrol-800">
                    {value}
                  </dt>
                  <dd className="no-orphan mt-2 text-[0.8125rem] leading-snug text-muted">
                    {label}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </div>

      <EventWire />
    </section>
  );
}
