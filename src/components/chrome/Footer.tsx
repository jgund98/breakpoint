import Link from "next/link";
import Image from "next/image";
import { LogoLockup } from "@/components/brand/Logo";
import { EpicCredit } from "@/components/brand/EpicCredit";
import { site, footerNav } from "@/lib/site";

export function Footer() {
  return (
    <footer className="relative overflow-hidden bg-petrol-900 text-cream">
      <div className="plan-grid-dark mask-fade absolute inset-0 opacity-60" />

      {/* closing CTA — photographic, warm, and the last word */}
      <div className="relative border-b border-white/10">
        <div className="mx-auto grid max-w-[1400px] gap-10 px-5 py-16 sm:px-8 sm:py-20 lg:grid-cols-[1.1fr_0.9fr] lg:items-center lg:gap-16 lg:py-24">
          <div>
            <p className="label text-brass-400">Start with one center</p>
            <h2 className="mt-5 text-[clamp(2rem,5vw,3.5rem)] text-cream">
              Send us one lease.{" "}
              <span className="display-em block text-brass-200">
                We&#8217;ll tell you what it may be owed.
              </span>
            </h2>
            <p className="lede no-orphan mt-6 max-w-xl text-cream-soft">
              Pick the center you have the worst feeling about. We&#8217;ll
              abstract the co&#8209;tenancy language, assemble the center&#8217;s
              occupancy history, and show you whether a test appears to have
              failed — inside 48 hours.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/demo"
                className="inline-flex items-center justify-center rounded-full bg-brass-500 px-7 py-4 text-base font-medium text-petrol-950 transition-colors hover:bg-brass-400"
              >
                Book a walkthrough
              </Link>
              <Link
                href="/co-tenancy"
                className="inline-flex items-center justify-center rounded-full border border-white/20 px-7 py-4 text-base font-medium text-cream transition-colors hover:border-white/40 hover:bg-white/5"
              >
                Read the field guide
              </Link>
            </div>
          </div>

          <div className="relative aspect-4/3 overflow-hidden rounded-xl lg:aspect-3/2">
            <Image
              src="/photos/shoppers-browsing.jpg"
              alt="Shoppers browsing in a bright retail store"
              fill
              sizes="(max-width: 1024px) 100vw, 40vw"
              className="object-cover"
            />
            <div className="absolute inset-0 bg-petrol-950/20 mix-blend-multiply" />
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
            © {new Date().getFullYear()} {site.name}. Figures shown across this
            site are illustrative sample data, not client results.
            <br className="hidden sm:block" /> Nothing here is legal advice —
            co&#8209;tenancy remedies depend on your executed lease.
          </p>
          <EpicCredit />
        </div>
      </div>
    </footer>
  );
}
