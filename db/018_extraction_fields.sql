/**
 * 018 — the extraction schema becomes operations data.
 *
 * The expert handed us the exact fields a lease abstraction must
 * capture (the gold-set schema). Those fields were frozen in code;
 * this table makes the CAPTURE CHECKLIST editable from the console, so
 * refining what the agent looks for is a row edit and not a deploy.
 *
 * The structural JSON contract the extractor VALIDATES against stays
 * in code where it is enforceable; these rows steer what the model is
 * told to hunt for, field by field, in the expert's own words.
 */
create table if not exists extraction_field (
  id          uuid primary key default gen_random_uuid(),
  field_key   text not null unique,
  label       text not null,
  instruction text not null,
  category    text not null default 'clause'
              check (category in ('identity', 'trigger', 'remedy', 'preconditions', 'status', 'review')),
  required    boolean not null default false,
  active      boolean not null default true,
  sort        integer not null default 100,
  /** where the field came from: expert-goldset | round-2 | ops */
  source      text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists extraction_field_order on extraction_field (active, category, sort);
