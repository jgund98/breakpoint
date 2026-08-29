-- 013: invitations carry the invitee's name and title so the join page
-- greets a person, not an email address.
alter table invitation add column if not exists name text;
alter table invitation add column if not exists title text;
