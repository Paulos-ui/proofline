# Testing

```bash
npm run typecheck   # tsc --noEmit, strict, noUncheckedIndexedAccess
npm run lint        # eslint with next/core-web-vitals + next/typescript
npm run test        # 130 unit and integration tests, no network
npm run test:e2e    # Playwright critical path (downloads a browser on first run)
```

## What is covered

**Integrity — `tests/unit/integrity.test.ts` (20)**
Published SHA-256 vectors for `""` and `"abc"`; one-byte change detection; Merkle determinism, order sensitivity, leaf/node domain separation, inclusion proofs over odd leaf counts; manifest order normalisation, tamper detection, and match/mismatch reporting.

**Extraction — `tests/unit/extraction-schema.test.ts` (12)**
Schema acceptance and rejection: no locator, out-of-range bbox, out-of-range confidence, prose instead of an object, unknown artifact type. Null timestamps stay null. Locator ownership enforcement.

**Timeline — `tests/unit/timeline.test.ts` (11)**
Chronological ordering independent of input order, undated events excluded from the chronology, unparseable timestamps treated as unknown, precision tie-breaking, day banding, and formatting that never shows more precision than the source stated.

**Entities — `tests/unit/entities.test.ts` (11)**
Gmail dot/plus normalisation, phone last-ten matching, address local-part tokens, exact merges, refusal to merge similar names, cross-type damping, identity-versus-product gating, confidence capped below certainty.

**Conflicts — `tests/unit/conflicts.test.ts` (13)**
Status vocabularies and group separation, candidate gating on subject similarity, same-locator exclusion, opposing-status classification, compatible pairs, amount differences, downgrade to unresolved on weak support, ordering, and assertions that no output ever accuses anyone.

**Privacy — `tests/unit/privacy.test.ts` (11)**
Email, phone, wallet and username detection; Luhn gating so ordinary long numbers are not called account numbers; overlap resolution; determinism; masking that keeps a value recognisable without reprinting it; redaction applied only to accepted items and to exports only.

**Upload validation — `tests/unit/validate.test.ts` (12)**
Extension/type agreement, `.eml` misreported as text, size and empty-file limits, magic-byte sniffing, binary-disguised-as-text rejection, traversal-safe display names, id-based storage paths.

**Anchor — `tests/unit/anchor.test.ts` (5)**
Memo shape, and refusal to publish anything beyond a Merkle root.

**Demo case — `tests/integration/demo-case.test.ts` (11)**
Rehashes all eight artifacts from disk and compares against the stored fingerprints; verifies the manifest root is reproducible; confirms the original receipt matches and the modified copy does not; asserts every locator points at an artifact that exists and every bbox is in range; confirms the expected potential inconsistency exists and that no explanation accuses anyone; confirms an undated event stays out of the chronology.

## End-to-end

`tests/e2e/critical-path.spec.ts` follows the demo path: landing → demo → timeline → source panel → conflict with both sources → graph → verify match → verify mismatch → proof pack, plus keyboard-focus and single-`h1` checks, across desktop and mobile viewports.

**These specs have not been executed in the environment that produced this repository** — the Playwright browser download endpoint was unreachable there. Run `npx playwright install chromium && npm run test:e2e` on a machine with network access before relying on them.

## Manual checks performed

- Production build with TypeScript checking: passes.
- Lint: clean.
- All 12 routes return 200 in dev with no server errors logged.
- `/api/health` reports capabilities honestly with nothing configured.
- The landing page and proof pack render the real Merkle root from the built fixture.

## Not yet automated

- Automated accessibility auditing (axe) — semantic structure, focus visibility, reduced motion, ARIA labelling and non-colour status indication were implemented and reviewed by hand, but not machine-checked.
- Visual regression.
- Load and rate-limit behaviour of the processing endpoint.
