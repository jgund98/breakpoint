/**
 * 017 — permission levels inside Breakpoint.
 *
 * platform_admin stays the console door; staff_role says what you can
 * do once inside:
 *   admin     everything, including the roster, client lifecycle, and
 *             system-wide programming
 *   operator  works the queues (requests, extraction, scans, board
 *             edits) but cannot manage people or clients
 *   observer  reads the console, writes nothing
 * Existing internal accounts predate the ladder and were full access;
 * they become admins, which changes nothing for them.
 */
alter table app_user add column if not exists staff_role text;
update app_user set staff_role = 'admin' where platform_admin = true and staff_role is null;
alter table app_user drop constraint if exists app_user_staff_role_check;
alter table app_user add constraint app_user_staff_role_check
  check (staff_role is null or staff_role in ('admin', 'operator', 'observer'));
