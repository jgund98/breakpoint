# THE BREAKPOINT BRAIN

The portable compendium of everything this project knows: the business,
the co-tenancy law, the agent's programming, the architecture, the
design system, and the engineering lessons that cost real time. Carry
this file into any new chat or agent session. The runtime subset of
this knowledge lives in the `agent_directive` table (editable at
/admin/agent without a deploy, seeded by `scripts/seed-directives.mjs`);
this document is the superset and the source of truth for re-seeding.

Never commit: `AF Portfolio ANSWER KEY.xlsx` / `af_portfolio_answer_key.json`
(Desktop). Their own README says to seal them from the system under test.
`scripts/af-score.ts` reads them from the Desktop path.

---

## 1. WHAT BREAKPOINT IS

One sentence: **we watch every location a retail tenant leases, detect
when a co-tenancy-relevant store closes, check the closure against the
extracted lease record, and flag which locations MAY qualify for
co-tenancy rent — with the evidence, the money estimate, and the
clocks. Their real estate team takes it from there.**

- Buyer: large retail tenants (Abercrombie & Fitch is the pilot: 20
  locations in the sample, ~800+ real). One lease to 5,000 stores.
- Price logic: ~$50k+/yr. A single caught claim (e.g. $16,540/mo at
  Danbury Fair) pays for years of the service. In quiet years the
  visible watch record IS the product (anti-churn).
- Tenant-side ONLY. Owner-side content exists but is off the public
  site by decision.
- The service is a SaaS-portal + human hybrid today: people run scans
  and approve extractions; the software is the system of record. The UI
  is the backend spec — nothing on screen that we don't intend to build.

### The core loop (both seats)

1. Client onboards once through the console (/onboarding) — roster,
   leases, what's on the record, sales, priorities, people, watch prefs.
2. Ops wires each location: Google Places id per storefront, directory
   URL(s) per CENTER (830 stores ≈ 400 links, never per-store).
3. Scans run on schedule (e.g. 15th + last day of month; the recorder
   files real passes today, crawlers replace hands later).
4. Closure detected → the extracted clause record is evaluated → the
   location is flagged "MAY qualify" → the client's bell rings.
5. The client sees the flag, evidence chain, lease basis, money
   estimate, deadlines; exports the file; counsel and signatory act.
6. Quarterly report + scan history prove the watch and earn renewal.

---

## 2. CO-TENANCY DOMAIN EXPERTISE

The law and market knowledge, hardened against the partner's 20-center
answer key (engine scores: 480/480 monthly conditions, 7/7 first-failing
months, 7/7 trigger dates, 89/89 verify checks — rerun
`node --experimental-strip-types scripts/af-score.ts` after ANY engine
change).

### Clause anatomy
- A co-tenancy clause = trigger condition(s) + qualifying period +
  tenant preconditions + remedy + exit rights + (often) reporting
  rights. Extract each as a first-class term.
- Read AMENDMENTS FIRST. An amendment can suspend, restate, or
  re-anchor everything beneath it.
- Two families: OPENING co-tenancy (protects the start of term) and
  OPERATING co-tenancy (protects ongoing occupancy). A clause can be both.

### Combine semantics (the trap that flips answers)
- "OR"/"any" between failure conditions = the REQUIREMENT is the AND of
  the tests: any single failing test breaks the clause.
- "AND" between failure conditions = conjunctive trigger; everything
  must fail at once. Rare, and rarely pays.
- Prefer an explicit logic tree over shorthand; shorthand survives only
  for legacy records.

### The three dates that must never collapse
1. The month the condition FIRST FAILS.
2. The month the QUALIFYING PERIOD completes (the trigger) — whole
   calendar months, INCLUSIVE of the first failing month, running from
   the FAILURE. Never `duration × 30 days` (that put 6 of 7 trigger
   dates a month late).
3. The date RELIEF starts — governed by NOTICE where the lease says so.
   Notice never moves the trigger; it moves the money.
- A suspended clause cannot be breached: keep the observation date,
  delay only the clock (`effectiveFrom`).
- Relief can run from failure (reaching back over the measuring
  period), from trigger, or from notice — extract which, plus any
  retroactive cap. A sequenced remedy that reaches back captures months
  a notice-driven one loses forever (Walden was missing 5 months).

### Tenant preconditions
- Open-and-operating, not-in-default, right personal to original
  tenant, sales-decline gates. Each can kill an otherwise sound claim.
- Where no evidence exists either way, the precondition is UNVERIFIED —
  which is different from met and different from failed. Say so.

### Occupancy tests
- Pin each test to its own definitions: measurement basis (leased vs
  occupied vs open-and-operating), area basis (total GLA, inline GLA, a
  defined exhibit zone), and the exclusions, verbatim.
- The source dataset measures by FLOOR AREA, not unit count (verified
  exact 17/17).
- A defined-zone test is not computable until the exhibit is mapped to
  suites; refuse the read rather than measure the whole center.
- Full rosters from published directories make occupancy COMPUTABLE
  from obtainable data (rentRollCoverage can be 1) — stronger position
  than assuming the landlord's rent roll is required. Grade every test
  observable / estimated / needs-rent-roll anyway.
- Deemed-open carve-outs (remodel grace with day caps, force majeure,
  casualty, seasonal) move the numerator; skipping them overstates
  failure and is the first thing a landlord attacks.

### Money laws
- Percentage rent computes on THE MONTH'S OWN SALES, never a TTM
  average (December ≈ 2× February; averaging invents savings).
- "Lesser of minimum rent or X% of gross sales": a strong-selling store
  can trigger and save $0 — render "No saving at current sales", never "$0".
- Abatement remedies don't depend on sales at all (omitting them zeroed
  the portfolio's biggest exposure, $248k at Danbury).
- Headline = cumulativeAtRisk (each month summed since the right
  arose), never annualized-current-month.
- Notice history is a CLIENT-SUPPLIED input, absent from center data;
  without it every tripped location falsely reads "claimable".

### Evidence ladder (what supports a notice)
- One secondary source (directory, Places listing, press) = a SIGNAL.
- Two independent secondary sources = CORROBORATED.
- Only a PRIMARY source verifies: field visit, the client's own store
  report, the operator's announcement, a landlord statement.
- Nothing reaches a notice package on secondary evidence alone.
- A directory listing covering a fraction of the roster is a bad copy
  or a redesigned page, not a mass closure — refuse the read and say why.

### Entity resolution laws
- NEVER fuzzy-match tenant names. "Zara Beauty Bar" contains "Zara" and
  is a different store; "Cinemark Franklin Park 16 & XD" contains
  "Cinemark" and is the same one. Identical string shapes, opposite
  answers: only exact match after case/punctuation folding resolves
  without a person.
- Directories can list "jcpenney" and "JCPenney" as separate anchors
  tens of thousands of square feet apart — never merge same-named rows.
- Centers resolve by GEOGRAPHY, never string similarity: two "The
  Galleria"s a thousand miles apart; "Woodfield" vs "Woodland" one
  letter apart in different states. Name must resolve AND state agree,
  else a person decides. With no state supplied, never auto-match if
  any other center's name sits alphabetically adjacent.
- One center's roster arrives slugified: display via
  `displayTenantName()` (`__` = "&"); identity/matching always use raw.

### Estoppel: the dual moment
- Defense: certifying "no claims, no offsets" can BAR a live position.
- Offense: the estoppel is equally where a live position goes ON THE
  RECORD — Apple at Annapolis asserted its co-tenancy rent position in
  the estoppel when Sandeep's group bought the center.
- Therefore: every sale/refinance of a watched center flags every
  location there for an estoppel check BEFORE anyone signs.

### Notice packages
- Four parts or it does not go out: clause extract with citation;
  evidence chain with dates and source tiers; occupancy computation
  with its denominator shown; money stated as ESTIMATED POTENTIAL
  co-tenancy rent.
- Breakpoint assembles; the client's authorized signatory serves after
  counsel review. Never present the system as serving notice (UPL).
- Sumer has template language for notices — to be wired into the desk.

### Case-law anchors and market terms
- JJD-HOV Elm Street v. Nordstrom (2024): co-tenancy alternative rent
  upheld against penalty/unconscionability attack where it reads as an
  agreed rent adjustment.
- Grand Prospect Partners v. Ross (2015): rent abatement struck as
  penalty where no proportional relationship to actual harm — why
  honest money estimates and real harm framing matter.
- Old Navy v. Center Developments (2019): notice/estoppel conduct can
  decide outcomes regardless of clause strength — why the record and
  the deadlines matter as much as the math.
- Market ranges: opening co-tenancy 60–90 days cure typical; operating
  cure 90–180 days; alternative rent commonly 2–6% of gross sales or
  33–50% of fixed rent; election windows commonly 6–18 months;
  termination rights usually after 12 months of alternative rent.

### Round-2 lessons (the expert's 65-mall dataset, 2026-08-28 — SCORED)
Dataset `af_portfolio_dataset (2).json` on the Desktop (65 malls,
2024-09..2026-08, seed 42). Blind predictions frozen at
`shots/af2-predictions.json` (commit a95e74b, before the key existed);
key delivered same day, scored by `scripts/af2-score.ts` (key stays on
the Desktop, NEVER in the repo). **Blind score: 1027/1040 monthly
verdicts, 60/65 end states (5 more were a scorer mapping bug, not
engine error), 17/26 triggers, 17/17 notice months.** The corrected
engine is `scripts/af2-engine.ts` → `shots/af2-learned.json`:
**1040/1040 monthly, 65/65 states, 26/26 triggers, 26/26 notices,
26/26 remedy starts, money within rounding of the key's $7,345,600.**
This file is the backend engine spec. Laws, including where the blind
run was WRONG:
- **NO materiality epsilon — my blind guard was wrong.** The failing
  margins looked bimodal (0.03-0.19 then 0.28+) and I inferred a
  measurement-noise tier; the key fails a month short by 0.03 points.
  Raw strict comparison, always. The guard cost 13 monthly verdicts, 4
  triggers and ~$560k. Lesson behind the lesson: a clean statistical
  pattern in synthetic data is a property of the generator, not a
  license to invent doctrine — legal tests are bright-line.
- **Template scenario names describe the DESIGNED EPISODE, not the
  whole timeline.** "duration_not_met" malls also carry a later
  streak that trips and cures. Never grade a mall by its label.
- **Remedy continuity (universal).** Once any remedy has triggered,
  later failing months resume relief IMMEDIATELY — no fresh
  qualifying period (cherry_creek sequenced AND mall_of_america
  alternative_rent both pay a later 3-month streak under a 4-month
  duration clause). The duration clock guards the first trip only.
- **Reach-back ONLY on retroactive:true.** A sequenced remedy without
  the flag starts at the trigger month (round-1's "sequenced =
  reach-back" over-generalized). retroactive appears only with sales
  gates in this set.
- **Sales gate = one-time unlock.** Once trailing-6-month sales
  qualify in ANY month, the remedy applies to the whole trip per the
  retroactive flag (south_hills: gate met 2026-02, remedy runs from
  first fail 2025-04). Gate never met in window → no remedy value.
- **The cap does not stop the money meter.** Rent at risk accrues from
  remedy start until cure or window end; cap_expiry = remedy_start +
  cap_m CALENDAR months, and past it with the condition persisting the
  state is post_cap (termination window open). Keystone: 23 months
  counted under a 12-month cap, $1.14M.
- **Opening co-tenancy = $0 rent at risk.** Rent has not commenced, so
  there is no remedy differential to count. The lever is the
  TERMINATION FUSE: delivery + cap_m months. Conditions met before the
  fuse → rent commences that month; unmet at the fuse → tenant
  termination right + construction cost reimbursement.
- **Preexisting failures COUNT.** Round-1 precedent (danbury), round-2
  confirmed (keystone $1.14M, danbury): clock runs conservatively from
  window start, trips; the flag is surfaced for counsel (real leases
  sometimes carve these out), never treated as a waiver. I first ruled
  carve-out and the precedent proved me wrong.
- **Opening clauses can be settled by lease text.** "Satisfied at
  delivery" is a lease fact; the window began after delivery — do not
  re-litigate it from window data. (Scored correct.)
- **suspended_until = first ACTIVE month** (verified via cielo's
  trigger); failures during suspension are observed but never run the
  clock; stateAtEnd describes the final month (lifted suspension +
  passing requirement = compliant).
- **State vocabulary mapping** (key → engine): "condition_failing
  (duration not yet met)" = watch_duration_running; "triggered
  (cure/notice period running)" = triggered_awaiting_relief;
  "cured (remedy ended)" = cured; "post_cap (termination window
  open)" = cap_reached; "opening_conditions_met (rent commenced)" =
  opening_satisfied / opening_deferral_ended.
- **Blind protocol.** Predictions are frozen by git commit BEFORE any
  key is opened; answer keys are NEVER committed to the repo. A prior
  round's already-scored key is legitimate study material for the next
  round; the current round's key stays sealed until predictions are
  committed.

**POURED INTO THE PRODUCT (same day):** the laws live in
`src/lib/timeline.ts` — the certified month-series engine (streaks,
trips, notices, remedy continuity, caps, opening fuse, money by
month). `scripts/af2-engine.ts` is now a thin adapter mapping the
round-2 dataset onto it, so the answer key is the product engine's
permanent regression test: after ANY change to timeline.ts run
`node --experimental-strip-types scripts/af2-engine.ts` then
`... scripts/af2-score.ts shots/af2-learned.json` (must stay
1040/1040 / 65/65 / 26/26×3) AND `... scripts/af-score.ts` (round-1,
must stay 480/480 / 7/7 / 7/7 / 89/89). `evaluateClause` (clause.ts)
gained the point-in-time versions: `ClaimStatus.previouslyTriggered`
(continuity skips the curing wait), `Clause.preexistingCondition` →
`Evaluation.preexistingFlag`, opening clauses zero their money fields
(`rentNotCommenced`, `openingFuse` — null until a delivery date is a
fact), and `Evaluation.capExpiresOn` (calendar months from remedy
start). Both live opening locations were already compliant, so the
pilot headline stayed $383,565. The canon grew to 23 directives:
extraction 40 rewritten (retroactive-only reach-back), extraction 92
(opening = $0 + fuse + lease-fact satisfaction), scanning 152
(bright-line thresholds), 154 (remedy continuity), 156 (cap opens the
window, never stops the meter), 158 (sales gate unlock + preexisting
is counsel's call).

---

## 3. THE AGENT CANON (runtime programming)

**2026-08-29 tranche three (scripts/seed-canon-generalization.mjs, +10 rows): GENERALIZATION BEYOND THE PILOT DATASETS** — the not-scoped-to-any-dataset meta-rule; measurement timing as a term (also a new REQUIRED capture field, trigger/85); movable denominators (GLA restatement rights); rebrand/merger aliases are not closures; bankruptcy is a process not a closing; the blink-open cure defeated by persistence; seasonal holiday inflation and the January watch; directory staleness cuts both ways; directory-less property types are field-first; ownership transfers change the notice addressee (re-confirm before serving). Canon audit: ZERO dataset-scoped rules; engine logic greps clean of location/center hardcodes (names appear only as code-comment receipts); both answer-key harnesses re-run PERFECT after the audit.

**2026-08-29 expansion (scripts/seed-canon-expansion.mjs, +21 rows):**
conduct laws in words (documents-are-data, cite-or-decline,
confidence-routes-to-a-person, never-grade-by-label, no invented
epsilon); extraction 82-96 (replacement/successor standards,
affiliate definitions, suspension inertness, preexisting-counts,
satisfied-at-delivery is a lease fact, exhibits are operative);
matching 125 (locator vs directory disagreement IS the finding);
scanning 142-148 (WARN/layoff filings as forward events, replacement
must qualify under the measurement basis, demalling as a strategy
moment, remodel grace before counting); notices 172-184 (unserved-day
leak, waiver/reservation-of-rights, penalty-doctrine posture with
Grand Prospect/JJD-HOV, percentage-rent survives scrutiny best,
evidence must be dated and attributable). Idempotent by sort number.

Live in the `agent_directive` table (55 global rows, all active),
edited at /admin/agent, assembled into every extraction/scan/Theo
prompt by `lib/directives.ts` (global first, then per-client; per-client
editing is deliberately parked). Topics: general, extraction, scanning,
matching, notices. Every directive carries a receipt from the pilot —
the seed list in `scripts/seed-directives.mjs` covers: amendments-first;
combine semantics; the three dates; relief run-from; preconditions incl.
UNVERIFIED; occupancy bases; deemed-open; information rights; honest
remedy pricing; the Zara rule; duplicate-name rule; geography rule;
partial-listing refusal; the evidence ladder; MAY-qualify language on
evaluation; the estoppel moment; assemble-not-serve; the four-part
package.

Model integration points (all keyed on `ANTHROPIC_API_KEY`):
- `scripts/extract-clause.ts`: builds the extraction prompt from canon +
  the partner's gold-set schema; calls the model
  (`EXTRACTION_MODEL`, default claude-opus-5) and SCORES itself against
  the gold set; without a key it writes `shots/extraction-prompt.txt`.
- `/app/api/theo` (`THEO_MODEL`, default claude-fable-5): two layers —
  the deterministic tool router (lib/theo.ts) computes every figure;
  the model receives question + history + a portfolio digest + the
  engine's answer + the canon, and returns reasoned prose under hard
  rules (figures only from what it was given; potential never owed; no
  legal advice; cite location ids; fail → engine answer ships alone).

### Language laws (apply to ALL copy and model output)
- "MAY qualify", "potential", "estimated" — never "owed", never that a
  claim exists. Workflow words: Abstract / Watch / Trigger / Package
  (never "Claim" as a stage).
- Cadence: "recurring evaluation as verified conditions change" —
  never "nightly"/"this morning". Never claim to know every storefront.
- No competitive absolutes ("every"/"none"); "traditional"/"most" OK.
- We flag and assemble; tenant + counsel decide. Not legal advice.
- American English. Em dashes are BANNED in product copy.
- "our engine / the Breakpoint engine", never bare "AI" in client copy.

---

## 4. ARCHITECTURE

- Repo `github.com/jgund98/breakpoint` → Vercel (jgundyt-6417s-projects/
  breakpoint) → LIVE at breakpoint.epicdevsolutions.com. Site lock
  password `jordan123` (proxy gate, `src/proxy.ts` + `lib/gate.ts`);
  demo login `admin@gmail.com`/`password123` (`lib/session.ts` — the
  swap point for real auth is `authorized()` in the admin routes;
  client auth becomes Brevo magic links).
- Next.js 16 (Turbopack), React 19, Tailwind 4, motion/react, pg.
  Neon Postgres `breakpoint-db` via Vercel env (`vercel env pull`,
  `node scripts/migrate.mjs` applies `db/00*.sql`, currently 008).
- 33 tables. The operating loop set: `org` (client registry: status
  onboarding/live/paused, account facts), `org_settings` +
  `location_config` (schedules, Places ids, lease_updated_on) +
  `center_source` (directory URLs, keyed to CENTERS), `client_request`
  (manual_scan/closure_report/estoppel_review), `onboarding_submission`,
  `agent_directive`, `lease_document` (bytes in Postgres, 4MB cap,
  callers address by id so the Blob move touches one route),
  `location_pipeline` (received→extracted; approval DELETES the row —
  missing row = live), `scan_run`+`scan_observation`, `notification`
  (client bell + ops delivery log, same rows), `notice_status`,
  `audit_log` (append-only; helpers `audit()`/`notify()` never throw).
- APIs: `/admin/api` (action-switched; GET = HQ payload / `?org=` board
  payload / `?pipeline=1` extraction+audit), `/admin/api/documents`,
  and client-side `/app/api/{requests,notifications,scans,documents,
  notice-status,theo}` — every org-scoped admin write names its org,
  validated via `orgBySlug`; `currentOrg()` survives only on /app.
- Static-vs-DB split (the one big remaining hardcode): the A&F
  portfolio renders from `src/lib/data/af-portfolio.json` (432KB, via
  `scripts/af-import.ts`); `PORTFOLIOS` in `lib/orgs.ts` maps which
  slugs have engine datasets; orgs without one get setup-state boards.
  Normalizing portfolios into relational tables is the next structural
  lift. TODAY = 2026-08-15 in the sample.
- Engine: `lib/clause.ts` (evaluation), `lib/centers.ts` (geographic
  resolution, 16/16 tests), `lib/intake.ts` (field burden: REPAIR →
  DEFER-to-lease → RESOLVE-by-observation → ASK once; never ask for
  what the leases contain), `lib/deadlines.ts`, `lib/theo.ts` (tool
  router), `lib/scan-sheet.ts` (printable pass), `lib/matching.ts`.
- Surfaces: `/admin` console (Overview, Clients + boards, Onboarding,
  Requests, Extraction, Agent canon, System) · `/app` workspace (10
  tabs: Overview, Ask Theo, Locations, Clause library, Coverage,
  Activity; Deadlines, Notice packages, Portfolio report; Setup,
  Settings) · `/onboarding` client console (task register, 8 delivery
  channels, autosaves per-browser, "Send to Breakpoint" posts the whole
  state as the work order). PovToggle switches seats in both topbars.
- Descope decisions (routes orphaned, not deleted): /app/check (WE
  watch — ops ScanRecorder is the tool), /app/clause-value,
  /app/signals (folded into Activity), Settings Messages tab (a
  messaging backend is not core). The savings ledger was deliberately
  skipped by Jordan ("skip 6"). Nothing on screen is fake: no dead
  buttons, no pretend downloads.

### Verification rig (run after changes)
- `node scripts/db-loop-probe.mjs [https://breakpoint.epicdevsolutions.com]`
  — 38 checks across the whole loop, self-cleaning, run against LOCAL
  and PROD. Probes must WAIT for state, never fixed-pause (cold prod
  functions outlast sleeps).
- `node --experimental-strip-types scripts/af-score.ts` after engine
  changes; `af-verify.ts` (keyless) too. `scripts/check-probe.mjs`
  after any button/rail restyle (text matchers). `onboarding-probe.mjs`,
  `centers-test.ts`, `intake-coverage.ts`.
- `MSYS_NO_PATHCONV=1 node scripts/app-shoot.mjs <base> "<routes,comma>"`
  screenshots at 390/768/1440 with an orphan-line checker. No query
  strings in routes (filename bug).
- Deploys: poll `npx vercel ls` for Ready — client-component text is
  NOT in SSR HTML, so page-string polls lie. Never `next build` while
  the dev server runs (wipes .next under it; every route 500s).

---

## 5. THE DESIGN SYSTEM (QT2-derived; the anti-slop laws)

Learned from `C:\Users\Lucky\Documents\GitHub\quoteturbo2-ref` (study
`components/agent/sidebar.tsx`, `dashboard-view.tsx`, `app/globals.css`)
and hardened by Jordan's vetoes. Slate neutrals; INDIGO is the accent
where QT2 uses emerald; amber = attention AND money; emerald = good;
rose = exposure.

- One skeleton, two seats: AppShell and AdminShell are structural
  twins — same gradient brand chip (one logo; sub-label "Operations
  Console" vs "Client Workspace"), w-72 white rail (icon chips h-8,
  label + one-line purpose, chevron, staggered translateX entrance,
  count badges), same topbar order (global search w/ dropdown → action
  cluster → identity), content `max-w-[88rem] px-4 sm:px-6 lg:px-10`
  (mobile gutter must stay px-4) + radial wash.
- Cards: `rounded-2xl border-slate-200/60 bg-white shadow-xl
  shadow-slate-200/50`. Sections use BAND anatomy: bordered header
  strip (title + aside), flush content below — titles never float
  inside padded boxes. Sub-cards float white + shadow-sm, never sunken
  gray bg-slate-100.
- Controls: ONE spec. Buttons h-10 rounded-xl font-semibold
  (primary indigo-600 + shadow-indigo/25, money amber-400 +
  slate-900 text, secondary white bordered, all active:scale-95);
  fields h-10 rounded-xl slate-200 border + indigo focus ring
  (textareas same skin, natural height); tabs = the Segmented pill
  everywhere; table headers uppercase tracking-wider 0.6875rem
  slate-400; stat tiles = StatCard with colored IconChip, h-full at
  every layer (a sub-less card must not shrink), always give a sub.
- PILL LAW: states are SOLID, facts are QUIET. Semantic tones =
  saturated fill + font-bold + shadow-sm (emerald-600/white,
  amber-400/slate-900, rose-600/white, indigo-600/white); muted stays
  soft ON PURPOSE — Signal must look weaker than Verified (the evidence
  ladder is visible in the pills). One geometry, dots invert on fills.
- HERO LAW: `bg-gradient-to-b from-indigo-700 to-indigo-800`, nothing
  floating in it — blurred orbs/blooms are BANNED, grids are BANNED.
  Glass panels (bg-white/10) inside heroes are fine.
- INSTRUMENT LABELS: a data panel's title says what the data IS
  ("Scan activity"), its subtitle is the data's own figures ("12
  passes · 8 changes"), never written-out numbers ("Twelve weeks") or
  captions ("One bar per scan"). Charts get real axes and legends.
- No editorial eyebrows on page titles; one numeric voice (bold Inter,
  tabular numerals — the display face is retired in the product);
  identity = gradient Monogram hashed from the name; progress =
  ProgressBar (emerald full / amber partial); every fake-looking
  affordance must be real or absent.
- Motion: entrances/one-shots only; infinite decoration is pure CSS
  gated by view; no backdrop-blur over animating layers; no filter
  blur glows (radial-gradient divs only).

---

## 6. ENGINEERING LESSONS (dated, paid for)

- UTC EVERYWHERE dates matter: engine helpers AND any SSR-rendered
  date text use UTC accessors — Vercel builds in UTC, browsers hydrate
  local (React #418; reproduce with `TZ=UTC npx next build` +
  `TZ=America/New_York npx next start`). OpsBoard's `dueToday` is
  deliberately LOCAL (operator's today, client-only render).
- ISO dates parse as UTC midnight: local getters read the previous day
  west of Greenwich and step to the wrong month.
- Token sweeps collide on prefixes: `bg-surface` ate `bg-surface-sunk`
  ("shadow-sm-sunk"), `text-cream` ate `text-cream-faint` (invalid
  class = unstyled text). After any sweep, grep for the compound forms.
- `git stash`/`pop` converts working files to CRLF (autocrlf): multi-
  line string matchers then fail — normalize `\r\n` before matching.
- React controlled date inputs reject injected DOM values — drive
  those flows through the API in probes.
- Bash heredocs mangle backticks/`$` in inline node scripts — write
  patch scripts to files with the Write tool and run them.
- Client bundles: importing lib/activity or lib/deadlines' builder into
  client components drags the 432KB portfolio in — serialize on the
  server and pass props (Overview weeks), or inline pure helpers
  (the ICS builder).
- Keep probe-visible strings stable when restyling ("Mark handled",
  "Find a client…" vs the topbar's distinct "Jump to a client…",
  "missing|inherits", "ChIJ", "awaiting portfolio import"); CSS
  uppercase transforms what innerText returns (match /i).
- app→admin/ui imports are fine (client-safe); NEVER import lib/orgs
  into client code (it pulls pg) — pure helpers live in lib/slug.ts.
- Approval-by-deletion (location_pipeline) means the pilot needs no
  seed rows: absent = live. Design state so the empty case is the
  common case.

---

## 7. OPEN ITEMS (the honest list)

1. `ANTHROPIC_API_KEY` — unlocks the extraction runner (self-scoring
   against the gold set) and Theo's model layer. Single biggest lever.
2. `GOOGLE_PLACES_API_KEY` — auto-resolve storefront ids from addresses.
3. Portfolio normalization: submissions → relational location/clause
   tables; retires the `PORTFOLIOS` hardcode; client #2 becomes real.
4. Staff auth for /admin (swap `authorized()`); Brevo magic links for
   clients; then scope the PovToggle.
5. Crawlers: Places-status tier first, then ~40 operator directory
   adapters; the scan recorder is the interim and the fallback.
6. Lease bytes → Vercel Blob (one route changes); Sumer's notice
   template language into the desk; `DATABASE_URL` should become
   Sensitive in Vercel before real client data.
7. Deliberately skipped: the realized-savings ledger (Jordan's call),
   client messaging, per-client agent directives (parked, plumbing kept).
