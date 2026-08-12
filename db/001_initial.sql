-- ============================================================
-- BREAKPOINT: INITIAL SCHEMA
-- ============================================================
--
-- Postgres. Apply with:  psql "$DATABASE_URL" -f db/001_initial.sql
--
-- The shape here is not a translation of the demo JSON. It comes out of
-- what the pilot portfolio actually taught us, and four decisions carry
-- most of the weight:
--
-- 1. THE CENTER LAYER IS SHARED; THE LEASE LAYER IS NOT.
--    Who is open at a mall is observable fact, published by the mall
--    itself. Two clients in the same center should read one roster and
--    one scan history rather than two copies that drift apart. A lease,
--    its clause and its terms are that client's confidential position
--    and are scoped to the org. This split is also the wall that would
--    let the same engine serve the other side of the table without
--    leaking one client's negotiating position to their counterparty.
--
-- 2. TENANT IDENTITY IS THE EXACT NAME, NEVER A FOLDED ONE.
--    Fashion Valley's directory carries "jcpenney", "JCPenney",
--    "JCPenney Optical" and "JCPenney Portrait Studio" as four separate
--    anchors with four different floor areas, and only one of them went
--    dark. Anything that case-folds them loses the claim. So the raw
--    directory string is stored verbatim and uniqueness is case
--    sensitive.
--
-- 3. STATUS IS A TIME SERIES, NOT A COLUMN.
--    "Is Macy's open" is never the question. "Was Macy's open in each of
--    the last nine consecutive months" is, because that is how a
--    qualifying period is written. suite_observation is therefore the
--    center of the schema, and current status is derived from it.
--
-- 4. WHAT WE CANNOT OBSERVE IS NULLABLE AND STAYS NULL.
--    Lease term dates, the client's own store status and notice history
--    are all client inputs that no center feed carries. They are
--    nullable on purpose. The product says "not supplied" rather than
--    inventing them, because a renewal view built on a made-up
--    expiration date is worse than no renewal view.

-- gen_random_uuid on older servers; citext for case-insensitive email,
-- because "Sumer@" and "sumer@" are one person and two rows otherwise.
create extension if not exists "pgcrypto";
create extension if not exists "citext";

-- ------------------------------------------------------------------
-- tenancy
-- ------------------------------------------------------------------

create table org (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  slug          text not null unique,
  -- "tenant" reads its own leases; "owner" would read a portfolio of
  -- centers. Stored now so the wall is enforceable from day one.
  side          text not null default 'tenant'
                check (side in ('tenant', 'owner')),
  created_at    timestamptz not null default now()
);

create table app_user (
  id            uuid primary key default gen_random_uuid(),
  email         citext not null unique,
  name          text not null,
  created_at    timestamptz not null default now()
);

-- Roles mirror the separation of duties the product already enforces:
-- assembling a notice package and serving one are different people.
create table membership (
  org_id        uuid not null references org(id) on delete cascade,
  user_id       uuid not null references app_user(id) on delete cascade,
  role          text not null
                check (role in ('owner', 'admin', 'analyst', 'counsel', 'viewer')),
  created_at    timestamptz not null default now(),
  primary key (org_id, user_id)
);

-- ------------------------------------------------------------------
-- the shared, observable center layer
-- ------------------------------------------------------------------

create table center (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  city          text not null,
  state         char(2) not null,
  landlord      text,
  -- How much of the rent roll we hold. Percentage tests are only as
  -- defensible as this number and the product reports it rather than
  -- quietly assuming 100%.
  roster_coverage numeric(4,3) not null default 1.000
                  check (roster_coverage between 0 and 1),
  roster_as_of  date,
  directory_url text,
  created_at    timestamptz not null default now(),
  unique (name, city, state)
);

create table suite (
  id            uuid primary key default gen_random_uuid(),
  center_id     uuid not null references center(id) on delete cascade,
  -- Verbatim, as the directory publishes it. Never normalized: see
  -- decision 2 above.
  name          text not null,
  -- Presentation only, where a feed arrives slugified. Never used to
  -- match anything.
  display_name  text,
  gla           integer check (gla is null or gla > 0),
  kind          text not null default 'inline'
                check (kind in ('anchor', 'junior', 'inline', 'outparcel')),
  -- Membership of a site-plan exhibit area, once a human has mapped it.
  -- Null means unmapped, which makes a defined-area test not computable
  -- rather than silently measured against the whole center.
  in_defined_area boolean,
  created_at    timestamptz not null default now(),
  unique (center_id, name)
);

create index on suite (center_id);

-- A single pass over one center's directory.
create table scan (
  id            uuid primary key default gen_random_uuid(),
  center_id     uuid not null references center(id) on delete cascade,
  ran_at        timestamptz not null default now(),
  -- Who or what produced it. A person entering a directory by hand is a
  -- first-class source, because that is how the first customers are
  -- served before any scraper exists.
  method        text not null
                check (method in ('manual', 'directory_crawl', 'places_api', 'import')),
  performed_by  uuid references app_user(id),
  ok            boolean not null default true,
  note          text
);

create index on scan (center_id, ran_at desc);

-- The time series. One row per suite per scan.
create table suite_observation (
  id            bigserial primary key,
  scan_id       uuid not null references scan(id) on delete cascade,
  suite_id      uuid not null references suite(id) on delete cascade,
  observed_on   date not null,
  status        text not null
                check (status in ('open', 'dark', 'vacant', 'remodeling', 'seasonal', 'casualty')),
  unique (suite_id, observed_on)
);

create index on suite_observation (suite_id, observed_on desc);

-- Evidence sits against a suite and a date, and carries its own source
-- tier. Only a primary source can carry a notice, which is enforced in
-- the engine rather than here because the rule is a product decision.
create table evidence (
  id            uuid primary key default gen_random_uuid(),
  suite_id      uuid not null references suite(id) on delete cascade,
  observed_on   date not null,
  source        text not null
                check (source in ('field_visit', 'store_report', 'operator_notice',
                                  'landlord_statement', 'center_directory',
                                  'maps_listing', 'press_report', 'permit_filing')),
  statement     text not null,
  url           text,
  created_at    timestamptz not null default now()
);

create index on evidence (suite_id, observed_on desc);

-- ------------------------------------------------------------------
-- the org-scoped, confidential lease layer
-- ------------------------------------------------------------------

create table location (
  id            uuid primary key default gen_random_uuid(),
  org_id        uuid not null references org(id) on delete cascade,
  center_id     uuid not null references center(id) on delete restrict,
  store_number  text,
  unit          text,
  gla           integer,
  -- The client's own store status. NOT derivable from the roster: at
  -- four of the twenty pilot centers a directory row carried the
  -- client's name and was a different store entirely, and reading
  -- status off it blocked four locations that were genuinely in remedy.
  -- Null means we have not been told, and the engine reports the
  -- open-and-operating precondition as unverified rather than assuming.
  own_status    text check (own_status in ('open', 'dark', 'remodeling')),
  created_at    timestamptz not null default now(),
  unique (org_id, center_id, store_number)
);

create index on location (org_id);

create table lease (
  id            uuid primary key default gen_random_uuid(),
  location_id   uuid not null references location(id) on delete cascade,
  -- Nullable: a center feed never carries these and guessing them puts
  -- a date on screen that is not a fact.
  commencement  date,
  expiration    date,
  rent_psf      numeric(10,2),
  -- Percentage rent is computed on the month's own sales, so the series
  -- is stored rather than an annual figure. December can run close to
  -- double February and an average reports savings that do not exist.
  created_at    timestamptz not null default now()
);

create table lease_sales (
  lease_id      uuid not null references lease(id) on delete cascade,
  month         date not null,
  gross_sales   numeric(14,2) not null,
  reported      boolean not null default true,
  primary key (lease_id, month)
);

-- ------------------------------------------------------------------
-- the clause
-- ------------------------------------------------------------------

create table clause (
  id            uuid primary key default gen_random_uuid(),
  lease_id      uuid not null references lease(id) on delete cascade,
  cite          text not null,
  source_text   text not null,
  kind          text not null default 'operating'
                check (kind in ('operating', 'opening')),
  -- Versioned by amendment. A suspended provision cannot be breached
  -- while suspended: the pilot had one suspended until 2026-06 whose
  -- occupancy fell below threshold nine months earlier, and ignoring
  -- that reported a trigger for a clause that was not in force.
  effective_from date,
  effective_to   date,
  superseded_by  uuid references clause(id),

  -- The requirement as written, as an and/or tree over the tests below.
  -- Stored as a tree because 48% of real triggers are compound and a
  -- flat list with one any/all switch cannot represent them.
  logic         jsonb not null,

  -- remedy
  remedy_kind   text not null
                check (remedy_kind in ('abatement', 'alternative_rent', 'sequenced', 'deferred_opening')),
  -- Whole calendar months, inclusive of the month the condition first
  -- fails, and measured from the FAILURE not the notice. Counting in
  -- days put six of seven pilot trigger dates exactly one month late.
  qualifying_months integer not null default 0,
  notice_required   boolean not null default false,
  relief_runs_from  text not null default 'trigger'
                    check (relief_runs_from in ('failure', 'trigger', 'notice', 'first_of_month_after_notice')),
  retroactive_cap_days integer,
  abatement_pct     numeric(5,2),
  alt_rent_pct_sales numeric(5,2),
  alt_rent_selector text check (alt_rent_selector in ('lesser_of', 'greater_of', 'fixed')),
  cap_months        integer,
  post_cap_election text,
  termination_notice_days integer,

  -- How much of this we trust, and why. Extraction confidence drives
  -- whether a human must review before it goes live.
  confidence    numeric(4,3),
  reviewed_by   uuid references app_user(id),
  reviewed_at   timestamptz,
  created_at    timestamptz not null default now()
);

create index on clause (lease_id);

create table clause_trigger (
  id            uuid primary key default gen_random_uuid(),
  clause_id     uuid not null references clause(id) on delete cascade,
  -- Matches the node ids used inside clause.logic.
  key           text not null,
  cite          text,
  kind          text not null
                check (kind in ('named_tenant', 'tenant_count', 'occupancy_pct')),

  -- named_tenant / tenant_count
  required_count integer,
  pool_label    text,

  -- occupancy_pct
  threshold_pct numeric(5,2),
  measurement   text check (measurement in ('leased', 'occupied', 'open_and_operating')),
  area_basis    text check (area_basis in ('total_gla', 'inline_gla', 'defined_area')),
  exclusions    text[],
  exclusions_text text,

  deemed_open   jsonb not null default '[]'::jsonb,
  unique (clause_id, key)
);

-- The tenants a test names, in the lease's own wording. Resolution to a
-- suite is deliberately separate and nullable: an unresolved name must
-- surface as not-computable, never be silently dropped, because
-- dropping it shrank the test to whoever happened to match and reported
-- the requirement as MET.
create table trigger_tenant (
  id            uuid primary key default gen_random_uuid(),
  trigger_id    uuid not null references clause_trigger(id) on delete cascade,
  lease_name    text not null,
  suite_id      uuid references suite(id) on delete set null,
  resolved_by   uuid references app_user(id),
  resolved_at   timestamptz,
  unique (trigger_id, lease_name)
);

-- Confirmed brand equivalences, so "lululemon = Lululemon Athletica" is
-- decided once and reused across the portfolio instead of asked per
-- center. Org-scoped rather than global: the lease's wording is the
-- client's, and promoting these to a shared book is a decision to take
-- deliberately, not by default.
create table tenant_alias (
  org_id        uuid not null references org(id) on delete cascade,
  -- Normalized lease name: case, punctuation and whitespace folded.
  -- Never fuzzy. "Zara" must not resolve to "Zara Beauty Bar".
  lease_name_norm text not null,
  suite_name    text not null,
  confirmed_by  uuid references app_user(id),
  confirmed_at  timestamptz not null default now(),
  primary key (org_id, lease_name_norm, suite_name)
);

create table entitlement (
  id            uuid primary key default gen_random_uuid(),
  clause_id     uuid not null references clause(id) on delete cascade,
  kind          text not null
                check (kind in ('occupancy_report', 'anchor_roster', 'failure_confirmation')),
  cite          text,
  body          text not null,
  frequency     text check (frequency in ('on_request', 'quarterly', 'annual')),
  response_days integer
);

-- ------------------------------------------------------------------
-- claims and notices
-- ------------------------------------------------------------------

-- Notice history is a client input. Without it every tripped location
-- reads as claimable even where relief has run for a year.
create table claim (
  id            uuid primary key default gen_random_uuid(),
  clause_id     uuid not null references clause(id) on delete cascade,
  first_observed_on date,
  notice_served_on  date,
  failed_preconditions text[] not null default '{}',
  unverified_preconditions text[] not null default '{}',
  created_at    timestamptz not null default now()
);

create table notice_package (
  id            uuid primary key default gen_random_uuid(),
  claim_id      uuid not null references claim(id) on delete cascade,
  -- We assemble; the client's authorized signatory serves. The state
  -- machine exists so that boundary is a record, not a promise.
  state         text not null default 'draft'
                check (state in ('draft', 'counsel_review', 'ready', 'served', 'withdrawn')),
  assembled_by  uuid references app_user(id),
  approved_by   uuid references app_user(id),
  served_on     date,
  document_url  text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index on notice_package (claim_id);

-- ------------------------------------------------------------------
-- alerting
-- ------------------------------------------------------------------

create table alert (
  id            uuid primary key default gen_random_uuid(),
  org_id        uuid not null references org(id) on delete cascade,
  location_id   uuid references location(id) on delete cascade,
  kind          text not null
                check (kind in ('condition_failing', 'trigger_reached', 'cure_expiring',
                                'election_window', 'near_miss', 'match_review', 'scan_failed')),
  severity      text not null default 'info'
                check (severity in ('info', 'attention', 'urgent')),
  body          text not null,
  raised_on     date not null,
  delivered_at  timestamptz,
  acknowledged_by uuid references app_user(id),
  acknowledged_at timestamptz
);

create index on alert (org_id, raised_on desc);
