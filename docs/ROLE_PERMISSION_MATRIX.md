# ROLE & PERMISSION MATRIX

Two layers: **platform** (Breakpoint staff) and **organization**
(the client's team, `membership.role`, constraint-checked in Postgres:
owner / admin / analyst / counsel / viewer). UI capability mapping
lives in `src/lib/team.ts` (ROLES → permissions) and is enforced
server-side by `requireSession` + per-route checks.

## Platform layer
| Capability | platform_admin | any org member |
|---|---|---|
| /admin console + every /admin/api action | ✅ | ❌ 403 |
| Client registry create/promote/status | ✅ | ❌ |
| Global agent canon editing | ✅ | ❌ |
| Cross-client queues (requests, extraction) | ✅ | ❌ |
| Move any org's inbox flags (actor "ops") | ✅ | ❌ |

The demo account (admin@gmail.com) is seeded platform_admin AND owner
of abercrombie-fitch so the walkthrough works end to end.

## Organization layer (client workspace, /app)
| Operation | owner | admin | analyst | counsel | viewer |
|---|---|---|---|---|---|
| View workspace, locations, evidence, reports | ✅ | ✅ | ✅ | ✅ | ✅ |
| Move inbox flags (start/handle/reopen) | ✅ | ✅ | ✅ | ✅ | ❌ 403 |
| File requests (scan / closure / estoppel) | ✅ | ✅ | ✅ | ✅ | ❌ 403 |
| Theo tasks (writes) | ✅ | ✅ | ✅ | ✅ | ❌ (answers still work) |
| Record notice status (served/acknowledged/…) | ✅ | ✅ | ❌ | ✅ | ❌ |
| Notice desk stage: assemble | per team.ts `assemble_notice` | ✅ | ✅ | ❌ | ❌ |
| Notice desk stage: approve (counsel) | `approve_notice` | — | ❌ | ✅ | ❌ |
| Notice desk stage: serve (signatory) | `serve_notice` (owner) | — | ❌ | ❌ | ❌ |
| Download notice package | ✅ | ✅ | ✅ | ✅ | ✅ (read) |
| Mark notifications read | ✅ | ✅ | ✅ | ✅ | ✅ (own view) |

Notes:
- Notice desk stages are enforced in UI via team.ts today; server
  enforcement lands with the notice_workflow table (gap #3).
- All org-scoped queries key on the SESSION org, never on client input.
  Cross-org ids return 404, not 403, to avoid existence leaks.
- Tested by `scripts/auth-probe.mjs`: permitted + forbidden operations
  across two orgs, wrong-password, legacy-token compat, viewer 403s,
  non-staff /admin 403.
