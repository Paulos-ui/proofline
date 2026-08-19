# Proofline — User Guide

Everything you need to run Proofline, use it, and explain it. This is the
operator's guide; `START-HERE.md` is the terse setup version.

---

## Part 1 — What Proofline is

**Turn scattered digital evidence into a source-linked, verifiable timeline.**

You have a mess: screenshots, a receipt, an email, a courier PDF, a voice note.
Proofline puts them in order, tells you where each statement came from, points out
where two sources disagree, and fingerprints every file so you can tell later whether
one changed.

It does three things and refuses to do a fourth:

| Does | Does not |
| --- | --- |
| Organises evidence into a chronology | Decide who is telling the truth |
| Links every statement to the exact region of a source | Authenticate that a file is genuine |
| Detects whether a file's bytes have changed | Provide legal advice or forensic certification |

The principle the whole product is built around: **every claim should lead back to
evidence.**

---

## Part 2 — What was actually built

### The public surfaces

| Route | What it is |
| --- | --- |
| `/` | Landing page. The hero shows five unrelated artifacts resolving into a dated line — the product's thesis before any copy |
| `/demo` | The full workspace running a seeded synthetic case. No account, no keys |
| `/verify` | Check any file against a manifest. Hashing happens in your browser |
| `/docs` | Twelve-section technical documentation |
| `/about` | Why it exists |
| `/privacy` | Where evidence goes, plainly |
| `/limitations` | What it gets wrong. Nine sections, not a footer disclaimer |
| `/sign-in`, `/sign-up` | Accounts, only needed for your own cases |
| `/dashboard` | Your cases |
| `/case/[id]` | A live case, same workspace as the demo plus an uploader |
| `/case/[id]/report` | The printable proof pack |

### The workspace

Navigation *is* the brand motif: a horizontal trace line with a node per section —
Overview, Evidence, Timeline, Connections, Conflicts, Privacy, Verify, Export. Counts
sit on the nodes so the case tells you what needs attention.

- **Timeline** — events strung on a vertical trace. Anything without an established
  time drops into a separate band marked *Time not established*, shown as a diamond
  rather than a circle.
- **Source panel** — clicking *View sources* opens a right rail with the artifact and
  the exact supporting region brought forward. Images dim everything outside the
  bounding box and offer *Zoom to region*. PDFs open to the page. Audio highlights the
  millisecond range and plays just that segment. Text highlights the character range.
- **Connections** — a deterministic graph. Parties on an inner ring, records outside.
  Dashed amber edges are *possible matches* Proofline declined to merge.
- **Conflicts** — each finding expands to both sources side by side.
- **Privacy** — per-item Redact / Keep / Ignore. Applies to exports only.
- **Verify** — check a file against this case's manifest.
- **Export** — the proof pack, the manifest download, and case deletion.

### Under the hood

- **Source locators** — five shapes: `image-region` (normalised bbox), `pdf-page`,
  `audio-range` (start/end ms), `text-range` (character offsets), `email-field`.
  Every generated object carries at least one. An analysis whose locators name a
  different artifact is rejected whole, not partially kept.
- **The split** — the model reads *one artifact at a time* and never sees the case.
  Everything spanning artifacts (identity, chronology, disagreement, fingerprints) is
  deterministic code. Same case, same findings, every time.
- **Integrity** — SHA-256 via Web Crypto in the browser; the server recomputes from
  received bytes and rejects a mismatch. Fingerprints sort deterministically into an
  RFC 6962 Merkle tree (leaf/node domain separation, odd-node promotion).
- **Difference engine** — claims normalise to subject/predicate/object, then compare
  along one dimension. Four outcomes: *potentially inconsistent*, *unresolved*,
  *insufficient evidence*, *compatible*. There is no fifth, and no way to add one.
- **Privacy** — deterministic patterns first (Luhn-checked account numbers, addresses,
  phones, wallets, handles), model suggestions second for things patterns can't reach.
- **Security** — private storage bucket, five-minute signed URLs, RLS on all 13 tables
  with `owns_case`/`owns_artifact` helpers, storage keys built from ids never
  filenames, magic-byte checking on upload.
- **Optional Solana anchor** — publishes `proofline:v1:<merkle-root>` and nothing else.
  A guard rejects any memo whose payload isn't a bare 64-character root. Off by
  default; the product is complete without it.

---

## Part 3 — Running it

### Fastest path (no configuration at all)

```bash
unzip proofline.zip
cd proofline
npm install
cp .env.example .env.local
npm run dev
```

Windows PowerShell: `Copy-Item .env.example .env.local`

Open **http://localhost:3000**. You do not need to edit `.env.local`. The demo case,
verification, proof pack and all documentation work immediately.

### Adding capabilities

Each is independent — add only what you need.

| To get | Set | Effect if unset |
| --- | --- | --- |
| Accounts + your own cases | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY` | `/dashboard` explains the deployment is demo-only |
| Extraction on real uploads | `ANTHROPIC_API_KEY` | Upload and hashing still work; the Process button is disabled and says why |
| Audio | `TRANSCRIPTION_PROVIDER`, `TRANSCRIPTION_API_KEY` | Audio artifacts are marked **failed** with that reason — never treated as analysed |
| Public anchor | `ENABLE_SOLANA_ANCHOR=true`, `SOLANA_ANCHOR_PRIVATE_KEY` | Anchoring returns 501 |

For Supabase, run `supabase/migrations/0001_init.sql` in the SQL editor, or
`npx supabase db push`. Add your deployed URL to **Authentication → URL
configuration** or sign-in won't complete.

**Check what a deployment can do at any time:** `GET /api/health` returns the exact
capability set.

---

## Part 4 — Using it as a user

### Exploring the demo (no account)

1. Open `/demo`. The banner tells you what is real (fingerprints, Merkle root, entity
   resolution, conflicts, pattern detection — all computed by shipped code) and what
   is seeded (the per-artifact extraction a vision model would produce, and the voice
   transcript).
2. **Timeline** → note the event under *Time not established*. Nothing in the evidence
   says when the parcel reached the courier, so Proofline doesn't guess.
3. On the 11:41 event, click **View 2 sources**. The rail opens the chat screenshot
   with the message region isolated. Switch to the second source — the email — with
   the buttons at the top.
4. **Conflicts** → expand the first finding. The seller's "payment has cleared" sits
   beside the receipt showing *Pending*, captured six minutes later.
5. **Connections** → click a node to see every place it appears, and the dashed edges
   where Proofline proposed an identity link without merging.
6. **Privacy** → mark something *Redact in export*.
7. **Export** → **Open proof pack**, then print or save as PDF.

### The verification demo

Go to `/verify`. The demo manifest is already loaded.

- Download `receipt-original.png`, drop it in → **Integrity match**
- Download `receipt-modified.png`, drop it in → **Fingerprint mismatch**

They look nearly identical; one figure differs. The file never leaves your browser —
only the digest is compared.

### Running a real case

1. `/sign-up` → create an account.
2. **New case** — title, optional description (it helps the analysis read ambiguous
   artifacts), timezone for the chronology.
3. **Evidence** → drag files in. Each is hashed locally before upload; you'll see the
   short digest appear per file. Accepted: PNG, JPEG, WebP, PDF, TXT, EML, WAV, MP3,
   M4A, WebM, OGG — 25 MB each.
4. **Process evidence.** Each artifact is analysed separately. **One failure does not
   take the batch down** — it's marked failed with a reason and everything else
   proceeds.
5. Read the timeline. **Open the source behind anything you intend to rely on.**
6. Review Conflicts and Privacy before exporting.
7. **Download the manifest and keep it somewhere separate.** That file is what lets
   anyone — including you, later — check whether an evidence file has changed.

### Deleting

Export → **Delete case**. You type the case reference to confirm. It removes the
records *and* the stored bytes. If the files can't be removed, the deletion fails
rather than orphaning evidence.

---

## Part 5 — Reading the interface honestly

| You see | It means |
| --- | --- |
| **Potential inconsistency** | Two sources describe the same thing differently. Not an accusation |
| **Possible match** | Two identities might be one party. Proofline did **not** merge them |
| **Review suggested** / **Low confidence** | The model's own assessment it may have misread. Not a probability |
| **Time not established** | No source stated a time. The event is deliberately unordered |
| **Integrity match** | These bytes are identical to the registered bytes. Nothing more |
| **Fingerprint mismatch** | The bytes differ — which can mean re-compression by a messaging app, not only tampering |

If you're presenting findings to anyone else: a difference between sources is a
question worth asking, not a conclusion. Say it that way.

---

## Part 6 — Verification status

Run yourself:

```bash
npm run typecheck   # tsc --noEmit, strict
npm run lint        # eslint
npm run test        # 130 unit + integration tests
npm run build       # production build
```

All four were run and passed, including from a clean extraction of the ZIP
(`npm install` → tests → build → `next start` → 15 routes returning 200).

**Not verified — run these before you submit:**

```bash
npx playwright install chromium
npm run test:e2e
```

Twelve end-to-end specs are written and configured but were never executed, because
the Playwright browser CDN was unreachable in the build environment. Treat them as
unproven until they run. Also unverified: visual appearance and mobile breakpoints
(no browser available), and a live Supabase + Anthropic round trip (no project or key
available).

---

## Part 7 — Where things live

```
app/            routes: (marketing), (auth), demo, verify, dashboard, case, api
components/     brand, evidence, timeline, graph, conflicts, privacy,
                verification, workspace, marketing, ui
lib/            schemas, integrity, ai, evidence, entities, conflicts,
                timeline, privacy, supabase, solana, cases, demo, utils
supabase/       migrations/0001_init.sql — tables, RLS, storage policies
fixtures/       demo-case — seeded analysis + generated bundle
public/demo/    the ten synthetic evidence files + manifest
tests/          unit (9 files), integration (1), e2e (1, unrun)
scripts/        generate_synthetic_evidence.py, build-demo-fixtures.ts
```

Other documents: `START-HERE.md` (setup), `ARCHITECTURE.md` (technical decisions),
`DEMO.md` (three-minute run with timings), `HACKATHON.md` (Devpost-ready),
`DISCLOSURES.md` (tools, libraries, assets), `LIMITATIONS.md`,
`docs/TESTING.md`, `docs/SECURITY-REVIEW.md`.

---

## Part 8 — Common problems

| Symptom | Cause and fix |
| --- | --- |
| Uploads return 401 | Not signed in, or Supabase unset. Check `/api/health` |
| "Web Crypto is unavailable" | Needs a secure context. Use `http://localhost`, not a LAN IP |
| Audio marked failed | Correct behaviour with no transcription service. Set `TRANSCRIPTION_PROVIDER` and `TRANSCRIPTION_API_KEY` |
| Process button disabled | No `ANTHROPIC_API_KEY`, or no artifacts yet. The button says which |
| `npm install` fails on Solana | They're optional dependencies. `npm install --no-optional` |
| Demo case empty or schema error | Rebuild it: `npm run seed:demo` |
| Sign-in redirects in a loop | Deployed URL missing from Supabase Authentication → URL configuration |
