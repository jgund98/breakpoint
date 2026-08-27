-- The org table becomes the client registry the admin surface trusts.
--
-- Before this, /admin knew exactly one hardcoded client. Now every
-- client is a row: HQ lists them, a board exists per slug, and an
-- onboarding submission can be promoted into a new org before any
-- portfolio data exists ("onboarding" status until the roster is
-- imported and scans begin).

alter table org add column if not exists status text not null default 'live';
alter table org add column if not exists descriptor text;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'org_status_check'
  ) then
    alter table org add constraint org_status_check
      check (status in ('onboarding', 'live', 'paused'));
  end if;
end $$;

-- The pilot. Idempotent: re-running migrations must not duplicate it.
insert into org (name, slug, status, descriptor)
values ('Abercrombie & Fitch', 'abercrombie-fitch', 'live', 'Specialty apparel')
on conflict (slug) do update
  set status = 'live',
      descriptor = excluded.descriptor;
