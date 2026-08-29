/**
 * ============================================================
 * THE NOTICE LETTER — drafted as tenant's counsel would draft it
 * ============================================================
 *
 * One builder produces the letter model; the on-screen preview and the
 * downloadable package render the SAME model, so what counsel reviews
 * is what the desk showed.
 *
 * Drafting decisions, each with a reason:
 *
 *  - Certified mail / notice-provision line up top: Old Navy v. Center
 *    Developments (2019) turned on notice conduct, not clause
 *    strength. Method and date of service are part of the claim.
 *  - The failure recital keeps the THREE DATES apart: first failure,
 *    qualifying-period completion, remedy commencement. Collapsing
 *    them is the most common drafting error and invites the
 *    landlord's easiest response.
 *  - The remedy is recited in the LEASE'S OWN WORDS, and framed as
 *    "the parties' agreed adjustment of rent" — the characterization
 *    that survived the penalty attack in JJD-HOV v. Nordstrom (2024),
 *    where Grand Prospect v. Ross (2015) shows what happens without
 *    the proportional-harm framing.
 *  - A landlord-verification demand rides along whenever the lease
 *    carries an information right: it converts our computation into
 *    the landlord's own certified number.
 *  - The reservation of rights covers acceptance-of-rent (no accord),
 *    unenumerated rights, and estoppel exposure.
 *  - Facts we do not hold are BRACKETED, never invented: the executed
 *    lease's date, the tenant entity's exact legal name, the notice
 *    address. Counsel completes them from the lease; a bracket is
 *    honest, a guess is malpractice.
 */
import {
  type Clause,
  type Evaluation,
  ENTITLEMENT_META,
  prettyDate,
  usd,
} from "@/lib/clause";
import type { rows } from "@/lib/portfolio";

export type LetterParagraph = { heading: string; body: string[] };

export type LetterModel = {
  serviceMethod: string;
  dateLine: string;
  addressee: string[];
  reLines: string[];
  salutation: string;
  opening: string;
  paragraphs: LetterParagraph[];
  closing: string[];
  signature: string[];
  cc: string[];
  disclaimer: string;
};

type Row = (typeof rows)[number];

const monthsRun = (fromISO: string | undefined, toISO: string | null) => {
  if (!fromISO || !toISO) return null;
  const [fy, fm] = fromISO.split("-").map(Number);
  const [ty, tm] = toISO.split("-").map(Number);
  return (ty - fy) * 12 + (tm - fm) + 1; // inclusive of the first failing month
};

export function buildNoticeLetter(
  r: Row,
  orgName: string,
  preparedStamp: string,
): LetterModel {
  const clause: Clause = r.clause;
  const ev: Evaluation = r.evaluation;
  const failing = ev.triggers.filter((t) => t.failing);
  const cite = failing[0]?.cite ?? clause.locations[0] ?? "[Section __]";
  const remedy = clause.remedy;
  const remedyText =
    remedy.altRent?.text ??
    (remedy.abatementPct != null
      ? `a ${remedy.abatementPct}% abatement of Fixed Minimum Rent`
      : "[remedy as stated in the Lease]");
  const firstFail = r.claim.firstObservedAt;
  const triggerDate = ev.cureEndsOn;
  const ran = monthsRun(firstFail?.slice(0, 7), triggerDate?.slice(0, 7) ?? null);
  const runsFromNotice =
    remedy.reliefRunsFrom === "notice" ||
    remedy.reliefRunsFrom === "first_of_month_after_notice";
  const entitlement = clause.entitlements?.[0];
  const isElection = ev.state === "election_open";

  /* ---- the failure recital, fact by fact ---- */
  const conditionFacts = failing.map(
    (t) =>
      `under ${t.cite}, the Lease requires ${lcFirst(t.requirement)}; as verified by Tenant's monitoring record, ${lcFirst(t.observed)}${
        t.culprits.length
          ? ` (${t.culprits.slice(0, 4).join(", ")} not open and operating)`
          : ""
      }`,
  );

  const paragraphs: LetterParagraph[] = [];

  paragraphs.push({
    heading: "1. The Co-Tenancy Failure.",
    body: [
      `A Co-Tenancy Failure (as such condition is described in ${cite} of the Lease) exists at the Shopping Center. Specifically, ${conditionFacts.join("; further, ")}.`,
      `The condition first failed to be satisfied ${
        firstFail ? `on or about ${prettyDate(firstFail)}` : "on a date reflected in Tenant's records"
      }${
        ran && triggerDate
          ? `, has continued for ${ran} consecutive calendar month${ran === 1 ? "" : "s"}, and the qualifying period prescribed by ${cite} was accordingly satisfied as of ${prettyDate(triggerDate)}`
          : ""
      }. Tenant's supporting record, including the dated evidence of each closure and the occupancy computation with its measurement basis and exclusions, accompanies this notice as Exhibits A through C.`,
    ],
  });

  if (!isElection) {
    paragraphs.push({
      heading: "2. Election of Remedy.",
      body: [
        `Accordingly, pursuant to ${cite}, and effective as of ${
          runsFromNotice
            ? "the first day of the first calendar month following Landlord's receipt of this notice"
            : triggerDate
              ? `${prettyDate(triggerDate)}, the date the qualifying period was satisfied${
                  remedy.reliefRunsFrom === "failure" && firstFail
                    ? `, with relief reaching back to ${prettyDate(firstFail)} as the Lease provides`
                    : ""
                }`
              : "the date provided in the Lease"
        }, Tenant elects to pay ${remedyText}, in lieu of the Fixed Minimum Rent otherwise payable, as the parties' agreed adjustment of rent for the circumstances addressed by ${cite}.`,
        `Tenant will remit Substitute Rent computed on that basis with its next regularly scheduled payment${
          ev.monthlyDelta != null && ev.monthlyDelta > 0
            ? `. For Landlord's reference, on Tenant's current reported Gross Sales the adjustment approximates ${usd(Math.round(ev.monthlyDelta))} per month; the controlling computation is the Lease formula applied to actual monthly Gross Sales`
            : ""
        }. Payment of Substitute Rent is made under the Lease and shall not constitute a default, an accord, or a waiver of any right.`,
      ],
    });
  } else {
    paragraphs.push({
      heading: "2. Election Following Expiration of the Substitute Rent Period.",
      body: [
        `The Co-Tenancy Failure has continued beyond the ${remedy.capMonths ?? "[__]"}-month Substitute Rent period prescribed by ${cite}. The Lease accordingly requires an election${
          ev.electionDeadline
            ? `, which must be made on or before ${prettyDate(ev.electionDeadline)}`
            : ""
        }.`,
        `Tenant hereby provides notice that it is evaluating its election under ${cite}, including its right to terminate the Lease${
          remedy.terminationNoticeDays
            ? ` on ${remedy.terminationNoticeDays} days' notice`
            : ""
        }${
          remedy.unamortizedReimbursement
            ? " together with reimbursement of Tenant's unamortized costs as the Lease provides"
            : ""
        }, and expressly preserves that election through the full period the Lease allows.`,
      ],
    });
  }

  if (entitlement) {
    paragraphs.push({
      heading: `${isElection ? "3" : "3"}. Landlord Verification.`,
      body: [
        `Pursuant to ${entitlement.cite}, Tenant requests that Landlord deliver ${lcFirst(
          ENTITLEMENT_META[entitlement.kind].label,
        )} — ${lcFirst(ENTITLEMENT_META[entitlement.kind].unlocks)} — within ${entitlement.responseDays} days of this notice. The Lease provides: "${entitlement.text}"`,
      ],
    });
  }

  paragraphs.push({
    heading: `${entitlement ? "4" : "3"}. Reservation of Rights.`,
    body: [
      `This notice is given in accordance with the notice provisions of the Lease and without prejudice. Tenant reserves all rights and remedies under the Lease and at law or in equity, including without limitation any right of termination, offset, or recoupment, whether or not enumerated here, and no delay or partial exercise shall operate as a waiver. Landlord's acceptance of Substitute Rent shall not constitute an accord and satisfaction. Tenant further reserves its rights with respect to any estoppel certificate requested during the pendency of this condition, which must accurately reflect the matters stated in this notice.`,
    ],
  });

  return {
    serviceMethod:
      "VIA CERTIFIED MAIL, RETURN RECEIPT REQUESTED, AND AS OTHERWISE REQUIRED BY THE NOTICE PROVISIONS OF THE LEASE",
    dateLine: "[Date of service]",
    addressee: [
      `${r.center.owner}, as Landlord`,
      "[Notice address per the Lease's notice provision]",
      "[With copies as the Lease requires]",
    ],
    reLines: [
      `Lease dated [__________], as amended (the "Lease"), between ${r.center.owner} ("Landlord") and ${orgName} [exact tenant entity per the Lease] ("Tenant")`,
      `Premises: Store No. ${r.storeNumber}, ${r.center.name}, ${r.center.city}, ${r.center.state} (the "Premises"; the center, the "Shopping Center")`,
      isElection
        ? "NOTICE REGARDING CO-TENANCY ELECTION"
        : "NOTICE OF CO-TENANCY FAILURE AND ELECTION OF REMEDY",
    ],
    salutation: "Ladies and Gentlemen:",
    opening:
      "Capitalized terms used and not defined in this letter have the meanings given to them in the Lease.",
    paragraphs,
    closing: [
      "Please direct any correspondence concerning this notice to the undersigned and to Tenant's counsel.",
    ],
    signature: [
      orgName.toUpperCase() + " [exact tenant entity]",
      "By: ______________________________",
      "Name: [_____________]",
      "Title: [Authorized Signatory]",
    ],
    cc: ["[Tenant's counsel]", "[Lease administration]"],
    disclaimer: `DRAFT — assembled by Breakpoint on ${preparedStamp} from its monitoring record for review by Tenant's counsel. Not legal advice, and not for service in this form: bracketed fields require completion from the executed Lease, and the evidence exhibits should be reviewed against the originals. Breakpoint assembles; Tenant's authorized signatory serves after counsel review.`,
  };
}

function lcFirst(s: string) {
  return s.length ? s[0].toLowerCase() + s.slice(1) : s;
}
