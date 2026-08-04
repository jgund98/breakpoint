/**
 * Site lock. The whole site sits behind this until launch.
 *
 * The cookie carries a SHA-256 of password+salt, not the password
 * itself. This is a preview gate to keep the site private, not a
 * security boundary. To remove the lock: delete src/proxy.ts,
 * src/app/unlock and this file.
 */

export const GATE_COOKIE = "bp_access";

/** sha256("jordan123" + "breakpoint-gate") — precomputed. */
export const GATE_TOKEN =
  "e6d8d4d5557c63a0eb0913a1345b4b3b149f5ad3b20c9d1a28aae8abfb912e2a";

export const GATE_SALT = "breakpoint-gate";
export const GATE_PASSWORD = "jordan123";
