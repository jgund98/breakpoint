# PRODUCT COVERAGE MATRIX

Status legend: **DONE** (backend + permissions + tests + UI verified) ·
**FUNC** (functional, gaps noted) · **MOCK** (works via mock adapter) ·
**UI-ONLY** (control renders, no persisted behavior) · **GAP** (unbuilt).
UI/UX column: OK = verified against the design laws; see BREAKPOINT-BRAIN §5.

## Client workspace (/app)

| Surface | Behavior | Backend | DB | Permission | Audit/notify | Tests | Status | UI/UX |
|---|---|---|---|---|---|---|---|---|
| /login | Credential sign-in | /login/api → auth_session | app_user, auth_session | public | audit login | auth-probe | **FUNC** (built this phase) | OK |
| /app Overview hero (Verdict) | Live inbox summary, start-review inline | GET/POST /app/api/findings | finding_alert | member | audit finding_* | db-loop-probe | DONE | OK |
| Overview stats/rail/tables | Computed from portfolio | portfolio module (static A&F) | — | member | — | app-shoot | FUNC (single-org data seam) | OK |
| /app/inbox | Flag queue: new→in_review→handled, reopen; newest first, polling | /app/api/findings | finding_alert | member; viewer read-only | audit | db-loop-probe + auth-probe | DONE | OK |
| Nav badge (Inbox) | Live new-flag count, pulse | GET findings | finding_alert | member | — | visual | DONE | OK |
| /app/locations table | Search/filter/sort/CSV; provenance | portfolio | — | member | — | app-shoot | FUNC | OK |
| /app/locations/[id] | Theo's read, next steps, strength memo, evidence, scans, papers, actions | multiple | client_request, lease_document, scan_* | member | audit | db-loop-probe | DONE | OK (rebalanced 2026-08-28) |
| Location: request scan / report closure / estoppel | Files to ops queue | /app/api/requests | client_request | member (not viewer) | notify+audit | db-loop-probe | DONE | OK |
| /app/theo | Q&A + tasks + jump links; dark AI surface | /app/api/theo | client_request, finding_alert, audit_log | member (tasks not viewer) | audit theo_task | smoke + probe | DONE | OK |
| /app/clauses | Clause library (read) | portfolio | — | member | — | app-shoot | FUNC | OK |
| /app/coverage | Coverage + confirm-store | portfolio + requests | client_request | member | notify | probe | FUNC | OK |
| /app/activity | Sweeps + filed scans | scan_run/observation | scan_* | member | — | probe | DONE | OK |
| /app/deadlines | Clocks + ICS export | portfolio | — | member | — | app-shoot | FUNC | OK |
| /app/notices | Counsel-grade letter + exhibits + staged desk + download | notice-package route; workspace-store stages | notice_package (localStorage stages: see gap) | role-gated stages (team.ts) | — | db-loop-probe | FUNC (stage state is localStorage, not DB) | OK |
| Notice package download | Timestamped self-contained document | /app/api/notice-package | — | member | — | probe check | DONE | OK |
| /app/report | Printable period report | portfolio | — | member | — | app-shoot | FUNC | OK |
| /app/setup | Implementation tracker | location_pipeline | location_pipeline | member | — | probe | DONE | OK |
| /app/settings | Team, alerts channels | partial | org_settings | member | — | — | UI-ONLY in parts (alert prefs not persisted per user) | OK |
| Notification bell | Unread, mark-all | /app/api/notifications | notification | member | — | probe | DONE | OK |
| /app/api/documents | Read-only vault | lease_document | lease_document | member | — | probe | DONE | — |

## Admin console (/admin)

| Surface | Behavior | Backend | DB | Permission | Tests | Status | UI/UX |
|---|---|---|---|---|---|---|---|
| /admin overview | HQ stats, needs-attention, BarSpark | /admin/api | many | platform_admin (this phase) | probe | DONE | OK |
| /admin/clients + [slug] | Registry, create client, invite link, status | org_* actions | org | platform_admin | probe | DONE | OK |
| Client board (OpsBoard) | Schedules, configs, sources, requests, pipeline, scan recorder, flags mirror, papers, account | action-switched /admin/api | 002–009 tables | platform_admin | db-loop-probe 41 | DONE | OK |
| /admin/extraction | Cross-client review desk | pipeline actions | location_pipeline | platform_admin | probe | DONE | OK |
| /admin/onboarding | Submissions → promote to org | onboarding_submission | probe | platform_admin | probe | DONE | OK |
| /admin/agent | Canon editor (24 directives) | directive actions | agent_directive | platform_admin | probe | DONE | OK |
| /admin/requests | Cross-client queue | requestsAll | client_request | platform_admin | probe | DONE | OK |
| /admin/system | Live health, audit table | counts | audit_log | platform_admin | probe | DONE | OK |

## Onboarding (/onboarding)
Task board, autosave, submission → admin work order. FUNC/DONE
(onboarding-probe). No sign-in by design (client has no account yet).

## Engine & intelligence
| Piece | Status |
|---|---|
| timeline.ts month-series engine | DONE — certified vs round-2 key (permanent regression harness) |
| clause.ts point-in-time evaluator | DONE — round-1 key perfect |
| Extraction prompt builder + gold-set scorer (scripts/extract-clause.ts) | FUNC — model call gated on ANTHROPIC_API_KEY; prompt-only without |
| Theo two-layer brain | DONE (engine always; model when key present; task layer deterministic) |
| Analyst brief / notice letter builders | DONE (deterministic composition) |

## Known GAP list (see REMAINING_GAPS.md for detail)
- Real per-org portfolio data seam (repo.ts steps 2–4): workspace pages
  render the A&F sample for every org.
- Notice desk stage state lives in localStorage (workspace-store), not DB.
- Per-user notification preferences/digests; mock email/SMS adapters.
- Document ingestion pipeline (upload → text extraction → extraction
  queue) beyond the lease vault + manual pipeline.
- Nightly scheduled reevaluation (evaluation is per-request; scans are
  operator-recorded by design in the manual-service model).
- Settings persistence for client alert preferences.
