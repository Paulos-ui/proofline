import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

/**
 * The access model lives in SQL policies, which cannot be exercised without a live
 * Postgres instance. These tests assert the properties the migration must hold, so a
 * policy cannot be quietly weakened or dropped in a later edit.
 *
 * They are a guard, not a substitute for testing against a real database — see
 * LIMITATIONS.md.
 */
const migration = readFileSync(
  path.resolve(process.cwd(), "supabase", "migrations", "0001_init.sql"),
  "utf8",
);

const GATED_TABLES = [
  "cases",
  "artifacts",
  "entities",
  "entity_mentions",
  "events",
  "event_sources",
  "claims",
  "claim_sources",
  "relationships",
  "conflicts",
  "redaction_suggestions",
  "manifests",
  "audit_events",
];

describe("row level security", () => {
  it("enables row level security on every table that holds case data", () => {
    for (const table of GATED_TABLES) {
      expect(migration).toContain(`alter table public.${table} enable row level security`);
    }
  });

  it("ties case access to the signed-in owner", () => {
    expect(migration).toContain("for select using (auth.uid() = owner_id)");
    expect(migration).toContain("for insert with check (auth.uid() = owner_id)");
  });

  it("walks child rows back to the owning case rather than trusting their ids", () => {
    expect(migration).toMatch(/create or replace function public\.owns_case/);
    expect(migration).toMatch(/create or replace function public\.owns_artifact/);
    expect(migration).toContain("public.owns_case(case_id)");
    expect(migration).toContain("public.owns_artifact(artifact_id)");
  });

  it("gates the tables that hang off an artifact rather than a case", () => {
    for (const table of ["entity_mentions", "event_sources", "claim_sources", "redaction_suggestions"]) {
      expect(migration).toMatch(new RegExp(`case owners access ${table}[\\s\\S]{0,200}owns_artifact`));
    }
  });
});

describe("evidence storage", () => {
  it("creates the evidence bucket as private", () => {
    expect(migration).toMatch(/insert into storage\.buckets[\s\S]*'evidence',\s*\n\s*false/);
  });

  it("restricts objects to the owner's path prefix for read, write and delete", () => {
    for (const action of ["for select using", "for insert with check", "for delete using"]) {
      const policy = migration
        .split("\n")
        .find((line) => line.includes(action) && line.includes("bucket_id = 'evidence'"));
      expect(policy).toBeDefined();
      expect(policy).toContain("(storage.foldername(name))[1] = auth.uid()::text");
    }
  });

  it("constrains uploads to accepted media types and a size ceiling", () => {
    expect(migration).toContain("allowed_mime_types");
    expect(migration).toContain("26214400");
    expect(migration).not.toContain("application/x-msdownload");
  });
});

describe("data integrity constraints", () => {
  it("requires fingerprints to be well-formed sha-256 digests", () => {
    expect(migration).toContain("sha256 text not null check (sha256 ~ '^[0-9a-f]{64}$')");
  });

  it("refuses to store a timestamp alongside an unknown precision", () => {
    expect(migration).toContain("constraint events_time_consistent");
  });

  it("prevents the same file being registered twice in one case", () => {
    expect(migration).toContain("create unique index artifacts_case_hash_idx on public.artifacts (case_id, sha256)");
  });

  it("removes every child row when the case is deleted", () => {
    for (const table of ["artifacts", "entities", "events", "claims", "relationships", "conflicts", "manifests", "audit_events"]) {
      const definition = migration.slice(
        migration.indexOf(`create table public.${table} (`),
        migration.indexOf(`create index`, migration.indexOf(`create table public.${table} (`)),
      );
      expect(definition).toContain("references public.cases (id) on delete cascade");
    }
  });
});
