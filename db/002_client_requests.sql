-- ============================================================
-- REQUESTS RAISED BY THE CLIENT, FROM INSIDE THE WORKSPACE
-- ============================================================
--
-- Three things a tenant needs to be able to start themselves, all of
-- which came out of the partner meeting on 2026-08-12:
--
--   manual_scan       "look at this center now, not on the schedule"
--   closure_report    their own people saw a store go dark. A store
--                     report is primary evidence in the ladder, so this
--                     is not a suggestion box; it is testimony.
--   estoppel_review   an estoppel has been requested at this location.
--                     An estoppel certifying "no claims, no offsets"
--                     can bar a live co-tenancy position, and it is
--                     equally the moment to put one on the record, so
--                     we need to know BEFORE it is signed.
--
-- location_ref is the workspace's own location id (AF-1014 style)
-- rather than a foreign key, deliberately: the portfolio still lives in
-- application data, not in the location table from 001. When the
-- portfolio moves into the database this gains a real FK and a backfill.
-- Until then, a request must not fail to file because normalization is
-- unfinished. Service is manual right now, and this table IS the queue
-- the team works from.

create table client_request (
  id            uuid primary key default gen_random_uuid(),
  org_slug      text not null,
  location_ref  text,
  center_name   text,
  kind          text not null
                check (kind in ('manual_scan', 'closure_report', 'estoppel_review')),
  /** closure reports: the store as the client names it. */
  store_name    text,
  observed_on   date,
  body          text,
  created_at    timestamptz not null default now(),
  handled_at    timestamptz,
  handled_by    text
);

create index on client_request (org_slug, created_at desc);
create index on client_request (handled_at) where handled_at is null;
