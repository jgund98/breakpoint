-- ============================================================
-- HOW EACH LOCATION IS WATCHED
-- ============================================================
--
-- The operations side of the product: what the team programs per
-- location so the scans know where to look and when to run.
--
-- Three layers, because at a thousand stores per-location editing is
-- how setup dies:
--
--   org_settings     the schedule the whole portfolio inherits, e.g.
--                    the 15th and the last day of every month
--   location_config  exceptions only: a paused store, a schedule
--                    override, the Google Places id for the client's
--                    own storefront, a lease-updated marker
--   center_source    where a scan looks for THIS center: the mall's
--                    published directory url(s), a Places id. Keyed to
--                    the center, not the location, because two hundred
--                    stores across ninety centers need ninety directory
--                    links, not two hundred.
--
-- location_ref / center_ref are the workspace's own ids until the
-- portfolio itself moves into the relational tables from 001; same
-- deliberate bridge as client_request.

create table org_settings (
  org_slug      text primary key,
  /** e.g. {"cadence":"monthly_days","days":[15,"last"]} or
      {"cadence":"weekly","weekday":1} */
  scan_schedule jsonb not null default '{"cadence":"weekly","weekday":1}',
  updated_at    timestamptz not null default now()
);

create table location_config (
  org_slug        text not null,
  location_ref    text not null,
  status          text not null default 'active'
                  check (status in ('active', 'paused', 'removed')),
  /** null inherits the org schedule. */
  scan_schedule   jsonb,
  /** Google Places id of the client's own storefront. */
  place_id        text,
  /** Set when a lease agreement is replaced or amended, so the clause
      record is re-extracted rather than trusted. */
  lease_updated_on date,
  notes           text,
  updated_at      timestamptz not null default now(),
  primary key (org_slug, location_ref)
);

create table center_source (
  id          uuid primary key default gen_random_uuid(),
  center_ref  text not null,
  kind        text not null default 'directory'
              check (kind in ('directory', 'places', 'press', 'other')),
  url         text,
  place_id    text,
  label       text,
  created_at  timestamptz not null default now()
);

create index on center_source (center_ref);
