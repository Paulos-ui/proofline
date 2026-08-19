# Disclosures

## AI-assisted development

Proofline was built with AI assistance (Claude) acting as a pair programmer across architecture, implementation, design and documentation. Every design decision, correction and acceptance was made by the human author. The code was reviewed, typechecked, linted, tested and built before submission.

## AI used inside the product

| Purpose | Provider | Model | Notes |
| --- | --- | --- | --- |
| Per-artifact extraction | Anthropic | configurable via `ANTHROPIC_MODEL`, default `claude-sonnet-4-6` | Vision and PDF; strict tool schema; response re-validated with Zod |
| Audio transcription | Optional, any OpenAI-compatible endpoint | configurable via `TRANSCRIPTION_MODEL` | Not configured by default; audio is marked *needs review* rather than treated as analysed |

No model call is made by the demonstration case, the verification page, or any marketing page.

## Third-party dependencies

**Runtime**

| Package | Purpose | License |
| --- | --- | --- |
| next, react, react-dom | Framework and rendering | MIT |
| @anthropic-ai/sdk | Model client | MIT |
| @supabase/supabase-js, @supabase/ssr | Database, auth, storage | MIT |
| zod | Runtime schema validation | MIT |
| motion | Interaction transitions | MIT |
| @solana/kit, @solana-program/memo | Optional public anchor (optional dependency) | Apache-2.0 / MIT |

**Development**

tailwindcss, @tailwindcss/postcss, typescript, vitest, @playwright/test, eslint, eslint-config-next, tsx, and the corresponding `@types` packages. All MIT or Apache-2.0.

**Deliberately not used**

No component library. No shadcn/ui. No UI kit, template or starter theme. Every component in `components/` was written for this project. No force-directed graph library — the graph layout is a deterministic ring computed in ~30 lines, because a reproducible picture matters more than a physics simulation.

## Fonts

| Font | Role | License | Delivery |
| --- | --- | --- | --- |
| Newsreader | Editorial display | SIL Open Font License 1.1 | Bundled via `@fontsource-variable/newsreader` |
| Archivo | Interface | SIL Open Font License 1.1 | Bundled via `@fontsource-variable/archivo` |
| Martian Mono | Hashes, timestamps, identifiers | SIL Open Font License 1.1 | Bundled via `@fontsource-variable/martian-mono` |

All three are self-hosted from npm. Nothing is fetched from a font CDN at build or runtime.

## Icons and graphics

Every mark, glyph and illustration is original SVG written for this project: the Proofline mark, the trace components, the format glyphs, the convergence glyph on conflicts, the integrity glyph on verification results, and the hero fragments. No icon library is installed. No stock illustration is used.

## Synthetic demonstration material

Everything in the demonstration case is fictional and was generated for this project by `scripts/generate_synthetic_evidence.py`:

- Chat screenshots, the transfer receipt and its modified copy, and the courier consignment note are drawn with Pillow.
- The voice note is a synthesised tone, not a recording of a person. Its transcript is a seeded fixture, clearly labelled as such in the interface.
- The email and support transcript are written text files.

All names, companies, account numbers, addresses, phone numbers, transaction references and tracking numbers are invented. `PayLoop`, `Kestrel Supply Co`, `Northline Courier`, `M. Reyes`, `Dana Okafor` and `K. Aduba` do not exist. Domains use the reserved `.example` TLD.

The per-artifact extraction in `fixtures/demo-case/source.ts` is hand-authored to stand in for a model response, so the demonstration works without a provider. This is stated in the interface on `/demo`, in the README and in HACKATHON.md. Entity resolution, conflict detection, sensitive-value detection, fingerprints and the Merkle root in the demo bundle are computed by the shipped engines at build time, not written by hand.

## APIs and services

- Anthropic Messages API — artifact analysis (optional).
- An OpenAI-compatible transcription endpoint — audio (optional).
- Supabase — Postgres, Auth, Storage (optional).
- Solana devnet RPC and the Memo Program — public anchor (optional, disabled by default).

The deployed public site can run with none of these configured.

## Pre-existing components

None. This repository was started from an empty directory for Proof of Possible 2026. No code was carried over from a previous project of the author's.
