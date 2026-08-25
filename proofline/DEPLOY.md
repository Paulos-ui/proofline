# DEPLOY — the complete manual

Follow this top to bottom. Every website you need, every value you copy, in order.

Target: **Vercel** (the app) + **Supabase** (database, auth, evidence storage) +
**Anthropic** (extraction).

Time: about 35 minutes the first time.

---

## Before you start — decide how far to go

Proofline works at three levels. Pick one now so you don't collect keys you
don't need.

| Level | What works | What you need |
| --- | --- | --- |
| **A — Demo only** | Landing, demo case, verification, proof pack, all docs | Nothing. No accounts, no keys |
| **B — Demo + real cases** | Everything in A, plus sign-up, create case, upload, fingerprinting | Supabase |
| **C — Full product** | Everything in B, plus real AI extraction of uploads | Supabase + Anthropic |

**For a hackathon submission, deploy level C but make sure level A is flawless** —
a judge will open the demo case, and it must work with zero setup on their side.

If you only want level A, skip to **Part 4**. You can deploy right now with no
accounts at all.

---

## Part 1 — Supabase (database, auth, file storage)

### 1.1 Create the account and project

1. Go to **https://supabase.com** → **Start your project** → sign in with GitHub.
2. **New project**.
   - **Name**: `proofline`
   - **Database Password**: click *Generate*, then **save it in your password
     manager**. You will not be shown it again. (Proofline itself does not use this
     password — it's for direct Postgres access — but losing it is annoying.)
   - **Region**: choose the one closest to your users. For Nigeria, `eu-west-1
     (Ireland)` or `eu-central-1 (Frankfurt)` are usually the best latency.
   - **Plan**: Free is enough.
3. Wait ~2 minutes for provisioning.

### 1.2 Run the database migration

This creates the tables, the row level security policies, and the private evidence
bucket. Nothing works without it.

1. In your project, open **SQL Editor** in the left sidebar.
2. Click **New query**.
3. Open `supabase/migrations/0001_init.sql` from the Proofline repo, copy the
   **entire file**, paste it into the editor.
4. Click **Run**.

You should see `Success. No rows returned`.

**Verify it worked** — in the sidebar:
- **Table Editor** → you should see 13 tables (`cases`, `artifacts`, `entities`,
  `events`, `claims`, `conflicts`, and so on).
- **Storage** → you should see a bucket named `evidence` marked **Private**. If it
  says Public, stop and re-run the migration; do not continue.

### 1.3 Copy your three values

Go to **Project Settings** (gear icon) → **API Keys**.

You need three things:

| Copy this | From | Looks like |
| --- | --- | --- |
| **Project URL** | Settings → Data API (or the *Connect* dialog) | `https://abcdefgh.supabase.co` |
| **Publishable key** | Settings → API Keys → *Publishable key* | `sb_publishable_...` |
| **Secret key** | Settings → API Keys → *Secret keys* → reveal | `sb_secret_...` |

Notes:
- If you don't see a publishable key yet, click **Create new API keys**.
- **Older projects** may show *Legacy API Keys* with `anon` and `service_role`
  instead. Those still work — use `anon` as the publishable key and `service_role`
  as the secret key. Supabase is retiring them by the end of 2026, so prefer the new
  format if both are offered.
- The **secret key bypasses all security policies.** Never put it in a variable
  starting with `NEXT_PUBLIC_`, never paste it into client code, never commit it.
  Supabase automatically revokes secret keys it detects in public GitHub repos.

Paste all three into your local `.env.local` for now:

```text
NEXT_PUBLIC_SUPABASE_URL=https://abcdefgh.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
SUPABASE_SECRET_KEY=sb_secret_...
```

### 1.4 Turn off email confirmation (optional, but do it for a demo)

By default Supabase emails a confirmation link before a new account can sign in.
For a hackathon that's friction a judge won't tolerate.

**Authentication** → **Sign In / Providers** → **Email** → turn **Confirm email**
off → Save.

Turn it back on before any real use.

---

## Part 2 — Anthropic (extraction)

This is what actually reads the screenshots and PDFs. Without it, upload and
fingerprinting still work but the **Process evidence** button stays disabled and says
why.

1. Go to **https://console.anthropic.com** and sign up.
2. **Billing** → add a payment method and buy credits. **This is a paid API — the
   Claude.ai subscription does not include it, and there is no free tier.** $5–10 is
   plenty for a hackathon; processing one 8-artifact case costs cents.
3. **API Keys** → **Create Key** → name it `proofline` → **copy it immediately**.
   It is shown once.

```text
ANTHROPIC_API_KEY=sk-ant-...
ANTHROPIC_MODEL=claude-sonnet-4-6
```

Leave `ANTHROPIC_MODEL` as-is unless you have a reason. It's read in exactly one
place (`lib/ai/config.ts`), so changing it is a one-line change everywhere.

---

## Part 3 — Optional extras

Skip both unless you specifically want them.

### Audio transcription

Needed only if you'll upload voice notes. Any OpenAI-compatible
`/audio/transcriptions` endpoint works.

- **https://platform.openai.com** → API keys → create one.

```text
TRANSCRIPTION_PROVIDER=openai
TRANSCRIPTION_API_KEY=sk-...
TRANSCRIPTION_MODEL=whisper-1
TRANSCRIPTION_BASE_URL=https://api.openai.com/v1
```

Without this, an audio upload is marked **failed** with that exact reason. Proofline
will not pretend unanalysed audio was analysed.

### Solana public anchor

Publishes `proofline:v1:<merkle-root>` and nothing else. Off by default; the product
is complete without it.

```bash
solana-keygen new --outfile ./anchor-key.json
solana airdrop 1 --url devnet $(solana-keygen pubkey ./anchor-key.json)
```

```text
ENABLE_SOLANA_ANCHOR=true
SOLANA_CLUSTER=devnet
SOLANA_RPC_URL=https://api.devnet.solana.com
SOLANA_ANCHOR_PRIVATE_KEY=[12,34,...]
```

Paste the whole contents of `anchor-key.json`. Keep it on devnet.

---

## Part 4 — Test locally before deploying

Never deploy something you haven't run.

```bash
cd proofline
npm install
npm run dev
```

Open **http://localhost:3000** and walk this list:

- [ ] `/demo` loads, timeline shows events, **View sources** opens the right rail
      with the highlighted region
- [ ] `/verify` — drop `receipt-original.png` → **Integrity match**
- [ ] `/verify` — drop `receipt-modified.png` → **Fingerprint mismatch**
- [ ] `/api/health` — confirm the capabilities you configured show `true`
- [ ] `/sign-up` → create an account → you land on `/dashboard`
- [ ] **New case** → upload 2–3 files → each shows a hash → **Process evidence**
- [ ] Timeline populates; open a source; check Conflicts and Privacy
- [ ] Export → **Open proof pack**

If step 6 or 7 fails, fix it now. It will not fix itself in production.

Then confirm it builds:

```bash
npm run build
```

---

## Part 5 — Push to GitHub

Vercel deploys from a repository.

1. **https://github.com/new** → name it `proofline` → **Private** is fine → Create.
2. In your project folder:

```bash
git init
git add .
git commit -m "Proofline"
git branch -M main
git remote add origin https://github.com/Paulos-ui/proofline.git
git push -u origin main
```

**Before pushing, confirm no secrets are going up:**

```bash
git status --short | grep -i env
grep -rn "sb_secret_\|sk-ant-" --exclude-dir=node_modules --exclude-dir=.git .
```

The first should show only `.env.example`. The second should return nothing.
`.gitignore` already excludes `.env.local`, but check anyway — a leaked secret key
means rotating it in Supabase.

---

## Part 6 — Deploy to Vercel

### 6.1 Import

1. Go to **https://vercel.com** → sign in with GitHub.
2. **Add New** → **Project**.
3. Find `proofline` → **Import**.
4. Vercel detects Next.js automatically. **Do not change** the build command,
   output directory or install command.

### 6.2 Add environment variables

**Before clicking Deploy**, expand **Environment Variables** and add each one.
Name on the left, value on the right, applied to **Production, Preview and
Development**.

| Name | Value |
| --- | --- |
| `NEXT_PUBLIC_APP_URL` | leave for now — you'll add it after the first deploy |
| `NEXT_PUBLIC_SUPABASE_URL` | `https://abcdefgh.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | `sb_publishable_...` |
| `SUPABASE_SECRET_KEY` | `sb_secret_...` |
| `ANTHROPIC_API_KEY` | `sk-ant-...` |
| `ANTHROPIC_MODEL` | `claude-sonnet-4-6` |

Add the transcription and Solana variables only if you set those up.

The fastest way: open your `.env.local`, copy the whole file, and paste it into the
**Key** field — Vercel parses a pasted `.env` and fills every row at once. Then
delete any blank ones.

### 6.3 Deploy

Click **Deploy**. It takes 2–4 minutes.

You'll get a URL like `https://proofline-xyz.vercel.app`.

### 6.4 Two things you must do after the first deploy

**A. Set the app URL.**

Vercel → your project → **Settings** → **Environment Variables** → edit
`NEXT_PUBLIC_APP_URL` to your real deployed URL (no trailing slash):

```text
NEXT_PUBLIC_APP_URL=https://proofline-xyz.vercel.app
```

Then **Deployments** → the latest → **⋯** → **Redeploy**. Environment variables are
baked in at build time; without a redeploy the change does nothing.

**B. Tell Supabase about your URL, or sign-in will silently fail.**

Supabase → **Authentication** → **URL Configuration**:
- **Site URL**: `https://proofline-xyz.vercel.app`
- **Redirect URLs**: add `https://proofline-xyz.vercel.app/**`

This is the single most common reason a deployed Supabase app "loses" the session
right after sign-in.

---

## Part 7 — Verify the deployment

Open your live URL and repeat the Part 4 checklist against production.

Then check `https://your-url.vercel.app/api/health`. It should return:

```json
{
  "ok": true,
  "capabilities": {
    "demo": true,
    "verification": true,
    "storage": true,
    "liveAnalysis": true,
    "transcription": false,
    "solanaAnchor": false
  }
}
```

If `storage` or `liveAnalysis` is `false`, an environment variable is missing or you
didn't redeploy after adding it.

**Most important check of all:** open your live URL in a private/incognito window,
signed out, and confirm `/demo` and `/verify` work perfectly. That is the state a
judge will see.

---

## Part 8 — What to submit

- **Live URL** — your Vercel URL. Point judges at `/demo` explicitly.
- **Repo** — make it public at submission time if the rules require it. Rotate your
  Supabase secret key and Anthropic key first if there is any chance one was ever
  committed.
- **Demo video** — `DEMO.md` has a three-minute path with timings.
- **Written submission** — `HACKATHON.md` is structured for Devpost. Fill in the
  team contributions section; it is deliberately left blank.

---

## Troubleshooting

| Symptom | Cause | Fix |
| --- | --- | --- |
| Build fails on Vercel, works locally | Node version | Vercel → Settings → General → set Node.js to 22.x |
| Build fails on `@solana/kit` | Optional dependency | Vercel → Settings → General → Install Command: `npm install --no-optional` |
| Sign-in works then immediately signs out | Site URL not set in Supabase | Part 6.4 B |
| Upload returns 401 | Not signed in, or Supabase vars missing | Check `/api/health` |
| Upload returns 500 | Migration not run, or `evidence` bucket missing | Re-run the migration; confirm the bucket is Private |
| Process button disabled | No `ANTHROPIC_API_KEY`, or no artifacts yet | The button text says which |
| Process returns 503 | Key missing in Vercel, or you didn't redeploy | Add it, then Redeploy |
| "Web Crypto is unavailable" | Insecure context | Vercel is https, so this only happens locally on a LAN IP. Use `localhost` |
| Audio marked failed | No transcription service | Correct behaviour. Part 3, or don't upload audio |
| Demo case blank | Fixture bundle failed validation | `npm run seed:demo`, commit, redeploy |
| Everything works but `/dashboard` says demo-only | Supabase vars not reaching the build | Confirm they're set for **Production**, then redeploy |

---

## Cost

| Service | Free tier | Realistic hackathon cost |
| --- | --- | --- |
| Vercel | Hobby: free | $0 |
| Supabase | Free: 500 MB database, 1 GB storage | $0 |
| Anthropic | None | $5–10 of credits is ample |
| OpenAI (transcription) | None | $1 or skip entirely |
| Solana devnet | Free airdrops | $0 |

Total: roughly **$5–10**, all of it Anthropic credits, and only if you want live
extraction rather than the demo case.
