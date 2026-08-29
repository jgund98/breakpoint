/**
 * 016 — internal staff accounts become manageable, and an org can run
 * in demo mode.
 *
 * disabled_at: an internal person who leaves keeps their history but
 * loses the door. Checked at sign-in; their live sessions are revoked
 * when the switch is thrown.
 *
 * demo_mode: a workspace used for walkthroughs. While on, every
 * sign-in to that org restores the pristine evaluated state: worked
 * flags, filed requests, notice workflow stages, notifications, and
 * demo uploads are cleared, and the certified engine regenerates the
 * real positions on the next load. Nothing is invented; the data shown
 * is exactly what the evaluation produces.
 */
alter table app_user add column if not exists disabled_at timestamptz;
alter table org_settings add column if not exists demo_mode boolean not null default false;
