# AUTONOMOUS BUILD STATE

Updated: 2026-08-28 (session: inbox/notices/Theo shipped; auth build begun)

## Current phase
**Phases 1-4 COMPLETE.** Auth/roles/isolation (b50f40e), notice
workflow as a system of record (11e7505), alert routing persisted as
org policy + enforced by the bell (migration 012, /app/api/preferences,
SettingsBoard wired), and the scheduled reevaluation (lib/evaluate-run,
/api/cron/evaluate daily via vercel.json, CRON_SECRET in Vercel
prod+dev, staff manual trigger on /admin/system). auth-probe 44/44,
db-loop-probe 41/41. Phase 5 COMPLETE:
real team management (migration 013; /app/api/team invite/role/remove/
revoke with last-owner and self-removal guards; /join/[token] page +
/join/api accepting invitations, creating the user, signing them in;
Settings team tab on the real membership table with join-link delivery
until email connects). auth-probe 55/55. Phase 6 COMPLETE: the workspace UI respects
tenancy — every portfolio page calls requirePortfolio() (lib/
portfolio-gate.ts) and redirects non-imported orgs to /app/setup,
which renders that org honest own-state (papers, extraction, the
onboarding door) keyed on the SESSION org. auth-probe 58/58. PHASE 7 COMPLETE: THE PER-ORG
PORTFOLIO SEAM (60dafe4). lib/portfolio.ts = buildPortfolio factory;
lib/portfolios.ts = server-only registry (client import is a build
error); scripts/meridian-import.ts imports the round-2 65-mall dataset
as Meridian Outfitters with every certified round-2 mechanic mapped;
requirePortfolio() returns the SESSION bundle; all live pages + the
findings/theo/notice-package APIs + the cron consume it; coverage/
activity/deadlines/findings are bundle-parameterized (coverageFor/
activityFor/portfolioDeadlines(b)/expectedFlagsFor) with memoized A&F
legacy exports; the shell fetches /app/api/workspace-lite so NO
portfolio data rides in the client bundle. Meridian is LIVE: 65
locations, 18 flags, own packages, own Theo digest. auth-probe 60/60,
db-loop 44/44, round-1 key perfect. Next: full Theo index threading
per bundle (lib/theo.ts askFor), then the document ingestion pipeline
(gap #5).

## Environment facts a resuming session must know
- Stack: Next.js 16 (Turbopack), React 19, Tailwind 4, `pg` against Neon
  Postgres. No ORM. Migrations are plain SQL in `db/`, applied by
  `node scripts/migrate.mjs` (tracked in `schema_migration`).
- **The dev DB IS the production Neon DB** (established house pattern;
  probes create and delete their own rows and clean up). Migrations must
  be additive. Never drop tables. Synthetic orgs are slugged and
  removable.
- Site gate: `/unlock` cookie `bp_access` (see scripts/db-loop-probe.mjs
  for the value used by probes). Session cookie: `bp_session`.
- Local run: stop any server before `next build` (it wipes `.next`
  under a live server), then `npx next start -p 3510`.
- Test harness is bespoke Node + Puppeteer probes in `scripts/`
  (db-loop-probe.mjs = 41 checks incl. inbox/notice package; af-score /
  af2-engine+af2-score = answer-key regression; check-probe,
  onboarding-probe, centers-test, intake-coverage). Run af2 + af-score
  after ANY change to clause/timeline logic. Answer keys live on the
  Desktop, NEVER in the repo.
- Engine spec: `src/lib/timeline.ts` (certified month-series engine,
  perfect vs round-2 key) + `src/lib/clause.ts` (point-in-time).
  `docs/BREAKPOINT-BRAIN.md` is the domain compendium — read it first.

## Completed (this program)
- Flag inbox end to end (migration 009 finding_alert; /app/api/findings;
  /app/inbox; live hero; nav badge; admin mirror + finding_move action;
  probe checks).
- Attorney-grade notice packages (lib/notice-letter.ts, downloadable
  timestamped package route, desk rebuild, per-location next steps).
- Theo: dark AI surface, task layer (scan request / estoppel queue /
  flag moves / package handoff / jump links) on real write-paths,
  analyst brief on flagged locations (lib/findings.ts analystBrief).
- Terminology law (Duration clock running / Triggered / Cured /
  provenance), grade card rewritten to counsel-memo standard.
- Canon: 24 global directives seeded.

## Tests currently passing
- db-loop-probe: 41/41 against local prod build (2026-08-28).
- af-score (round-1 key): 480/480, 7/7, 7/7, 89/89.
- af2-score via product timeline engine: 1040/1040, 65/65, 26/26 x3.
- Build + tsc clean.

## Known failures
- None currently failing; gaps are unbuilt features (see REMAINING_GAPS).

## Next exact task
Implement auth (in progress at time of writing):
1. `db/010_auth.sql`: app_user.password_hash/title/platform_admin,
   auth_session, invitation (additive).
2. `src/lib/auth.ts`: scrypt hashing, session create/lookup/destroy,
   `requireSession(request)` (accepts the LEGACY demo token
   `demo-workspace-session-v1` mapped to the seeded demo user so all
   existing probes/cookies keep working), role from membership.
3. Rework /login/api to real credentials issuing per-user sessions;
   proxy accepts any plausible session cookie (validation is
   server-side per request).
4. Swap `authorized()` in every /app/api/* and /admin/api/* for
   requireSession; admin requires platform_admin; org scoping comes
   from the session, not the hardcode.
5. Portfolio guards: orgs without an imported portfolio (anything but
   abercrombie-fitch in PORTFOLIOS) must not reconcile A&F flags or
   answer from the A&F digest.
6. Viewer role is read-only: block mutating client APIs.
7. `scripts/seed-users.mjs`: demo user (platform_admin, owner of
   abercrombie-fitch) + synthetic org `meridian-outfitters` (marked
   fictional) with owner/analyst/counsel/viewer users.
8. `scripts/auth-probe.mjs`: login, bad password, legacy token compat,
   cross-org isolation, viewer 403s, admin 403 for non-platform-admin.
9. Build, run all probes, commit.

## Architectural decisions
- Sessions in Postgres (auth_session), opaque token cookie; edge proxy
  checks only cookie plausibility (no DB at edge), every server
  operation validates.
- Legacy demo token kept as an alias for the seeded demo user: keeps
  41-check probe and existing sign-ins working during the transition.
- Roles reuse the existing membership check constraint
  (owner/admin/analyst/counsel/viewer) and lib/team.ts permissions.
- The client workspace UI still renders the A&F sample portfolio for
  any org (the repo.ts data seam, step 2/3, is a later phase); DATA
  isolation is enforced at every DB-backed API now.

## Commands to resume
```
cd C:/Users/Lucky/breakpoint
node scripts/migrate.mjs
npx tsc --noEmit && npx next build   # stop the 3510 server first
npx next start -p 3510
node scripts/db-loop-probe.mjs http://localhost:3510
node scripts/auth-probe.mjs http://localhost:3510
node --experimental-strip-types scripts/af-score.ts
node --experimental-strip-types scripts/af2-engine.ts && node --experimental-strip-types scripts/af2-score.ts shots/af2-learned.json
```


## 2026-08-29 session additions

- **Field verification ops loop** (commit d0fed1c): request kind field_verification (migration 015), RequestVerification button on blocked NoticeDesk positions and unverified failing locations, admin queue label, probes cover it.
- **Internal staff management** (commit c7a32b9): /admin/team roster; staff_add / staff_disable / staff_enable / staff_password actions; app_user.disabled_at (migration 016); disable revokes live sessions; self- and last-account guards; 8 auth-probe checks.
- **Demo mode** (commit c7a32b9): org_settings.demo_mode; toggle on the client masthead resets immediately; every sign-in to a demo org runs lib/demo-reset (clears worked flags, requests, notice stages, notifications, demo uploads; audit journal kept; engine regenerates real positions on load).
- **Theo composer**: animated violet AI ring (bp-ai-glow, masked hairline).
- **Staff permission ladder** (migration 017): app_user.staff_role admin/operator/observer; POST /admin/api role-gated (ADMIN_ONLY set; observer read-only); staff_role action with self- and last-admin guards; requireSession rejects disabled users; Team page shows the ladder, per-row role select, (you) marker; 7 new auth-probe checks.
- **Theo glow v3**: 3px masked rotating band.
- **Head-of-RE build (2026-08-29 continued):** /app/exposure (Anchor risk, cascade/matrix bundle-parameterized), /app/landlords (ownership-family rollup + notice-response history), /app/report value record, /app/help (help center: loop, evidence ladder, clocks, glossary, FAQ), extraction capture checklist (migration 018, 36 expert fields, /admin/extraction panel, assembled into every extraction prompt), onboarding rail in shell idiom, honest SSO explainer on login, scripts/qa-sweep.mjs (26 routes: console errors, dead controls, size drift, tiny text, overflow — SWEEP CLEAN).
- KNOWN DEBT: OnboardingWorkspace imports lib/portfolio client-side (A&F center index in the prospect bundle) — move center resolution behind an API; rate card in lib/value.ts is placeholder pending real pricing.
- NEXT: extraction-schema admin panel (expert gold-set fields configurable, see src/lib/goldset.ts), /onboarding rework to QT2, item-3 bundle (demalling modeling, renewal flags, billing panel, SSO explainer).
