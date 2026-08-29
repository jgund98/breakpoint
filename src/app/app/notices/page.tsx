import { requirePortfolio } from "@/lib/portfolio-gate";
import Link from "next/link";
import {
  SOURCE_META,
  STATE_META,
  formatCoTenancyRent,
  prettyDate,
  usd,
  verificationOf,
} from "@/lib/clause";
import { org, rows, TODAY } from "@/lib/portfolio";
import { buildNoticeLetter } from "@/lib/notice-letter";
import { nextStepsFor } from "@/lib/findings";
import {
  NoticeDesk,
  type NoticeCandidate,
} from "@/components/app/NoticeDesk";
import {
  Note,
  PageHead,
  Stat,
  Panel,
  Pill,
  type Tone,
} from "@/components/app/ui";

/**
 * THE NOTICE DESK
 *
 * The deliverable this product is paid for: a counsel-ready notice of
 * co-tenancy failure with its evidence exhibits, assembled from the
 * monitoring record, downloadable and timestamped. The letter shown is
 * the letter downloaded — same builder, no marketing copy between the
 * client and the document.
 */
export default async function NoticesPage() {
  await requirePortfolio();
  const candidates = rows
    .filter(
      (r) =>
        r.evaluation.state === "claimable" ||
        r.evaluation.state === "election_open",
    )
    .sort(
      (a, b) => (b.evaluation.monthlyDelta ?? 0) - (a.evaluation.monthlyDelta ?? 0),
    );

  const ready = candidates.filter(
    (r) => verificationOf(r.evidence).tier === "verified",
  );
  const held = candidates.filter(
    (r) => verificationOf(r.evidence).tier !== "verified",
  );

  const lead = ready[0];
  const letter = lead
    ? buildNoticeLetter(
        lead,
        org.name,
        `${prettyDate(TODAY)} (record date; the download carries its assembly time)`,
      )
    : null;
  const steps = lead ? nextStepsFor(lead) : [];

  const deskRows: NoticeCandidate[] = candidates.map((r) => ({
    id: r.id,
    center: r.center.name,
    city: `${r.center.city}, ${r.center.state}`,
    stateLabel: STATE_META[r.evaluation.state].label,
    stateTone: STATE_META[r.evaluation.state].tone as Tone,
    failing: r.evaluation.triggers
      .filter((t) => t.failing)
      .map((t) => t.label)
      .join(", "),
    monthly: formatCoTenancyRent(r.evaluation.monthlyDelta),
    verified: verificationOf(r.evidence).tier === "verified",
  }));

  return (
    <div className="space-y-5">
      <PageHead
        eyebrow="Act"
        title="Notice packages"
        lede="The counsel-ready letter with its evidence exhibits, assembled from the record. Your counsel reviews; your signatory serves."
      />

      <Note tone="petrol" title="What a package is">
        The letter below is drafted the way tenant&#8217;s counsel drafts it:
        service method per the notice provision, the failure recited with its
        three dates kept apart, the remedy elected in the lease&#8217;s own
        words, a landlord-verification demand wherever the lease grants one,
        and a full reservation of rights. Exhibits carry the clause extract,
        the dated evidence chain, and the computation. Bracketed fields are
        completed from the executed lease by counsel — never guessed.
      </Note>

      <div className="grid gap-3 sm:grid-cols-3">
        {[
          ["Ready for counsel", ready.length, "brass", "Verified by a primary source"],
          ["Held for verification", held.length, "muted", "A signal is not a notice"],
          [
            "Combined monthly value",
            usd(
              Math.round(
                ready.reduce((s, r) => s + (r.evaluation.monthlyDelta ?? 0), 0),
              ),
            ),
            "petrol",
            "Estimated, on reported sales",
          ],
        ].map(([l, v, c, sub]) => (
          <Stat
            key={l as string}
            label={l as string}
            value={v as React.ReactNode}
            tone={c as Tone}
            sub={sub as string}
          />
        ))}
      </div>

      {/* ---- the lead package: the letter and its exhibits ---- */}
      {lead && letter && (
        <Panel flush>
          <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-200 px-5 py-4 sm:px-6">
            <div>
              <div className="flex flex-wrap items-center gap-2.5">
                <h2 className="text-[1.0625rem] font-bold tracking-tight text-slate-900">
                  {lead.center.name}
                </h2>
                <Pill tone="petrol" dot>
                  Package preview
                </Pill>
              </div>
              <p className="mt-1 text-[0.8125rem] text-slate-500">
                {lead.id} · prepared for {org.name}. Awaiting counsel review.
              </p>
            </div>
            <a
              href={`/app/api/notice-package?location=${lead.id}`}
              className="inline-flex h-10 items-center rounded-xl bg-amber-400 px-4 text-[0.8125rem] font-semibold whitespace-nowrap text-slate-900 shadow-lg shadow-amber-500/30 transition-all duration-200 hover:bg-amber-300 active:scale-95"
            >
              Download the package
            </a>
          </div>

          <div className="grid gap-6 p-5 sm:p-6 lg:grid-cols-[1.5fr_1fr]">
            {/* ---- the letter, as counsel will receive it ---- */}
            <div className="rounded-xl border border-slate-200 bg-white p-5 font-serif text-[0.8125rem] leading-[1.75] text-slate-800 shadow-sm sm:p-6">
              <p className="text-[0.75rem] font-bold tracking-wide text-slate-900">
                {letter.serviceMethod}
              </p>
              <p className="mt-3">{letter.dateLine}</p>
              <p className="mt-3">
                {letter.addressee.map((a) => (
                  <span key={a} className="block">
                    {a}
                  </span>
                ))}
              </p>
              <div className="mt-3 space-y-1">
                {letter.reLines.map((l, i) => (
                  <p key={l} className="pl-10 -indent-10">
                    <span className="inline-block w-10 indent-0 font-semibold">
                      {i === 0 ? "Re:" : ""}
                    </span>
                    <span className={i === letter.reLines.length - 1 ? "font-semibold" : ""}>
                      {l}
                    </span>
                  </p>
                ))}
              </div>
              <p className="mt-4">{letter.salutation}</p>
              <p className="mt-3">{letter.opening}</p>
              {letter.paragraphs.map((p) => (
                <div key={p.heading} className="mt-4">
                  <p className="font-semibold text-slate-900">{p.heading}</p>
                  {p.body.map((b, i) => (
                    <p key={i} className="mt-2">
                      {b}
                    </p>
                  ))}
                </div>
              ))}
              {letter.closing.map((c) => (
                <p key={c} className="mt-4">
                  {c}
                </p>
              ))}
              <div className="mt-5">
                <p>Very truly yours,</p>
                {letter.signature.map((s) => (
                  <p key={s} className="mt-1">
                    {s}
                  </p>
                ))}
                <p className="mt-3 text-[0.75rem]">cc: {letter.cc.join("; ")}</p>
              </div>
              <p className="mt-5 rounded-lg border border-slate-300 bg-slate-50 p-3 font-sans text-[0.6875rem] leading-relaxed text-slate-600">
                {letter.disclaimer}
              </p>
            </div>

            {/* ---- the exhibits and the path ---- */}
            <div className="space-y-5">
              <Section n="A" title="The clause, as extracted">
                <ul className="space-y-2">
                  {lead.evaluation.triggers
                    .filter((t) => t.failing)
                    .map((t) => (
                      <li
                        key={t.id}
                        className="rounded-xl border border-slate-200 border-l-4 border-l-rose-600 bg-white p-3.5 shadow-sm"
                      >
                        <p className="text-[0.8125rem] font-semibold text-slate-900">
                          {t.label}{" "}
                          <span className="font-normal text-slate-400">{t.cite}</span>
                        </p>
                        <p className="mt-1 text-[0.8125rem] text-slate-700">
                          Required: {t.requirement}
                        </p>
                        <p className="text-[0.8125rem] font-bold text-rose-600">
                          Observed: {t.observed}
                        </p>
                      </li>
                    ))}
                </ul>
              </Section>

              <Section n="B" title="The evidence chain">
                <ul className="space-y-2">
                  {lead.evidence
                    .filter((e) => SOURCE_META[e.source].tier === "primary")
                    .map((e) => (
                      <li key={e.id} className="flex items-start gap-2.5">
                        <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-600" />
                        <p className="text-[0.8125rem] leading-relaxed text-slate-700">
                          <span className="font-medium text-slate-900">
                            {SOURCE_META[e.source].label}
                          </span>
                          , observed {prettyDate(e.observedAt)}. {e.statement}
                        </p>
                      </li>
                    ))}
                </ul>
                <p className="mt-2 text-[0.75rem] text-slate-500">
                  The full chain, with secondary sources, rides in the download
                  and on the{" "}
                  <Link
                    href={`/app/locations/${lead.id}`}
                    className="font-semibold text-indigo-700 hover:underline"
                  >
                    location record
                  </Link>
                  .
                </p>
              </Section>

              <Section n="C" title="The computation">
                <p className="text-[0.8125rem] leading-relaxed text-slate-700">
                  Occupancy measured open-and-operating by floor area on{" "}
                  {lead.center.suites.filter((s) => s.kind !== "anchor" && s.kind !== "outparcel").length}{" "}
                  suites, anchors and outparcels excluded, deemed-open rules
                  applied. Rent roll{" "}
                  {Math.round(lead.center.rentRollCoverage * 100)}% complete as
                  of {prettyDate(lead.center.rentRollAsOf)}. Estimated
                  adjustment {formatCoTenancyRent(lead.evaluation.monthlyDelta)}{" "}
                  on reported sales; the lease formula on actual monthly Gross
                  Sales controls.
                </p>
              </Section>

              <Section n="→" title="What happens next">
                <ol className="space-y-2">
                  {steps.map((s, i) => (
                    <li key={i} className="flex gap-2.5">
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-indigo-600 text-[0.625rem] font-bold text-white shadow-sm">
                        {i + 1}
                      </span>
                      <p className="text-[0.75rem] leading-relaxed text-slate-600">
                        {s}
                      </p>
                    </li>
                  ))}
                </ol>
              </Section>
            </div>
          </div>
        </Panel>
      )}

      <NoticeDesk candidates={deskRows} />
    </div>
  );
}

function Section({
  n,
  title,
  children,
}: {
  n: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-center gap-2.5">
        <span className="flex h-5 w-5 items-center justify-center rounded-md bg-indigo-600 text-[0.625rem] font-bold text-white shadow-sm">
          {n}
        </span>
        <h3 className="text-[0.875rem] font-semibold text-slate-900">{title}</h3>
      </div>
      <div className="mt-2.5">{children}</div>
    </div>
  );
}
