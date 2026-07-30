import Link from "next/link";
import { HeroScene } from "@/components/showpiece/HeroScene";
import { EventWire } from "@/components/showpiece/EventWire";

const proof = [
  ["24–48 hrs", "to your first evaluated center"],
  ["One lease", "or an entire national portfolio"],
  ["Recurring", "evaluation as verified conditions change"],
];

export function Hero() {
  return (
    <section className="relative flex min-h-svh flex-col overflow-hidden bg-petrol-950 text-cream">
      <HeroScene />

      <div className="relative flex flex-1 items-center pt-24 pb-14 sm:pt-28 lg:pt-32">
        <div className="mx-auto w-full max-w-[1400px] px-5 sm:px-8">
          <div className="max-w-[37rem]">
            <p className="label flex items-center gap-2.5 text-brass-400">
              <span className="anim-pulse-dot h-1.5 w-1.5 shrink-0 rounded-full bg-brass-500" />
              <span>
                Co&#8209;tenancy intelligence
                <span className="hidden sm:inline"> for retail tenants</span>
              </span>
            </p>

            <h1 className="mt-6 text-[clamp(2.5rem,6.6vw,4.5rem)] text-cream">
              <span className="block">Somewhere in</span>
              <span className="block">your portfolio,</span>
              <span className="display-em block text-brass-200">
                a clause just triggered.
              </span>
            </h1>

            <p className="lede no-orphan mt-7 max-w-xl text-cream-soft">
              A co&#8209;tenancy failure can be worth six figures a year on a
              single store — and it is still found by a district manager
              noticing a dark storefront. Breakpoint watches the centers you
              occupy and flags when a test may have failed, with the
              evidence attached.
            </p>

            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/demo"
                className="inline-flex items-center justify-center rounded-full bg-brass-500 px-7 py-4 text-base font-semibold text-petrol-950 transition-all duration-300 hover:bg-brass-400 hover:shadow-[0_12px_36px_-12px_rgba(217,154,43,0.55)]"
              >
                Book a walkthrough
              </Link>
              <Link
                href="#the-center"
                className="inline-flex items-center justify-center rounded-full border border-white/25 bg-white/5 px-7 py-4 text-base font-medium text-cream backdrop-blur-sm transition-colors hover:border-white/45 hover:bg-white/10"
              >
                Watch a clause break
              </Link>
            </div>

            <dl className="mt-11 grid grid-cols-3 gap-4 border-t border-white/15 pt-7 sm:gap-6">
              {proof.map(([value, label]) => (
                <div key={label}>
                  <dt className="font-display text-[clamp(1.05rem,2.2vw,1.5rem)] leading-none text-cream">
                    {value}
                  </dt>
                  <dd className="no-orphan mt-2 text-[0.8125rem] leading-snug text-cream-faint">
                    {label}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </div>

      <div className="relative">
        <EventWire />
      </div>
    </section>
  );
}
