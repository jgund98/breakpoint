-- 011: the notice workflow becomes a system of record.
--
-- The staged package lifecycle (assembled -> counsel review ->
-- approved -> served) lived in the browser's localStorage. A workflow
-- whose audit trail a landlord's counsel will attack cannot live in a
-- browser. One row per (org, location); transitions are permission-
-- checked server-side and audited.

create table if not exists notice_workflow (
  org_slug     text not null,
  location_ref text not null,
  stage        text not null default 'not_started'
               check (stage in ('not_started','assembled','counsel_review','approved','served','declined')),
  reason       text,
  served_on    date,
  updated_by   text,
  updated_at   timestamptz not null default now(),
  primary key (org_slug, location_ref)
);

-- The separation of duties needs its own lanes: legal reviews, a
-- signatory serves. Widen the membership role set additively (the
-- original five remain valid).
alter table membership drop constraint if exists membership_role_check;
alter table membership add constraint membership_role_check
  check (role in ('owner','admin','analyst','counsel','viewer','real_estate','lease_admin','signatory'));

alter table invitation drop constraint if exists invitation_role_check;
alter table invitation add constraint invitation_role_check
  check (role in ('owner','admin','analyst','counsel','viewer','real_estate','lease_admin','signatory'));
