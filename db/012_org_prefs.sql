-- 012: alert routing becomes org policy on the record, not browser
-- state. Stored as validated jsonb on org_settings; edited by
-- owner/admin; the in-app bell enforces the inApp channel now, email
-- and SMS activate when a delivery channel is connected.
alter table org_settings add column if not exists alert_routing jsonb;
