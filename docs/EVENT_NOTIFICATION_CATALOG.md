# EVENT & NOTIFICATION CATALOG

Channels today: **in-app** (`notification` table → bell, unread state,
mark-one on click-through / mark-all) and **flag inbox**
(`finding_alert` → /app/inbox, lifecycle new→in_review→handled).
Email/SMS: not sent anywhere; mock = the in-app record itself (see
EXTERNAL_SETUP_REQUIRED).

| Event | Producer | Record | Recipient | Dedup / idempotency | Deep link |
|---|---|---|---|---|---|
| Scan/closure/estoppel request handled | admin request_handled | notification kind=request | org | one per handled request id | /app/locations/[ref] |
| Extraction approved (back under watch) | admin pipeline_approve | notification kind=extraction | org | pipeline row deleted = done | /app/setup |
| Scan pass found a closure | admin scan filed | notification kind=scan | org | per scan_run id | /app/activity |
| Location flagged (triggered / election open / confirm store) | findings reconcile | finding_alert status=new | org | unique (org, location, kind, episode) — the reset semantics | /app/locations/[ref] + inbox row |
| Flag moved (start/handle/reopen) | client, ops, or Theo | finding_alert status + audit_log | queue viewers | idempotent status update | /app/inbox |
| Theo task performed | theo route | audit_log action=theo_task (+ client_request when filed) | ops queue | insert-only | per task links |
| Notice status recorded | client notice-status | notice_status upsert + audit | ops board | upsert (org, location) | admin board |

Rules:
- Every notification's click destination is the exact object, never a
  generic dashboard.
- Bell counts unread; nav badge counts NEW flags; both poll (60s,
  visibility-aware) so the rail is live without refresh.
- notify()/audit() helpers never throw (delivery must not break the
  operation that produced the event).
- Per-user channel preferences and digests: gap #4 in REMAINING_GAPS.
