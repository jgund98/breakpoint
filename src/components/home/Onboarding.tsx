import Image from "next/image";
import { Button } from "@/components/ui/Button";
import { DarkDecor } from "@/components/ui/Decor";

const youBring = [
  {
    label: "The executed lease",
    detail:
      "Plus every amendment, side letter and estoppel. Co-tenancy language moves in amendments more often than it sits in the original.",
    required: true,
  },
  {
    label: "Your store list",
    detail: "Center, unit, GLA, commencement and expiration. A rent roll export is fine.",
    required: true,
  },
  {
    label: "Current minimum rent",
    detail: "Per store, monthly or annual — whichever your system emits.",
    required: true,
  },
  {
    label: "Monthly gross sales",
    detail:
      "The one input nobody else can source. Alternative rent is usually a percentage of it, so without sales we can flag the failure but not price it.",
    required: true,
  },
  {
    label: "An existing abstract",
    detail:
      "A Visual Lease, Tango, CoStar or MRI export if you have one. It accelerates us; it isn't required.",
    required: false,
  },
  {
    label: "Who to wake up",
    detail: "Lease accounting and the real estate lead for that region.",
    required: false,
  },
];

const weBring = [
  "Occupancy by GLA, assembled month by month",
  "Which named tenants are open, and the date each went dark",
  "Anchor closure filings and replacement activity",
  "The tests, re-run as conditions change, with dated evidence attached",
];

const timeline = [
  { at: "Hour 0", what: "Lease and store list received" },
  { at: "Hour 12", what: "Clause abstracted, every field cited and reviewed" },
  { at: "Hour 36", what: "Center conditions assembled and dated" },
  { at: "Hour 48", what: "First evaluation in your hands" },
];

export function Onboarding() {
  return (
    <section className="relative overflow-hidden bg-petrol-800 py-20 text-cream sm:py-24 lg:py-32">
      <DarkDecor />

      <div className="relative mx-auto max-w-[1400px] px-5 sm:px-8">
        <div className="grid gap-12 lg:grid-cols-[1fr_0.85fr] lg:items-start lg:gap-16">
          <div>
            <p className="label text-brass-400">Onboarding</p>
            <h2 className="balance mt-5 text-[clamp(1.9rem,4.4vw,3.25rem)] text-cream">
              You bring the lease.{" "}
              <span className="display-em block text-brass-200">
                We bring the center.
              </span>
            </h2>
            <p className="lede no-orphan mt-6 max-w-xl text-cream-soft">
              Enterprise lease implementations run three to nine months. This
              isn&#8217;t one. Send a single lease and we&#8217;ll have that
              center evaluated inside 48 hours — you supply what only you have,
              and we assemble the rest from closure signals, filings, permits,
              property research and field verification.
            </p>

            <div className="mt-10">
              <h3 className="label text-cream-faint">What we need from you</h3>
              <ul className="mt-5 space-y-4">
                {youBring.map((item) => (
                  <li key={item.label} className="flex gap-4">
                    <span
                      className={
                        item.required
                          ? "mt-1.5 h-2 w-2 shrink-0 rounded-full bg-brass-500"
                          : "mt-1.5 h-2 w-2 shrink-0 rounded-full border border-cream-faint"
                      }
                    />
                    <div className="min-w-0">
                      <p className="text-[0.9375rem] font-medium text-cream">
                        {item.label}
                        {!item.required && (
                          <span className="ml-2 text-xs font-normal text-cream-faint">
                            optional
                          </span>
                        )}
                      </p>
                      <p className="no-orphan balance mt-1 hidden text-sm leading-relaxed text-cream-soft sm:block">
                        {item.detail}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* right rail */}
          <div className="space-y-6">
            <div className="relative aspect-4/3 overflow-hidden rounded-xl">
              <Image
                src="/photos/meeting-boardroom.jpg"
                alt="A lease administration team working through documents in a meeting room"
                fill
                sizes="(max-width: 1024px) 100vw, 38vw"
                className="object-cover"
              />
              <div className="absolute inset-0 bg-petrol-950/15 mix-blend-multiply" />
            </div>

            <div className="rounded-xl border border-white/15 bg-white/5 p-6">
              <h3 className="label text-brass-400">What we bring</h3>
              <ul className="mt-4 space-y-3">
                {weBring.map((item) => (
                  <li key={item} className="flex gap-3 text-sm text-cream-soft">
                    <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-brass-400" />
                    <span className="no-orphan">{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-xl border border-white/15 p-6">
              <h3 className="label text-cream-faint">The first 48 hours</h3>
              <ol className="mt-4 space-y-3.5">
                {timeline.map((t, i) => (
                  <li key={t.at} className="flex gap-4">
                    <span className="tnum w-16 shrink-0 text-sm font-medium text-brass-400">
                      {t.at}
                    </span>
                    <span className="relative flex-1 pb-0.5 text-sm text-cream-soft">
                      {t.what}
                      {i < timeline.length - 1 && (
                        <span className="absolute -left-[13px] top-5 h-full w-px bg-white/12" />
                      )}
                    </span>
                  </li>
                ))}
              </ol>
            </div>

            <Button href="/demo" variant="onDark" className="w-full">
              Send us one lease
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
