import Link from "next/link";
import { LogoLockup } from "@/components/brand/Logo";
import { AnimatedGlyph } from "@/components/brand/AnimatedGlyph";
import { EpicCredit } from "@/components/brand/EpicCredit";
import { site, footerNav } from "@/lib/site";
import { DarkDecor } from "@/components/ui/Decor";
import { LazyVideo } from "@/components/ui/LazyVideo";

export function Footer() {
  return (
    <footer className="relative overflow-hidden bg-petrol-900 text-cream">
      <DarkDecor />

      {/* closing CTA — real footage of the asset class, graded into the
          brand, with the ask on top. The last word is cinematic. */}
      <div className="relative overflow-hidden border-b border-white/10">
        <LazyVideo
          className="absolute inset-0"
          src="/video/cta-aerial.mp4"
          poster="/video/cta-aerial-poster.jpg"
        />
        <div className="absolute inset-0 bg-petrol-950/72" />
        <div className="absolute inset-0 bg-linear-to-r from-petrol-950/85 via-petrol-950/40 to-petrol-950/20" />

        {/* the beacon — the brand's own signal, raised over the asset
            class it watches. The square keeps the product's heartbeat. */}
        <div className="pointer-events-none absolute bottom-12 right-8 hidden lg:block xl:right-16">
          <AnimatedGlyph
            className="h-44 w-44 xl:h-52 xl:w-52 drop-shadow-[0_12px_36px_rgba(16,13,46,0.55)]"
            bar="rgba(246,244,238,0.92)"
            delay={0.3}
          />
        </div>

        <div className="relative mx-auto max-w-[1400px] px-5 py-20 sm:px-8 sm:py-24 lg:py-32">
          <div className="max-w-2xl">
            <p className="label text-brass-400">Start with one center</p>
            <h2 className="mt-5 text-[clamp(2rem,5vw,3.5rem)] text-cream">
              Send us your lease.{" "}
              <span className="display-em balance block text-brass-200">
                We&#8217;ll tell you what it may be&nbsp;worth.
              </span>
            </h2>
            <p className="lede no-orphan mt-6 max-w-xl text-cream-soft">
              Pick the center you have the worst feeling about. We&#8217;ll
              tell you in 48 hours whether a test appears to have&nbsp;failed.
            </p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:items-center">
              <Link
                href="/demo"
                className="inline-flex items-center justify-center gap-2 rounded-full bg-brass-500 px-9 py-5 text-lg font-semibold whitespace-nowrap text-petrol-950 shadow-[0_16px_44px_-12px_rgba(217,154,43,0.65)] transition-all hover:-translate-y-0.5 hover:bg-brass-400 hover:shadow-[0_20px_52px_-12px_rgba(217,154,43,0.8)]"
              >
                Start your free evaluation
                <span>→</span>
              </Link>
              <Link
                href="/co-tenancy"
                className="inline-flex items-center justify-center rounded-full border border-white/25 bg-white/10 px-7 py-4 text-base font-medium text-cream transition-colors hover:border-white/45 hover:bg-white/15"
              >
                Read the field guide
              </Link>
            </div>
            <p className="mt-4 text-sm text-cream-faint">
              Free · first answer in 48 hours · no commitment
            </p>
          </div>
        </div>
      </div>

      {/* sitemap */}
      <div className="relative mx-auto max-w-[1400px] px-5 sm:px-8">
        <div className="grid gap-10 py-14 sm:grid-cols-2 lg:grid-cols-[1.4fr_repeat(4,1fr)] lg:gap-8">
          <div className="lg:pr-8">
            <LogoLockup className="text-cream" />
            <p className="no-orphan mt-5 max-w-xs text-sm leading-relaxed text-cream-faint">
              Breakpoint monitors the one clause that moves the most money in
              retail leasing, and almost nobody is watching.
            </p>
            <a
              href={`mailto:${site.email}`}
              className="mt-5 inline-block text-sm text-cream-soft underline decoration-white/25 underline-offset-4 transition-colors hover:text-brass-400"
            >
              {site.email}
            </a>
          </div>

          {footerNav.map((col) => (
            <div key={col.heading}>
              <h3 className="label text-brass-400">{col.heading}</h3>
              <ul className="mt-4 space-y-2.5">
                {col.links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="text-sm text-cream-soft transition-colors hover:text-cream"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="flex flex-col gap-5 border-t border-white/10 py-8 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs leading-relaxed text-cream-faint">
            © {new Date().getFullYear()} {site.legalName} Figures shown across this
            site are illustrative sample data, not client results.
            <br className="hidden sm:block" /> Nothing here is legal advice;
            co&#8209;tenancy remedies depend on your executed lease.
          </p>
          <EpicCredit />
        </div>
      </div>
    </footer>
  );
}
