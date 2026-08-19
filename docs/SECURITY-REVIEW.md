# Security review

A pass over the surfaces that matter for a product holding other people's evidence. Each item states what was checked and what the code actually does.

| Surface | Finding |
| --- | --- |
| Unrestricted upload endpoints | `POST /api/cases/:id/artifacts` requires a session, confirms the case is reachable under RLS, enforces a 25 MB cap, checks the extension against the declared type, and verifies magic bytes so a renamed binary cannot pass as text. |
| Client-exposed secrets | Only `NEXT_PUBLIC_*` values reach the browser. `SUPABASE_SECRET_KEY` and `ANTHROPIC_API_KEY` are read in server modules only; `createServiceSupabase` is never imported from a `"use client"` file. Verified by inspecting the built client chunks. |
| Missing auth checks | Every `/api/cases/**` handler calls `requireUser()` and returns 401 before touching data. `middleware.ts` additionally redirects `/dashboard` and `/case/**` when unauthenticated. |
| Weak RLS | RLS is enabled on all 13 tables. Child tables are gated by `owns_case()` / `owns_artifact()`, which walk back to `cases.owner_id`. A leaked child-row id is not sufficient to read anything. |
| Insecure object URLs | The `evidence` bucket is private. Access is only ever via signed URLs with a 300-second expiry, generated per render. |
| Overly long signed URLs | Five minutes, set in one place (`supabaseConfig().signedUrlSeconds`). |
| Accidental public storage | The bucket is created with `public = false` in the migration, with an allow-list of MIME types and a server-side size limit. |
| Path traversal | Storage keys are `{userId}/{caseId}/{artifactId}` — built from ids, never from user input. `safeFilename()` sanitises the display name separately; it is not used for addressing. |
| Direct object ownership flaws | Storage policies check that the first path segment equals `auth.uid()`, so the bucket enforces ownership independently of the application. |
| Oversized file abuse | Enforced in three places: client validation, server validation, and the bucket's own `file_size_limit`. Batch size is capped at 40 files. |
| Unvalidated AI JSON | Provider output is parsed with Zod before it can reach the database. A failure discards the whole analysis rather than keeping part of it. Locator ownership is asserted separately, so an analysis referencing another artifact is rejected. |
| SSRF-like URL ingestion | Not possible: there is no remote-URL ingestion path. Uploads are file-only, by design, for exactly this reason. |
| Unsafe rendered HTML | No `dangerouslySetInnerHTML` anywhere in the codebase. Artifact text is rendered as text nodes. |
| Duplicate/replay uploads | A unique index on `(case_id, sha256)` rejects identical bytes within a case and returns a pointer to the existing artifact. |
| Transport integrity | The server recomputes SHA-256 from the bytes it received and rejects a mismatch with the client's hash. |
| Orphaned data | A failed storage upload deletes the artifact row. Case deletion removes stored objects first and fails loudly rather than leaving evidence behind with no record. |
| Chain data leakage | `assertMemoIsSafe()` rejects any memo that is not exactly `proofline:v1:<64 hex>`, so no case content can reach a public chain. Covered by tests. |
| Audit scope | `audit_events` records product activity (uploaded, processed, anchored). It does not record viewing. |

## Accepted risks

- **No end-to-end encryption.** The server must read evidence in order to analyse it. This is stated in `/privacy` and in `LIMITATIONS.md` rather than papered over.
- **Model provider exposure.** Processing sends artifacts to the configured provider. Disclosed in `/privacy` and `DISCLOSURES.md`.
- **Service-role usage.** Storage reads and writes use the service role after the handler has already confirmed ownership through the user-scoped client. The alternative — signed upload URLs issued to the browser — would remove server-side hash verification, which is a worse trade for this product.
