-- 009: the flag inbox.
--
-- One row per dated flag: a location entering a state that needs the
-- client's attention. The inbox pattern: rows arrive as 'new'
-- (notification-prominent, newest first), move to 'in_review' when
-- someone starts working the flag, and 'handled' when the review is
-- done. The unique key is the EPISODE: if the same location recovers
-- and trips again later, the new episode gets a fresh row and the
-- inbox lights up again. That is the reset semantics.
create table if not exists finding_alert (
  id           serial primary key,
  org_slug     text not null,
  location_ref text not null,
  center_name  text not null,
  kind         text not null,              -- triggered | election_open | confirm_store
  episode      text not null,              -- episode key (e.g. the month the qualifying period completed)
  headline     text not null,
  detail       text,
  flagged_on   date not null,              -- when the condition was hit, from the evaluation
  status       text not null default 'new',-- new | in_review | handled
  actor        text,                       -- who last moved it
  handled_at   timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique (org_slug, location_ref, kind, episode)
);

create index if not exists finding_alert_org_status
  on finding_alert (org_slug, status, flagged_on desc);
