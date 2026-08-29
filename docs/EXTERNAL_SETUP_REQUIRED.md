# EXTERNAL SETUP REQUIRED

Everything here works through a mock or degrades honestly without the
credential. Nothing blocks the build.

| Dependency | Env var | Without it | To enable |
|---|---|---|---|
| Anthropic API (Theo model layer, extraction runner) | `ANTHROPIC_API_KEY` | Theo answers from the deterministic index engine (badge says "Index"); extract-clause writes the prompt to shots/ and scores nothing | Add the key in Vercel + .env.local. Models: `THEO_MODEL` (default claude-fable-5), `EXTRACTION_MODEL` (default claude-opus-5) |
| Google Places (storefront status pings) | `GOOGLE_PLACES_API_KEY` | Place ids are stored/managed in location_config; no live pings. /admin/system shows key absent | Add the key; build the ping job (gap #7) |
| Email (magic links, client alerts) | `BREVO_API_KEY` | No sends. Auth uses passwords; alerts are in-app only. Mock delivery = notification rows | Add key; wire notify() fan-out |
| SMS | none configured | Not represented in client UI | n/a |
| File storage (Vercel Blob) | store connection | Lease documents store bytes in Postgres (4 MB cap); callers address by id so the Blob move touches one file | Connect a Blob store in Vercel dashboard |

DB: `DATABASE_URL` (Neon) is already provisioned via Vercel env pull.
Site lock and demo credentials are in src/lib/gate.ts and the seed
script — rotate before public launch.


## SSO (SAML / OIDC)
The login page offers "Continue with SSO" as an honest explainer (no dead button: it states SSO is provisioned per workspace once an IdP is connected). To make it real: pick an SSO broker (WorkOS or Auth.js with SAML), add per-org IdP config (issuer, cert, ACS URL) to org_settings, and exchange the assertion for an auth_session row (createSession in lib/auth.ts is the only integration point). No UI work is blocked on this.

## Billing (Stripe)
The Account tab computes the fee honestly from lib/value.ts (per-door rate x watched doors, with the annual floor) — THE RATE CARD IS A PLACEHOLDER pending the real pricing decision. To make billing real: create Stripe products per plan, store stripe_customer_id on org, and issue invoices from the admin Account card. Amounts shown to clients must keep coming from the same computed contract object so the UI and the invoice can never disagree.