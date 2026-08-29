/**
 * 015 — the field-verification request kind.
 *
 * A triggered position resting on secondary evidence cannot carry a
 * notice; the client asks operations to send a person to the premises.
 * That ask lands on the same client_request queue the team already
 * works, so the only change is widening the kind check. Additive:
 * every existing kind remains valid.
 */
alter table client_request drop constraint if exists client_request_kind_check;
alter table client_request add constraint client_request_kind_check
  check (kind in ('manual_scan', 'closure_report', 'estoppel_review', 'field_verification'));
