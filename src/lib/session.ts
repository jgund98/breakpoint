/**
 * Demo workspace sign-in.
 *
 * IMPORTANT: this is a hardcoded demo credential so the workspace can
 * be walked through in a pitch. It is not authentication. There is no
 * user store, no hashing, no rate limiting and no per-account data.
 * Every sign-in lands in the same illustrative sample portfolio.
 *
 * Before a real customer touches this, replace it with proper auth
 * (SSO plus a session store) and delete this file. The routes it
 * protects are /app and /onboarding, gated in src/proxy.ts.
 */

export const SESSION_COOKIE = "bp_session";

/** Opaque marker. Carries no user identity because there are no users. */
export const SESSION_TOKEN = "demo-workspace-session-v1";

export const DEMO_EMAIL = "admin@gmail.com";
export const DEMO_PASSWORD = "password123";

/** The account the demo session presents as. */
export const DEMO_USER = {
  name: "R. Alvarez",
  initials: "RA",
  title: "Director, Lease Administration",
  /**
   * The demo signs in as the account owner so every workflow can be
   * walked end to end. Permissions are still checked against this
   * value rather than bypassed, so the separation of duties in
   * lib/team.ts stays real: change this to "counsel" and serving a
   * notice becomes unavailable, as it should be.
   */
  role: "owner",
  email: DEMO_EMAIL,
} as const;
