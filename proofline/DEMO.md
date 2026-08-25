# Demo script

Three minutes. The interface is built so this path needs no menu hunting.

**Setup:** open `/` in one tab. Have `public/demo/artifacts/receipt-original.png` and `receipt-modified.png` ready to drag.

---

### 0:00 — The problem

> "Seventeen screenshots, three emails, a receipt and a voice note. All of it real evidence. None of it a story anyone can follow."

Landing page. The five fragments settle into a chronological line as you talk.

### 0:20 — Open Proofline

Click **Explore a demo case**. No sign-in.

> "A marketplace laptop purchase that went wrong. Eight artifacts. Entirely synthetic — the banner says so."

### 0:30 — Evidence

Press **Evidence**.

> "Screenshots, a receipt, an email, a courier PDF, a voice note, a support transcript. Every one fingerprinted the moment it entered the case."

Point at a SHA-256 under a card.

### 0:50 — The timeline resolves

Press **Timeline**.

> "Ordered by what the evidence actually states."

Scroll to the bottom band.

> "And this — *Time not established*. The courier record proves a label was created, not that the parcel was handed over. Proofline will not guess a time to make the timeline look tidy."

### 1:15 — Source grounding

Click **View 2 sources** on *Seller states the payment has cleared*.

> "This is the whole point. Not a summary you have to trust — the exact region of the screenshot the sentence came from."

Press **Zoom to region**. Switch to the second source with the tab.

> "Two sources for the same claim. Chat, and an email at the same minute."

### 1:35 — Potential inconsistency

Press **Conflicts**. Open the first finding.

> "At 11:41 the seller says the payment cleared. At 11:47 the buyer's receipt says Pending. Both sources, side by side."

Read the label aloud.

> "*Potential inconsistency*. Not fraud, not a lie. Proofline has no label for that and cannot produce one. Sources disagree for innocent reasons too — and here support later confirms the funds sat in a review queue until the next morning."

### 1:55 — Connections

Press **Connections**. Click **M. Reyes**.

> "Parties on the inner ring, records outside it. Everywhere this person appears, clickable back to the source."

Point at a dashed link.

> "Dashed means *possible match*. That email address probably belongs to the seller — Proofline proposes it and refuses to merge them on its own."

### 2:15 — Integrity match

Press **Verify**. Drag `receipt-original.png`.

> "Hashed in the browser. Nothing uploaded."

**Integrity match.**

### 2:30 — Fingerprint mismatch

Drag `receipt-modified.png`.

> "Same receipt. One figure changed — 560 to 580."

**Fingerprint mismatch.** Point at the expected-versus-computed digests.

> "Real SHA-256, not an animation. And read what it says underneath: this detects byte-level change. It does *not* establish that the original content was truthful. That distinction is the product."

### 2:42 — Privacy and export

Press **Privacy**.

> "Account numbers, addresses, a card number found by checksum rather than by shape. Redaction applies to the export — the original file is never altered, because altering it would destroy the thing the fingerprint refers to."

Press **Export** → **Open proof pack**.

> "Chronology, sources, fingerprints, Merkle root, and its own limitations printed on the last page."

### 2:55 — Close

> "Proofline does not tell you who was right. It puts the evidence in order, shows you exactly where every statement came from, and tells you whether a file has changed since you saved it. Every claim leads back to evidence."

---

## Backup answers

**"Is the AI actually running?"** — In the live product, yes: upload an artifact and press Process. In this demonstration case the per-artifact extraction is a stored fixture so a rate limit cannot break the demo, and the banner says so. The fingerprints, Merkle root, entity resolution, conflict detection and privacy detection you just saw are all computed by the shipped engines.

**"What if the model is wrong?"** — It will be, sometimes. That is why nothing is presented without a one-click path to the source region, why confidence is shown as a band rather than a percentage, and why `/limitations` exists as a first-class page.

**"Why not put the evidence on chain?"** — Only the Merkle root goes on chain, and only if enabled. A guard rejects any memo that is not exactly `proofline:v1:<64 hex>`. Publishing evidence would be the opposite of a privacy feature.
