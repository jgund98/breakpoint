# REMAINING GAPS

Honest list, dependency-ordered. Updated 2026-08-28.

1. ~~Auth & tenancy~~ DONE (b50f40e + f1bbb7c): sessions, roles,
   org scoping, staff gate, viewer read-only, page-level tenancy gate,
   58 adversarial checks green against production.
2. **Per-org portfolio seam.** `lib/portfolio` is a build-time constant
   (A&F). repo.ts documents the migration order: derived modules take a
   portfolio argument, pages await getPortfolio(org). Until then the
   workspace UI shows the sample portfolio for non-A&F orgs; all
   DB-backed surfaces (inbox, requests, scans, papers, notifications)
   are properly org-scoped.
3. ~~Notice desk stages in DB~~ DONE (11e7505): notice_workflow +
   server-enforced separation of duties, audited. Originally: workspace-store keeps
   assembled→counsel→approved→served in localStorage. Move to a
   notice_workflow table keyed (org, location), enforce team.ts
   permissions server-side, audit each transition.
4. ~~Client alert preferences~~ DONE (47e7841): org policy persisted,
   bell-enforced, owner/admin gated. Team management DONE (b2f779d).
   Originally: Settings AlertsTab channel toggles are
   not persisted per user. Needs user_pref table + enforcement in
   notify() fan-out + mock email adapter (no real sends).
5. **Document ingestion pipeline.** Uploads land in lease_document and
   the extraction desk is manual. The full pipeline (classification,
   text extraction with page anchors, chunking, model extraction with
   citations, review routing) exists only as the extract-clause script
   against the gold set.
6. ~~Scheduled reevaluation~~ DONE (47e7841): daily cron + staff
   manual trigger, idempotent, audited. Originally: Evaluations compute on request. A
   nightly job (Vercel cron) should re-evaluate, diff states, file
   flags/notifications, and record a run. (The flag reconcile on
   findings GET is the interim.)
7. **Third detection channel.** Operator store-locator checks + state
   WARN-notice monitoring (designed, not built; see BRAIN).
8. **Demalling/redevelopment modeling, renewal-language flags** beyond
   current deadline surfacing: not built.
9. **Billing, SSO, data retention policies:** out of scope until asked.
