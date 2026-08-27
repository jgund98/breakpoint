-- What the AI agent is told, and by whom.
--
-- Claude is not trained per client; it is programmed per run. The
-- program is assembled from two layers of directives kept here:
--
--   scope 'global'     Breakpoint-wide logic. The laws the pilot taught
--                      us live in code where they are enforceable; what
--                      lives HERE is judgment the agent should carry
--                      into extraction and scan reasoning ("an
--                      amendment can suspend a clause entirely; always
--                      look for one", "never match tenant names
--                      fuzzily").
--   scope <org_slug>   one client's specifics ("Hollister and Gilly
--                      Hicks are affiliate brands of this tenant",
--                      "this client's exports name centers by their
--                      internal code").
--
-- Every agent run assembles global + org, in order, into its system
-- prompt. Editable from operations, so tuning the agent is a row edit
-- and not a deploy.

create table agent_directive (
  id          uuid primary key default gen_random_uuid(),
  scope       text not null default 'global',
  topic       text not null default 'general'
              check (topic in ('general', 'extraction', 'scanning', 'matching', 'notices')),
  body        text not null,
  active      boolean not null default true,
  sort        integer not null default 100,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index on agent_directive (scope, active, sort);
