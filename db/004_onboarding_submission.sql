-- What a client's onboarding actually sends us, kept whole.
--
-- The console assembles the roster, the record answers, the delivery
-- routes, the people. Submitting writes the entire state here as one
-- document, because the team sets an account up FROM this: it is the
-- work order. Normalizing it into org/center/location happens as part
-- of setup, deliberately after a person has looked at it, not on the
-- way in.

create table onboarding_submission (
  id             uuid primary key default gen_random_uuid(),
  org_slug       text not null,
  client_name    text not null,
  store_estimate integer,
  row_count      integer,
  payload        jsonb not null,
  submitted_at   timestamptz not null default now(),
  processed_at   timestamptz,
  processed_by   text
);

create index on onboarding_submission (org_slug, submitted_at desc);
