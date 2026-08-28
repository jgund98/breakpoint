-- The operating loop: the tables that turn state into a running service.
--
-- location_pipeline  the abstraction lifecycle per location. A missing
--                    row for a portfolio'd org means LIVE (the board is
--                    running on it); rows exist only while something is
--                    in flight — an amendment queued for re-extraction,
--                    a draft awaiting a person's approval.
-- scan_run /         a filed scan pass and what it actually saw, store
-- scan_observation   by store. This is the recorder behind the printed
--                    sheet: monitoring as a record, not a claim.
-- notification       what we told the client, when, and whether they
--                    read it. The client's bell and the ops delivery
--                    log read the same rows.
-- notice_status      the served notice's next chapter: acknowledged,
--                    disputed, cured, resolved — with the response on
--                    file.
-- audit_log          who did what on the console. Append-only.

create table if not exists location_pipeline (
  org_slug      text not null,
  location_ref  text not null,
  stage         text not null default 'received'
                check (stage in ('received', 'extracted', 'approved')),
  /* The draft under review and the language it was read from. */
  extracted     jsonb,
  source_excerpt text,
  confidence    integer check (confidence between 0 and 100),
  note          text,
  reviewed_by   text,
  reviewed_at   timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  primary key (org_slug, location_ref)
);

create table if not exists scan_run (
  id            uuid primary key default gen_random_uuid(),
  org_slug      text not null,
  ran_by        text not null default 'ops',
  note          text,
  locations     integer not null default 0,
  stores        integer not null default 0,
  changes       integer not null default 0,
  created_at    timestamptz not null default now()
);

create table if not exists scan_observation (
  id            uuid primary key default gen_random_uuid(),
  run_id        uuid not null references scan_run(id) on delete cascade,
  org_slug      text not null,
  location_ref  text not null,
  center_ref    text not null,
  store_name    text not null,
  status        text not null check (status in ('open', 'closed', 'unclear')),
  /* True when this pass saw something different from the record. */
  changed       boolean not null default false,
  note          text,
  created_at    timestamptz not null default now()
);
create index if not exists scan_observation_center_idx
  on scan_observation (org_slug, center_ref, created_at desc);

create table if not exists notification (
  id            uuid primary key default gen_random_uuid(),
  org_slug      text not null,
  kind          text not null default 'general',
  title         text not null,
  body          text,
  location_ref  text,
  created_at    timestamptz not null default now(),
  read_at       timestamptz
);
create index if not exists notification_org_idx
  on notification (org_slug, created_at desc);

create table if not exists notice_status (
  org_slug      text not null,
  location_ref  text not null,
  stage         text not null default 'served'
                check (stage in ('served', 'acknowledged', 'disputed', 'cured', 'resolved')),
  served_on     date,
  response      text,
  updated_at    timestamptz not null default now(),
  primary key (org_slug, location_ref)
);

create table if not exists audit_log (
  id            uuid primary key default gen_random_uuid(),
  actor         text not null default 'ops',
  action        text not null,
  org_slug      text,
  subject       text,
  detail        text,
  created_at    timestamptz not null default now()
);
create index if not exists audit_log_time_idx on audit_log (created_at desc);

-- The account facts the board and registry carry per client.
alter table org add column if not exists account_manager text;
alter table org add column if not exists contract_start date;
alter table org add column if not exists contract_renewal date;
