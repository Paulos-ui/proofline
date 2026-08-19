# Start here

Everything below assumes you have just unzipped `proofline.zip` and are at a terminal.

The demonstration case and file verification work with **no accounts, no API keys and no database**. Those are the two things worth looking at first.

---

## 1. Prerequisites

| Requirement | Version | Notes |
| --- | --- | --- |
| Node.js | 20.9 or newer (22 LTS recommended) | `node -v` |
| npm | 10 or newer | Ships with Node. The repository was built and verified with npm |
| Supabase project | optional | Only for creating your own cases |
| Anthropic API key | optional | Only for analysing uploaded evidence |

Nothing else is needed. There is no Docker requirement, no local database, no build step to run by hand.

---

## 2. Run it

```bash
cd proofline
npm install
cp .env.example .env.local
npm run dev
```

On Windows PowerShell, replace the copy line:

```powershell
Copy-Item .env.example .env.local
```

On Windows CMD:

```cmd
copy .env.example .env.local
```

Then open **http://localhost:3000**.

If you are on WSL and the project sits under `/mnt/c/`, quote paths containing spaces:

```bash
cd "/mnt/c/Users/MY PC/Desktop/proofline"
```

### What works immediately

| Route | Works with no configuration |
| --- | --- |
| `/` | yes |
| `/demo` | yes — the full workspace on a seeded case |
| `/verify` | yes — real SHA-256 hashing in your browser |
| `/case/demo-marketplace-dispute/report` | yes — the proof pack |
| `/docs`, `/about`, `/privacy`, `/limitations` | yes |
| `/dashboard`, `/sign-in` | shows an explanation that no database is connected |

---

## 3. The 90-second tour

1. Open `/demo`. Press **Timeline**. Note the band at the bottom: *Time not established*. Proofline refuses to guess.
2. Press **View 2 sources** on the 11:41 event. The right rail opens the exact region of the screenshot behind it.
3. Press **Conflicts**. Open the first potential inconsistency. Both sources appear side by side.
4. Press **Verify**. Drop `public/demo/artifacts/receipt-original.png` → **Integrity match**.
5. Drop `public/demo/artifacts/receipt-modified.png` → **Fingerprint mismatch**. The two files differ by one figure.

---

## 4. Connect Supabase (for your own cases)

1. Create a project at supabase.com.
2. Copy the values into `.env.local`:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://<project>.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<anon key>
SUPABASE_SECRET_KEY=<secret key>
```

3. Run the migration. Either paste `supabase/migrations/0001_init.sql` into the SQL editor in the Supabase dashboard and run it, or use the CLI:

```bash
npx supabase link --project-ref <project-ref>
npx supabase db push
```

The migration creates every table, all row level security policies, and the private `evidence` storage bucket.

4. Restart `npm run dev`. `/sign-up` now works, and `/dashboard` lists your cases.

---

## 5. Add analysis

```bash
ANTHROPIC_API_KEY=sk-ant-...
ANTHROPIC_MODEL=claude-sonnet-4-6
```

Without this, uploads still work and files are still fingerprinted — the **Process evidence** button reports that no analysis provider is configured rather than pretending to run.

For audio, add a transcription service (any OpenAI-compatible endpoint):

```bash
TRANSCRIPTION_PROVIDER=openai
TRANSCRIPTION_API_KEY=sk-...
```

Without it, audio artifacts are marked *needs review* and are never presented as analysed.

---

## 6. Rebuild the demo fixtures

The demonstration case ships built. To regenerate it from source:

```bash
python3 scripts/generate_synthetic_evidence.py   # regenerates the 10 synthetic files (needs Pillow)
npm run seed:demo                                   # rehashes them and rebuilds the bundle + manifest
```

`npm run seed:demo` recomputes every fingerprint, re-runs entity resolution, conflict detection and sensitive-value detection with the shipped engines, and rebuilds the Merkle root. If you change a byte in any evidence file, the root changes and the tests catch it.

---

## 7. Tests

```bash
npm run typecheck    # tsc --noEmit, strict mode
npm run lint         # eslint
npm run test         # 130 unit and integration tests, no network needed
npm run test:e2e     # Playwright; downloads a browser on first run
```

`npm run test:e2e` builds and starts the app itself. To point it at a running server instead:

```bash
PLAYWRIGHT_BASE_URL=http://localhost:3000 npm run test:e2e
```

---

## 8. Production build

```bash
npm run build
npm run start
```

---

## 9. Deploy

**Vercel + Supabase** is the intended path.

```bash
npx vercel
```

Then in the Vercel project settings add the environment variables from `.env.example` that you are using. At minimum:

- `NEXT_PUBLIC_APP_URL` — your deployed URL
- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY`
- `ANTHROPIC_API_KEY`, `ANTHROPIC_MODEL`

In Supabase, add your deployed URL to **Authentication → URL Configuration → Site URL** and redirect URLs.

Deploying with no environment variables at all is valid: you get a working public site with the demonstration case and verification, which is enough for a judge to evaluate the product.

---

## 10. If something goes wrong

| Symptom | Cause | Fix |
| --- | --- | --- |
| `/dashboard` says no database is connected | Supabase values missing | Section 4 |
| Upload succeeds, **Process evidence** returns 503 | No `ANTHROPIC_API_KEY` | Section 5 |
| Audio marked *needs review* | No transcription service | Section 5, or leave it — this is honest behaviour, not a bug |
| Verification says Web Crypto is unavailable | Page served over plain HTTP on a non-localhost host | Use https or localhost |
| Fonts look wrong on WSL | Fonts are bundled via `@fontsource`, not fetched at build | Reinstall dependencies |
| `npm run test:e2e` cannot download a browser | Restricted network | Run `npx playwright install chromium` on a machine with access |
