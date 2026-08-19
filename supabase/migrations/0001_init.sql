-- Proofline schema.
--
-- Access model: a user reaches a case only through cases.owner_id. Every child table
-- is gated by a policy that walks back to that owner, so a leaked child-row id is not
-- enough to read anything. Evidence bytes live in a private bucket reached only
-- through short-lived signed URLs.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------- enums

create type processing_status as enum (
  'queued', 'hashing', 'uploaded', 'analyzing', 'extracted', 'needs-review', 'failed'
);
create type case_status as enum ('draft', 'processing', 'ready', 'archived');
create type time_precision as enum ('exact', 'minute', 'hour', 'day', 'inferred', 'unknown');
create type conflict_classification as enum (
  'compatible', 'potentially-inconsistent', 'unresolved', 'insufficient-evidence'
);
create type redaction_decision as enum ('pending', 'redact', 'keep', 'ignored');

-- ---------------------------------------------------------------- cases

create table public.cases (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  ref text not null,
  title text not null check (char_length(title) between 1 and 200),
  description text,
  status case_status not null default 'draft',
  incident_timezone text not null default 'UTC',
  merkle_root text check (merkle_root ~ '^[0-9a-f]{64}$'),
  anchor_signature text,
  anchor_network text,
  anchored_at timestamptz,
  last_processed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index cases_owner_idx on public.cases (owner_id, updated_at desc);
create unique index cases_ref_idx on public.cases (ref);

-- ---------------------------------------------------------------- artifacts

create table public.artifacts (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.cases (id) on delete cascade,
  filename text not null,
  mime_type text not null,
  byte_size bigint not null check (byte_size >= 0),
  storage_path text not null,
  sha256 text not null check (sha256 ~ '^[0-9a-f]{64}$'),
  processing_status processing_status not null default 'queued',
  kind text,
  summary text,
  failure_reason text,
  -- dimensions, transcript, detected language and provider metadata
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index artifacts_case_idx on public.artifacts (case_id, created_at);
-- The same bytes may legitimately be uploaded to different cases, but not twice to one.
create unique index artifacts_case_hash_idx on public.artifacts (case_id, sha256);

-- ---------------------------------------------------------------- entities

create table public.entities (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.cases (id) on delete cascade,
  type text not null,
  canonical_name text not null,
  aliases text[] not null default '{}',
  confidence real not null check (confidence between 0 and 1),
  resolution text not null default 'unresolved',
  metadata jsonb not null default '{}'::jsonb
);

create index entities_case_idx on public.entities (case_id);

create table public.entity_mentions (
  id uuid primary key default gen_random_uuid(),
  entity_id uuid not null references public.entities (id) on delete cascade,
  artifact_id uuid not null references public.artifacts (id) on delete cascade,
  locator jsonb not null,
  surface_text text not null,
  confidence real not null check (confidence between 0 and 1)
);

create index entity_mentions_entity_idx on public.entity_mentions (entity_id);
create index entity_mentions_artifact_idx on public.entity_mentions (artifact_id);

-- ---------------------------------------------------------------- events

create table public.events (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.cases (id) on delete cascade,
  title text not null,
  description text not null default '',
  occurred_at timestamptz,
  occurred_at_end timestamptz,
  time_precision time_precision not null default 'unknown',
  confidence real not null check (confidence between 0 and 1),
  entity_ids uuid[] not null default '{}',
  needs_review boolean not null default false,
  -- An event with a timestamp but unknown precision is a contradiction we refuse to store.
  constraint events_time_consistent check (
    (occurred_at is null and time_precision = 'unknown')
    or (occurred_at is not null and time_precision <> 'unknown')
  )
);

create index events_case_time_idx on public.events (case_id, occurred_at nulls last);

create table public.event_sources (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id) on delete cascade,
  artifact_id uuid not null references public.artifacts (id) on delete cascade,
  locator jsonb not null,
  excerpt text not null default ''
);

create index event_sources_event_idx on public.event_sources (event_id);

-- ---------------------------------------------------------------- claims

create table public.claims (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.cases (id) on delete cascade,
  event_id uuid references public.events (id) on delete set null,
  text text not null,
  speaker_or_source text,
  normalized_data jsonb not null default '{}'::jsonb,
  confidence real not null check (confidence between 0 and 1)
);

create index claims_case_idx on public.claims (case_id);

create table public.claim_sources (
  id uuid primary key default gen_random_uuid(),
  claim_id uuid not null references public.claims (id) on delete cascade,
  artifact_id uuid not null references public.artifacts (id) on delete cascade,
  locator jsonb not null,
  excerpt text not null default ''
);

create index claim_sources_claim_idx on public.claim_sources (claim_id);

-- ---------------------------------------------------------------- relationships

create table public.relationships (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.cases (id) on delete cascade,
  source_entity_id uuid not null references public.entities (id) on delete cascade,
  target_entity_id uuid not null references public.entities (id) on delete cascade,
  type text not null,
  label text,
  confidence real not null check (confidence between 0 and 1),
  supporting_sources jsonb not null default '[]'::jsonb
);

create index relationships_case_idx on public.relationships (case_id);

-- ---------------------------------------------------------------- conflicts

create table public.conflicts (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.cases (id) on delete cascade,
  classification conflict_classification not null,
  explanation text not null,
  confidence real not null check (confidence between 0 and 1),
  claim_a_id uuid not null references public.claims (id) on delete cascade,
  claim_b_id uuid references public.claims (id) on delete cascade,
  dimension text not null default 'other',
  supporting_sources jsonb not null default '[]'::jsonb
);

create index conflicts_case_idx on public.conflicts (case_id, classification);

-- ---------------------------------------------------------------- privacy

create table public.redaction_suggestions (
  id uuid primary key default gen_random_uuid(),
  artifact_id uuid not null references public.artifacts (id) on delete cascade,
  category text not null,
  locator jsonb not null,
  preview text not null,
  confidence real not null check (confidence between 0 and 1),
  detector text not null default 'pattern',
  decision redaction_decision not null default 'pending'
);

create index redactions_artifact_idx on public.redaction_suggestions (artifact_id);

-- ---------------------------------------------------------------- manifests

create table public.manifests (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.cases (id) on delete cascade,
  version text not null default '1',
  manifest jsonb not null,
  merkle_root text not null check (merkle_root ~ '^[0-9a-f]{64}$'),
  created_at timestamptz not null default now()
);

create index manifests_case_idx on public.manifests (case_id, created_at desc);

-- ---------------------------------------------------------------- audit

-- Product activity only: what happened to a case, not who looked at what.
create table public.audit_events (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.cases (id) on delete cascade,
  actor_id uuid references auth.users (id) on delete set null,
  action text not null,
  detail jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index audit_case_idx on public.audit_events (case_id, created_at desc);

-- ---------------------------------------------------------------- row level security

alter table public.cases enable row level security;
alter table public.artifacts enable row level security;
alter table public.entities enable row level security;
alter table public.entity_mentions enable row level security;
alter table public.events enable row level security;
alter table public.event_sources enable row level security;
alter table public.claims enable row level security;
alter table public.claim_sources enable row level security;
alter table public.relationships enable row level security;
alter table public.conflicts enable row level security;
alter table public.redaction_suggestions enable row level security;
alter table public.manifests enable row level security;
alter table public.audit_events enable row level security;

create policy "owners read their cases" on public.cases
  for select using (auth.uid() = owner_id);
create policy "owners create cases" on public.cases
  for insert with check (auth.uid() = owner_id);
create policy "owners update their cases" on public.cases
  for update using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
create policy "owners delete their cases" on public.cases
  for delete using (auth.uid() = owner_id);

-- Helper keeps every child policy identical and auditable in one place.
create or replace function public.owns_case(target uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.cases c where c.id = target and c.owner_id = auth.uid());
$$;

create or replace function public.owns_artifact(target uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.artifacts a
    join public.cases c on c.id = a.case_id
    where a.id = target and c.owner_id = auth.uid()
  );
$$;

do $$
declare
  t text;
begin
  foreach t in array array['artifacts','entities','events','claims','relationships','conflicts','manifests','audit_events']
  loop
    execute format(
      'create policy "case owners access %1$s" on public.%1$I for all using (public.owns_case(case_id)) with check (public.owns_case(case_id))',
      t
    );
  end loop;
end $$;

create policy "case owners access entity_mentions" on public.entity_mentions
  for all using (public.owns_artifact(artifact_id)) with check (public.owns_artifact(artifact_id));
create policy "case owners access event_sources" on public.event_sources
  for all using (public.owns_artifact(artifact_id)) with check (public.owns_artifact(artifact_id));
create policy "case owners access claim_sources" on public.claim_sources
  for all using (public.owns_artifact(artifact_id)) with check (public.owns_artifact(artifact_id));
create policy "case owners access redaction_suggestions" on public.redaction_suggestions
  for all using (public.owns_artifact(artifact_id)) with check (public.owns_artifact(artifact_id));

-- ---------------------------------------------------------------- storage

-- Private bucket. No public URLs are ever issued for evidence.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'evidence',
  'evidence',
  false,
  26214400,
  array['image/png','image/jpeg','image/webp','application/pdf','text/plain','message/rfc822','audio/wav','audio/mpeg','audio/mp4','audio/webm','audio/ogg']
)
on conflict (id) do nothing;

-- Objects are stored at {user_id}/{case_id}/{artifact_id}, so ownership is the path prefix.
create policy "owners read their evidence" on storage.objects
  for select using (bucket_id = 'evidence' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "owners upload their evidence" on storage.objects
  for insert with check (bucket_id = 'evidence' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "owners delete their evidence" on storage.objects
  for delete using (bucket_id = 'evidence' and (storage.foldername(name))[1] = auth.uid()::text);

-- ---------------------------------------------------------------- triggers

create or replace function public.touch_case()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

create trigger cases_touch before update on public.cases
  for each row execute function public.touch_case();
