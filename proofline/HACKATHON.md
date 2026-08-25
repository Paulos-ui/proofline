# Proof of Possible 2026 — submission notes

> Sections marked **[EDIT]** need your personal submission details. Nothing about team members or contributions has been invented.

## Project name

Proofline

## Tagline

Scattered evidence. One traceable story.

## Problem

When something goes wrong online, a marketplace purchase, a payment dispute, an impersonated account, a harassment incident, the evidence already exists. It is scattered across a phone, an inbox, a downloads folder and a chat export.

Making sense of it means ordering it in time, spotting where two sources disagree, and being able to point at the exact line behind every statement. That work is slow, easy to get wrong, and it decides whether anyone takes the account seriously. It is also the part where a confident AI summary does the most damage: a fluent paragraph you cannot check is worse than no paragraph at all.

## Intended user

A student, freelancer, buyer, seller, creator or ordinary internet user trying to organise a confusing digital incident whose evidence spans several file types. Not a legal team with case-management software.

## Solution

Proofline is an evidence workspace. It reads each artifact separately, builds a chronology in which every event points back at the region of the artifact supporting it, shows where two sources describe the same thing differently, flags sensitive values before anything is exported, and fingerprints every file so you can tell later whether a copy has changed.

The principle it is built around: **AI may help organise the story. The evidence must remain inspectable.**

## How it works

1. **Upload** — validated in the browser and again on the server, where the declared type is checked against the file's actual byte signature.
2. **Hash** — SHA-256 computed in the browser before upload; the server recomputes from the bytes it received and rejects a disagreement.
3. **Understand** — each artifact is analysed on its own against a strict tool schema. Audio goes through a transcription adapter first.
4. **Structure** — the response is re-validated with Zod. Anything that does not parse is discarded whole rather than partially trusted.
5. **Connect** — identity resolution merges exact identifiers and *proposes* matches for similar names.
6. **Compare** — claims about the same subject are compared one dimension at a time to surface differences.
7. **Verify** — fingerprints are combined into a Merkle root anyone can check without an account.

## Technical architecture

The load-bearing decision: **the model reads one artifact at a time and never sees the whole case.** Everything that spans artifacts — chronology, identity resolution, disagreement detection, sensitive-pattern matching, hashing, the Merkle tree — is deterministic software with unit tests.

That is what makes the output inspectable rather than merely plausible: the parts that could quietly fabricate a conclusion are the parts a model does not touch.

Full detail in [ARCHITECTURE.md](ARCHITECTURE.md).

## Technologies

Next.js 16 (App Router), React 19, TypeScript in strict mode, Tailwind CSS v4 with a bespoke token system, Motion, Zod 4, Supabase (Postgres, Auth, private Storage, row level security), the Anthropic SDK with tool-schema structured output, Web Crypto, optional `@solana/kit` + `@solana-program/memo` on devnet, Vitest, Playwright.

## What was built during the hackathon

Everything in this repository. It was started from an empty directory; no code was carried over from any earlier project.

- Complete design system: colour tokens, type scale, the trace motif, an original SVG mark, and every component. No UI kit or template.
- Landing page whose hero demonstrates the product rather than describing it, plus About, Documentation, Privacy and Limitations as authored editorial pages.
- The case workspace: overview, evidence, timeline, connections, conflicts, privacy, verify and export, navigated by the trace itself rather than a sidebar.
- Source-grounded viewer for image regions, PDF pages, audio ranges, text ranges and email fields.
- Polymorphic source-locator schema and the extraction schema, with locator-ownership enforcement.
- Deterministic engines: timeline, entity resolution, conflict classification, privacy patterns, SHA-256, RFC 6962-style Merkle tree, manifest build and verify.
- Live pipeline: validated upload with magic-byte checking, browser and server hashing, private storage, per-artifact analysis, schema validation, persistence, per-artifact failure isolation.
- Database schema with row level security on every table and a private storage bucket.
- Optional Solana devnet anchor with a memo-shape guard.
- Synthetic demonstration case: ten generated evidence files, and a bundle whose fingerprints, Merkle root, entity resolution, conflicts and privacy findings are computed by the shipped engines.
- Proof pack export.
- 130 unit and integration tests, and Playwright specs for the critical path.

## Team contributions



- *Jayking* — *Full stack software developer* — *Proofline*

## AI tools used

- **Claude** — used as a pair programmer throughout: architecture, implementation, design and documentation. All decisions were reviewed and accepted by the author.
- **Anthropic Messages API** — used *inside* the product for per-artifact extraction. Model id is environment-configurable.

Full disclosure in [DISCLOSURES.md](DISCLOSURES.md).

## Third-party assets

None beyond open-source npm dependencies and three SIL Open Font License typefaces (Newsreader, Archivo, Martian Mono), all self-hosted from npm. Every icon and illustration is original SVG. No stock imagery, no icon library, no component library.

## APIs

Anthropic Messages API (optional), an OpenAI-compatible transcription endpoint (optional), Supabase (optional), Solana devnet RPC and the Memo Program (optional, disabled by default). The deployed public site runs with none of these configured.

## Pre-existing components

None.

## Limitations

Stated in full in [LIMITATIONS.md](LIMITATIONS.md) and at `/limitations` in the product. Summary: automated analysis misreads things; a difference between sources is not deception; a fingerprint match proves only that bytes are unchanged; chronology has deliberate gaps; confidence is self-assessment; export is print-ready HTML rather than a generated PDF; Playwright tests are written but were not executed in the build environment.

## Privacy

Private storage bucket, five-minute signed URLs, row level security enforced in the database, browser-side hashing, storage keys built from ids rather than filenames, and deletion that removes stored bytes. No end-to-end encryption is implemented and none is claimed.

## Security

Upload-by-file only (no remote URL ingestion, so no SSRF surface), magic-byte validation, server-side hash recomputation, per-case duplicate rejection, secret key confined to the server, and an anchor memo guard that refuses to publish anything but a Merkle root.

## Responsible AI

Every generated statement is traceable to a source region and reachable in one click. The product's vocabulary is *potential inconsistency*, *evidence suggests*, *requires review* — never *lied*, *fraud*, *authentic* or *proves*. Integrity results always carry the sentence explaining that byte-level matching does not establish truthfulness. `/limitations` is a first-class page.

## Future improvements

- Time-versus-time comparison in the conflict engine.
- PDF text-layer extraction for in-page bounding boxes.
- Case sharing with scoped read access.
- Exported artifact copies with image regions masked.
- Server-generated PDF once a renderer can be relied on across deployment targets.

## Testing instructions

No credentials are needed to evaluate the product.

1. Open the deployed URL (or run locally — see [START-HERE.md](START-HERE.md)).
2. `/demo` — the full workspace on a seeded case.
3. Timeline → **View 2 sources** on the 11:41 event.
4. Conflicts → open the first potential inconsistency.
5. `/verify` → drop `receipt-original.png` (match), then `receipt-modified.png` (mismatch). Both files are downloadable from that page.
6. Export → **Open proof pack**.

## Demo credentials

None required. **[EDIT]** — if you deploy with Supabase and want to show live upload, add a demo account here.

## Links

- **Live Demo:** [https://proofline-xyz.vercel.app](https://proofline-xyz.vercel.app)
- **Repository:** [https://github.com/your-username/proofline](https://github.com/paulos-ui/proofline)
- **Demo Video:** [https://youtu.be/your-video-id]
- **Team Contributions:** 
  - Architecture, smart contract integration, Merkle verification, and frontend execution.