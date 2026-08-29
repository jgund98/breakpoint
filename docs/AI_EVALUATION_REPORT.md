# AI EVALUATION REPORT

The intelligence is a traceable pipeline, and the deterministic layer is
authoritative for every number. Generated prose never becomes a
calculation (BRAIN §3, canon directive: figures only from given data).

## Harnesses and current results (2026-08-28)
| Harness | Ground truth | Result |
|---|---|---|
| scripts/af-score.ts | Round-1 answer key (Desktop, 20 centers, 480 monthly cells) | 480/480 monthly · 7/7 first-fail · 7/7 trigger · 89/89 money |
| scripts/af2-engine.ts + af2-score.ts | Round-2 answer key (Desktop, 65 malls) via the PRODUCT engine src/lib/timeline.ts | 1040/1040 monthly · 65/65 end states · 26/26 triggers · 26/26 notices · 26/26 remedy starts · money within rounding of $7,345,600 |
| scripts/extract-clause.ts | Partner gold set (lib/goldset) | Builds canon-driven prompt; calls + self-scores only when ANTHROPIC_API_KEY present |
| scripts/db-loop-probe.mjs | Live write-paths | 41/41 |

Blind protocol: predictions are frozen by git commit BEFORE any key is
opened (round-2 blind: commit a95e74b — 1027/1040, 60/65, 17/26; every
miss diagnosed and codified in BRAIN "Round-2 lessons"). Answer keys
never enter the repo.

## Layering
1. Deterministic: timeline.ts / clause.ts (dates, clocks, money,
   states), lib/theo.ts router (every figure), notice-letter.ts,
   findings.ts (briefs, flags).
2. Model (Anthropic provider, keyed on env): Theo prose polish
   (route-level hard rules: cited figures only, MAY-language, no legal
   advice, 20s timeout, fail→engine ships alone) and extraction
   (canon-assembled prompt, gold-set self-scoring).
3. Documents are untrusted data: extraction prompts instruct against
   instruction-following from lease text; nothing a document says can
   trigger a write-path (tasks come only from the signed-in user).

## Feedback capture
User corrections land as versioned rows (agent_directive edits are
scoped and audited; extraction approvals via location_pipeline). A
change to engine rules must re-run BOTH key harnesses before merge —
that is the regression gate.
