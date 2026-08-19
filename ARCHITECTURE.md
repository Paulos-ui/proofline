# Architecture

## The organising decision

The model reads **one artifact at a time** and never sees the whole case.

Everything that spans artifacts — chronology, identity resolution, disagreement between sources, sensitive-value patterns, hashing, the Merkle tree — is ordinary deterministic software with unit tests.

This is the load-bearing decision in the system. The parts that could quietly fabricate a conclusion ("these two people are the same", "this contradicts that", "this happened before that") are precisely the parts a model does not touch. It also means the demonstration case can exercise the real engines with a stored extraction: the interesting logic is not in the model call.

## Layers

```
app/                    routes: marketing, auth, demo, workspace, API handlers
components/             presentation only; no domain logic
lib/
  schemas/              Zod contracts — locator, extraction, persisted case model
  ai/                   provider adapters, prompt, JSON schema, config
  evidence/             upload validation, case computation, persistence
  entities/             conservative identity resolution
  timeline/             chronology and precision-aware formatting
  conflicts/            claim comparison and classification
  privacy/              deterministic sensitive-value detection
  integrity/            SHA-256, Merkle tree, manifest build and verify
  solana/               optional public anchor with a memo-shape guard
  supabase/             clients, queries, config
fixtures/demo-case/     seeded analysis + built bundle
supabase/migrations/    schema, RLS policies, storage bucket
tests/                  unit, integration, e2e
```

`lib/` never imports from `components/`. `components/` never contains business rules. A rule that matters is testable without a browser.

## Request flow: adding evidence

1. **Browser** validates the file (type, extension agreement, size), then computes SHA-256 with Web Crypto, reporting progress.
2. **POST `/api/cases/:id/artifacts`** re-validates, including a magic-byte check so a renamed binary cannot pass as text, and **recomputes the hash from the bytes it received**. A disagreement with the client's hash rejects the upload — nothing is stored.
3. Duplicate bytes within the same case are rejected with a pointer to the existing artifact.
4. The row is inserted first, the object is uploaded to `{userId}/{caseId}/{artifactId}`, then the row is updated with the path. If storage fails the row is deleted, because a row with no bytes behind it is worse than no row.

## Request flow: processing

`POST /api/cases/:id/process`

For each artifact:

- Audio → transcription adapter → locatable transcript text. If no service is configured the artifact is marked **needs review**, never "analysed".
- Text and email → decoded directly.
- Images and PDFs → base64 to the vision-capable model.

The model is called with a tool whose `input_schema` is the analysis JSON Schema, and `tool_choice` pinned to that tool, so the response is a typed object rather than prose. The result is then re-validated with Zod, because a provider honouring a schema is a strong hint rather than a guarantee. Locator ownership is asserted separately.

**Failure is per artifact.** One unreadable screenshot marks that artifact failed with a reason and the batch continues.

Afterwards `computeCase()` runs the deterministic engines over all analyses, `persistComputation()` replaces the derived tables wholesale (so a re-run leaves no orphans), and a fresh manifest is built over every stored artifact — analysed or not.

## Data model

`cases` owns everything. Every child table is reachable only by walking back to `cases.owner_id`.

Polymorphic locators and provider metadata are stored as `jsonb`; normalising a five-shape union into columns would make the schema rigid without buying anything, since locators are always read as a whole.

One constraint worth calling out:

```sql
constraint events_time_consistent check (
  (occurred_at is null and time_precision = 'unknown')
  or (occurred_at is not null and time_precision <> 'unknown')
)
```

An event with a timestamp but unknown precision is a contradiction, and the database refuses to store one. The product rule is enforced at the lowest level available, not only in application code.

## Security model

- **RLS on every table.** Two `security definer` helpers (`owns_case`, `owns_artifact`) keep each policy to one line and auditable in one place.
- **Private bucket.** No public URLs for evidence, ever. The workspace requests five-minute signed URLs per render.
- **Storage keys are built from ids**, never from filenames, so a crafted filename cannot escape a prefix.
- **Service role key is server-only**, used for storage operations after the handler has already confirmed ownership through the user-scoped client. It is never imported into a `"use client"` module.
- **Uploads are file-only.** There is no remote-URL ingestion, which removes an SSRF surface entirely.
- **The anchor memo is shape-checked** against `proofline:v1:<64 hex>` before publication, so case content cannot reach a public chain even by mistake.

## Design system

Two surfaces, one language. Editorial pages sit on mineral paper; the evidence workspace sits on archival ink, applied as a `.surface-ink` class over a subtree rather than a global theme toggle. Semantic tokens (`--evidence`, `--verified`, `--conflict`, `--trace`) carry meaning, so status is never a raw colour choice made in a component.

The **trace** is the one structural device: section divider, timeline spine, workspace navigation, verification glyph, brand mark. Navigation in the workspace *is* the trace — a line with a node per mode — rather than a sidebar added because dashboards usually have one.

Status is never communicated by colour alone: every pill carries a text label and a distinct marker shape.

## Motion

Motion is used where it encodes something: artifacts settling into an ordered intake, the trace drawing through chronological nodes, a fingerprint resolving character by character during hashing, two claim traces converging around a conflict marker. `prefers-reduced-motion` is respected globally, and the reduced state always shows the resolved information immediately — ordering is information and must not depend on an animation running.

## Testing strategy

| Area | Approach |
| --- | --- |
| Integrity | Published SHA-256 vectors; Merkle determinism, order sensitivity, domain separation, inclusion proofs; manifest tamper detection |
| Extraction | Schema acceptance and rejection; locator ownership; unknown times stay unknown |
| Timeline | Ordering, banding, precision-aware formatting, undated events kept out of chronology |
| Entities | Exact merges, refusal to merge similar names, cross-type damping, confidence cap |
| Conflicts | Candidate gating, group-aware status comparison, amount differences, language assertions that no output accuses anyone |
| Privacy | Luhn gating, overlap resolution, determinism, redaction applied only to accepted items |
| Upload | Extension/type agreement, magic bytes, traversal-safe names |
| Demo case | Real files rehashed from disk, manifest reproducible, every locator points at a real artifact, bboxes in range |
| E2E | Landing → demo → timeline → source → conflict → graph → verify match → verify mismatch → proof pack |
