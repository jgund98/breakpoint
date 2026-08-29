# AUTONOMOUS BUILD STATE

Updated: 2026-08-28 (session: inbox/notices/Theo shipped; auth build begun)

## Current phase
**Phases 1-4 COMPLETE.** Auth/roles/isolation (b50f40e), notice
workflow as a system of record (11e7505), alert routing persisted as
org policy + enforced by the bell (migration 012, /app/api/preferences,
SettingsBoard wired), and the scheduled reevaluation (lib/evaluate-run,
/api/cron/evaluate daily via vercel.json, CRON_SECRET in Vercel
prod+dev, staff manual trigger on /admin/system). auth-probe 44/44,
db-loop-probe 41/41. Next: the per-org portfolio seam (gap #2 — the
big one), then user management UI on the invitation table, then the
document ingestion pipeline (gap #5).

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
