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
