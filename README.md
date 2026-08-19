# Proofline

**Scattered evidence. One traceable story.**

Proofline turns screenshots, documents, messages, receipts and audio into a structured timeline where every important claim leads back to its source — and gives you a way to tell, later, whether a file has changed.

> AI may help organise the story. The evidence must remain inspectable.

**[Open the demonstration case](/demo)** — no account, no API key. **[Verify a file](/verify)** — hashing happens in your browser.

---

## Why

When something goes wrong online, the evidence already exists. It is just spread across a phone, an inbox, a downloads folder and a chat export.

Turning that into something another person can follow means ordering it in time, noticing where two sources disagree, and being able to point at the exact line behind every statement. That work is slow, easy to get wrong, and decides whether anyone takes the account seriously.

## What Proofline does

- **Reads each artifact separately** — images, PDFs, email, text, and audio via a transcription adapter.
- **Builds a chronology** that never invents a time. Events the evidence cannot place sit in their own band.
- **Grounds every statement** in a source locator: an image region, a PDF page, an audio range, a character range.
- **Compares sources** and labels differences as *potential inconsistencies*. It has no label for lying, and cannot produce one.
- **Resolves identities conservatively** — exact identifiers merge, similar names become a *possible match* you confirm.
- **Flags sensitive values** for redaction in exports, never touching the original file.
- **Fingerprints everything** with SHA-256 and commits the set to a Merkle root anyone can check.

## Demo

`/demo` opens a fully seeded, entirely fictional marketplace dispute: eight artifacts, eleven events, eight claims, five differences between sources, and a real manifest.

The fingerprints, Merkle root, entity resolution, conflict detection and sensitive-value detection in that case are computed by the same code the live product runs. Only the per-artifact model extraction is a stored fixture, so the demo cannot fail because a provider is unavailable. The interface says so on the page.

The hero moment: `public/demo/artifacts/receipt-original.png` matches its registered fingerprint; `receipt-modified.png` — visually near-identical, one figure changed — does not.

## Key capabilities

| | |
| --- | --- |
| Source-grounded timeline | Every event links to the region of the artifact supporting it |
| Potential inconsistency engine | Deterministic claim comparison across status, amount and subject |
| Connection graph | Deterministic layout; possible identity matches shown as unmerged dashed links |
| Privacy review | Pattern detection first, model suggestions second; redaction applies to exports only |
| Integrity manifest | SHA-256 per artifact, RFC 6962-style Merkle tree, verifiable without an account |
| Optional public anchor | Solana devnet memo carrying only a version tag and the Merkle root |
| Proof pack | Print-ready report with the chronology, sources, fingerprints and limitations |

## Architecture

```
Browser                      Server                        External
────────────────────────────────────────────────────────────────────
SHA-256 (Web Crypto)  ──►    validate + rehash        ──►  private storage
                             analyse per artifact     ──►  model provider
                             validate against schema
                             ── deterministic ──
                             entity resolution
                             chronology
                             conflict detection
                             pattern-based privacy
                             Merkle manifest          ──►  optional chain memo
```

The model reads one artifact at a time and never sees the whole case, so it cannot invent cross-artifact conclusions. Everything spanning artifacts is ordinary, tested software. See [ARCHITECTURE.md](ARCHITECTURE.md).

## How source grounding works

Each generated object stores a typed pointer into the artifact:

```ts
{ artifactId, type: "image-region", bbox: { x, y, width, height }, excerpt }
{ artifactId, type: "pdf-page",     page: 3, excerpt }
{ artifactId, type: "audio-range",  startMs, endMs, transcript }
{ artifactId, type: "text-range",   startOffset, endOffset, excerpt }
{ artifactId, type: "email-field",  field: "body", excerpt }
```

Bounding boxes are fractions of the image, so a locator stays correct at any display size. An analysis containing a locator that points at a different artifact is rejected in full — a model inventing an artifact id is producing ungrounded output.

## Integrity model

Artifact digests, with each file's size, type and name, are sorted deterministically and used as Merkle leaves. Leaves and internal nodes use different hash prefixes (RFC 6962) so a leaf can never be presented as an internal node; an odd node is promoted rather than duplicated.

**A match proves the bytes you supplied are identical to the bytes that were registered. Nothing more.** Not authorship, not accuracy, not that the file was unaltered before Proofline saw it. The interface says this every time it reports a result.

## Tech stack

Next.js 16 (App Router) · React 19 · TypeScript strict · Tailwind CSS v4 with a custom token system · Motion · Zod 4 · Supabase (Postgres, Auth, private Storage, RLS) · Anthropic SDK with tool-schema structured output · Web Crypto · optional `@solana/kit` + `@solana-program/memo` · Vitest · Playwright

## Local development

```bash
npm install
cp .env.example .env.local
npm run dev
```

Full instructions, including Supabase setup and deployment, are in [START-HERE.md](START-HERE.md).

## Privacy

Evidence lives in a private bucket reached only through five-minute signed URLs. Row level security is enforced in the database, not just the app. Hashing happens in your browser. Deleting a case removes the stored bytes with it. There is no end-to-end encryption, and Proofline does not claim any. See [/privacy](/privacy).

## Limitations

Automated analysis misreads things. A difference between sources is not deception. A fingerprint match is narrow. Chronology has gaps by design. Confidence is self-assessment, not calibrated probability. The full list, including known gaps in this build, is in [LIMITATIONS.md](LIMITATIONS.md) and at [/limitations](/limitations).

## Responsible AI

Every generated statement is traceable to a source, and following that trace is one click. Proofline uses the language of *potential inconsistency*, *evidence suggests* and *requires review* — never *lied*, *fraud*, *authentic* or *proves*. It is not a court, an investigator, a fact-checking authority or a forensic certification service, and it does not provide legal advice.

## Hackathon disclosure

Built for Proof of Possible 2026. Development was AI-assisted (Claude). All evidence in the demonstration case is synthetic. Full disclosure in [DISCLOSURES.md](DISCLOSURES.md); scope of what was built during the event in [HACKATHON.md](HACKATHON.md).

## Guides

- [DEPLOY.md](DEPLOY.md) — accounts, API keys and deploying to Vercel, step by step
- [USER-GUIDE.md](USER-GUIDE.md) — what was built, how to run it, how to use it
- [START-HERE.md](START-HERE.md) — terse local setup
- [DEMO.md](DEMO.md) — the three-minute demonstration path

## License

MIT. See [LICENSE](LICENSE).
