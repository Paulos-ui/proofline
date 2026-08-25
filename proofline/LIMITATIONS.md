# Limitations

Every item here is a real constraint of the system. The same content is a first-class page in the product at `/limitations`, not footer text.

## Automated analysis misreads things

Extraction runs on screenshots that are cropped, compressed, partially legible or ambiguous. It will sometimes attribute a message to the wrong person, misread a figure, or describe an event the artifact does not establish. Every generated item carries a source locator, and opening the source is one click, because the analysis is a first pass — not a finding.

## A difference between sources is not deception

A *potential inconsistency* means two sources describe the same subject differently. Sources disagree for innocent reasons: a stale screen, a status that changed between two moments, a rounded figure, a timezone difference.

Proofline has no classification for lying, fraud, forgery or guilt. It cannot produce one. Adding one would misrepresent what the comparison establishes.

## A fingerprint match is narrow

A SHA-256 match proves the bytes supplied are identical to the bytes registered. It does not prove the content was accurate, that the file was created by whom it appears to be, or that it was not already altered before Proofline saw it.

A mismatch is equally narrow: bytes can differ because a file was re-saved, re-compressed by a messaging app, or converted — not only because someone altered it deliberately.

A public anchor adds evidence that a commitment existed by a certain transaction. It says nothing about the truth of what was committed to.

## Chronology has gaps by design

An event receives a time only when a source states one. Events without one are listed separately rather than estimated into position, so a timeline can have real gaps. Timezones come from the case setting, so a screenshot taken elsewhere can sit in the wrong relative position.

## Identity resolution is deliberately cautious

Mentions merge only on an exact deterministic identifier. Similar names produce a *possible match* requiring confirmation, so the same person can appear twice. That is the intended failure mode — silently merging two different people is far worse.

## Confidence is self-assessment

Confidence values are the model's estimate of whether it read something correctly. They are not calibrated probabilities, are not rigorously comparable across artifacts, and a high value is not evidence of correctness.

## Sensitive-value detection is incomplete

Pattern matching finds common formats and misses unusual ones, while flagging things that are not sensitive. Faces and handwritten details are found only when the model notices them. Review artifacts yourself before sharing an export.

## Privacy claims

There is no end-to-end encryption. Evidence is encrypted in transit and at rest by the storage provider, and the server can read it — it must, in order to analyse it. Processing sends evidence to the configured model provider.

## Known gaps in this build

- **Audio** is analysed only when a transcription service is configured. Without one, audio artifacts are marked *needs review* rather than treated as analysed. The demonstration case ships a labelled seeded transcript.
- **Export** is a print-ready HTML document rather than a server-generated PDF. Browser "Save as PDF" produces a better result here than a server-side renderer, and it works identically on every deployment. This is a deliberate trade-off, documented rather than faked.
- **Difference detection** compares status, amount and subject. It does not yet compare stated times against each other.
- **PDF locators** record a page and an excerpt. A bounding box within the page is optional and usually absent, because reliable in-page coordinates need a PDF text-layer extraction pass that is not implemented.
- **Case sharing** is not implemented. RLS grants access to the owner only; there is no share table yet.
- **Redaction of image regions** is recorded and reported in the proof pack, but exported artifact copies with pixels masked are not generated — the export redacts text and reports which image regions were marked.
- **Playwright end-to-end tests** are written and configured but were not executed in the build environment used to produce this repository, because the browser download endpoint was unreachable there. They are expected to pass on a machine with network access; treat them as unverified until you run them.
- **The demonstration case** uses a hand-authored stand-in for the model's per-artifact extraction. This is labelled in the interface, and every other part of that case is computed by the shipped engines.

## Not a substitute for judgement

Proofline is not a court, an investigator, a fact-checking authority or a forensic certification service. It does not provide legal advice. Do not make an important decision on automated analysis alone.
