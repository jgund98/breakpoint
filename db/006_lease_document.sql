-- The papers behind a location: the lease, its amendments, estoppels.
--
-- Stored in the database for now. A 20-store pilot is a few dozen PDFs;
-- when portfolios reach hundreds of locations the bytes move to object
-- storage and this table keeps the metadata, which is why callers only
-- ever address documents by id and never assume where the bytes live.

create table if not exists lease_document (
  id            uuid primary key default gen_random_uuid(),
  org_slug      text not null,
  location_ref  text not null,
  kind          text not null default 'lease'
                check (kind in ('lease', 'amendment', 'estoppel', 'other')),
  filename      text not null,
  content_type  text not null default 'application/octet-stream',
  byte_size     integer not null check (byte_size > 0),
  bytes         bytea not null,
  note          text,
  uploaded_by   text,
  created_at    timestamptz not null default now()
);

create index if not exists lease_document_location_idx
  on lease_document (org_slug, location_ref, created_at desc);
