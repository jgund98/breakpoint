-- 010: real authentication. Additive only.
--
-- app_user and membership exist since 001 (roles constraint-checked:
-- owner/admin/analyst/counsel/viewer). This adds credentials, platform
-- staff, database-backed sessions, and invitations.

alter table app_user add column if not exists password_hash text;
alter table app_user add column if not exists title text;
alter table app_user add column if not exists platform_admin boolean not null default false;

-- Opaque-token sessions. The edge proxy only checks cookie shape;
-- every server operation resolves the token here.
create table if not exists auth_session (
  token       text primary key,
  user_id     uuid not null references app_user(id) on delete cascade,
  org_id      uuid references org(id) on delete set null,
  created_at  timestamptz not null default now(),
  last_seen   timestamptz not null default now(),
  expires_at  timestamptz not null
);
create index if not exists auth_session_user on auth_session (user_id);
create index if not exists auth_session_expiry on auth_session (expires_at);

create table if not exists invitation (
  id          serial primary key,
  org_id      uuid not null references org(id) on delete cascade,
  email       citext not null,
  role        text not null
              check (role in ('owner', 'admin', 'analyst', 'counsel', 'viewer')),
  token       text not null unique,
  invited_by  uuid references app_user(id),
  created_at  timestamptz not null default now(),
  expires_at  timestamptz not null,
  accepted_at timestamptz
);
create index if not exists invitation_org on invitation (org_id);
