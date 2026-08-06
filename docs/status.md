# Status: decisions needed, and what is not built

Last updated 2026-08-05.

---

## 1. Decisions only you can make

These are blocking or shaping, and guessing at them is more expensive
than asking.

### 1.1 Multi-brand hierarchy: DECIDED, not a focus

Answered 2026-08-05: a holding company or PE-owned portfolio is not a
near-term target. Build single-tenant.

**One hedge is being taken anyway.** Every table carries an `org_id`
from the first migration, always the same value for a single-brand
client. No switcher, no roll-up, no UI. It costs a column now and saves
a full migration plus re-keying every row if a Sycamore-shaped
prospect ever appears. Nothing else about the hierarchy gets built.

### 1.2 Pricing shape

Currently modeled as $340 per watched door per year with a $14,000
minimum, which is illustrative. It appears in Value realized and
Settings. Two things to confirm:

- Per-door with a floor, or flat tiers? Per-door is right on economics
  (an 800-door account costs far more to serve than a 40-door one) but
  flat is easier to sell.
- Is there a success fee on relief actually secured? That changes what
  the Value page should emphasize.

### 1.3 The investor conflict disclosure

Settings now states in the product that customer lease terms, sales and
findings are never pooled, benchmarked, or disclosed to any landlord,
owner, or investor in Breakpoint. That is the right posture given who is
backing this, and a Lululemon GC will ask.

**Confirm it is true and that you will contract to it.** If there is any
data-sharing arrangement contemplated with the investor, the wording has
to change before this is shown to a prospect.

### 1.4 Do we ever contact a landlord directly?

The product is built on "we assemble, your authorized signatory serves."
If you intend to offer landlord outreach as a service, that needs
counsel review for unauthorized practice of law, and the Settings and
notice flows need rework. Right now the product promises we do not.

### 1.5 Field visits: who performs them?

The evidence ladder promises that nothing reaches a notice package on
secondary sources alone, and that we escalate to a dated field
photograph. That is a real operational commitment with a real cost
(roughly $15 to $40 a visit through a marketplace). Confirm we are
willing to run it, because the claim is load-bearing.

---

## 2. Not built

### Product

| Item | Notes |
|---|---|
| Multi-brand hierarchy | Blocked on 1.1 |
| Notice desk wiring | The state machine and permissions exist; the buttons are inert |
| Scaling stress pass | Never tested at 0 findings or 40. The threshold rail handles it by construction, the decision table and clocks panel do not |
| Report generation | Reports are listed on Activity; none actually generate a document |
| Alert delivery | Routing is captured in Settings; no email or SMS is wired |
| Bulk actions | "Draft N requests" on Coverage is not wired |
| Document upload | The wizard and setup pages accept the gesture; nothing is stored |

### Engine and data

| Item | Frequency in the real gold set |
|---|---|
| `termination_window` | 81% of records |
| Tenant preconditions beyond our five enum values | 75% |
| `recurrence` (one-time vs recurring rights) | 75% |
| `area_exclusions` as free text, not mapped to suite kinds | 70% |
| Abstractor notes | 55% |
| `sunset` (clauses that expire on their own) | 44% |
| Replacement standards outside any enum (31 distinct kinds) | 37% |
| Claim and dispute correspondence has no home in `Clause` | 20% |

Compound triggers were the largest gap and are now closed.

Also not done: clause versioning by effective date. The real data shows
a clause replaced by a Sixth Amendment effective 2/1/2026, a future
date, and another voided entirely. A clause is a fact about a lease **on
a date**, and we still model it as a fact about a lease.

### Copy and polish

- Marketing site voice pass. Spellings and the "owed" violations are
  fixed; the register is still closer to a website than to the language
  a lease administrator uses.
- Provenance on the Exposure Matrix and Cascade. Applied to the Watch
  Record, Value and the Board; those two still state figures without
  saying where they came from.

### Infrastructure, all still absent by design

No database, no auth (the sign-in is a hardcoded demo credential in
`src/lib/session.ts` and must be replaced before any real customer), no
Claude API integration, no scrapers, no OCR, no scheduler. The workspace
store is browser-persisted but shaped like the API that will replace it.

---

## 3. What is built and verified

Marketing site, onboarding wizard, and the workspace: Overview, Ask
Theo, Locations and location detail, Coverage, Activity, Signals, Anchor
exposure and cascade, Clause library, Value realized, Notice packages,
Portfolio setup, Settings.

Engine: per-clause occupancy with its own denominator and deemed-open
rules, compound requirement trees, tenant preconditions, evidence
tiering, computability grading, capped retroactive lookback, clause
strength grading, anchor rollover, operator cascade.

Gold set harness: `node --experimental-strip-types scripts/goldset-report.ts`
scores any extractor against the partner's 175 labeled records, field by
field. Self-tests at 100% on identical input.

Audit rig: `node scripts/app-shoot.mjs <base> "<routes>"` checks every
route at three widths for overflow, heading orphans, console errors and
redirects.
