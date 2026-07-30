import Link from "next/link";

/**
 * The owner-side product, held to a single restrained band. It exists
 * on the roadmap and gets a page — it does not get a homepage story.
 * Breakpoint is a tenant-side platform; this is a footnote with a door.
 */
export function OwnerStrip() {
  return (
    <section className="border-t border-line bg-canvas">
      <div className="mx-auto flex max-w-[1400px] flex-col gap-4 px-5 py-10 sm:flex-row sm:items-center sm:justify-between sm:px-8 sm:py-12">
        <div className="max-w-2xl">
          <p className="label text-muted">On the roadmap</p>
          <p className="no-orphan mt-2.5 text-[1.0625rem] leading-relaxed text-ink-soft">
            Own or operate centers? A separately packaged owner-side exposure
            product is under development — with its own workflows and strictly
            isolated data. Retailer information is never part of it.
          </p>
        </div>
        <Link
          href="/landlords"
          className="group inline-flex shrink-0 items-center gap-2 text-[0.9375rem] font-medium text-petrol-800"
        >
          Read about the owner solution
          <span className="transition-transform duration-300 group-hover:translate-x-1">
            →
          </span>
        </Link>
      </div>
    </section>
  );
}
