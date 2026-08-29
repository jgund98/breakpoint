-- 014: the document ingestion pipeline as a record.
--
-- A document arrives (client upload or ops), its text is extracted
-- page by page, an extraction job runs it through the provider (the
-- Anthropic model when a key exists, the deterministic mock without),
-- and the structured result — with citations back into the pages, a
-- confidence score, and the prompt/model version that produced it —
-- is routed: high confidence proposes straight to the watch pipeline,
-- anything under the review threshold waits for a person on the
-- extraction desk. Every step is a row; nothing happens off the
-- record.

alter table lease_document add column if not exists status text not null default 'stored'
  ;
-- stored -> text_extracted -> queued/extracting handled on the job

create table if not exists document_text (
  document_id  uuid not null references lease_document(id) on delete cascade,
  page         integer not null,
  text         text not null,
  primary key (document_id, page)
);

create table if not exists extraction_job (
  id            serial primary key,
  org_slug      text not null,
  document_id   uuid references lease_document(id) on delete set null,
  location_ref  text not null,
  status        text not null default 'queued'
                check (status in ('queued','extracting','review','proposed','approved','rejected','failed')),
  provider      text,                 -- 'anthropic' | 'mock'
  model         text,
  prompt_version text,
  trace_id      text,
  confidence    real,
  /** The structured clause record the provider produced. */
  result        jsonb,
  /** Page-anchored quotes supporting each extracted field. */
  citations     jsonb,
  /** Versioned human corrections, appended, never overwritten. */
  corrections   jsonb,
  tokens_in     integer,
  tokens_out    integer,
  error         text,
  created_by    text,
  reviewed_by   text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index if not exists extraction_job_org on extraction_job (org_slug, status, created_at desc);
