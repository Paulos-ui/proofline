import type { Metadata } from "next";
import { Article, Chapter, Definition, PageHeader } from "@/components/marketing/Editorial";

export const metadata: Metadata = {
  title: "Limitations",
  description: "What Proofline can get wrong, what a fingerprint match does and does not prove, and where automated analysis should not be relied on.",
};

export default function LimitationsPage() {
  return (
    <>
      <PageHeader
        eyebrow="Limitations"
        title="What this will get wrong"
        lede="Every claim on this page is a real constraint of the system, not a disclaimer written to be ignored."
      />

      <Article>
        <Chapter number="01" title="Automated analysis misreads things">
          <p>
            Extraction runs on screenshots that are cropped, compressed, partially legible or ambiguous. It will
            sometimes attribute a message to the wrong person, misread a figure, or describe an event that the artifact
            does not actually establish.
          </p>
          <p>
            This is why every generated item carries a source locator and why the interface makes opening the source one
            click. Treat the analysis as a first pass by someone who has read the files quickly, not as a finding.
          </p>
        </Chapter>

        <Chapter number="02" title="A difference is not deception">
          <p>
            When Proofline labels something a potential inconsistency, it means two sources describe the same subject
            differently. Sources disagree for many innocent reasons: one party saw a stale screen, a status changed
            between two moments, someone rounded a figure, a timestamp was in another timezone.
          </p>
          <Definition term="There is no stronger label">
            Proofline has no classification for lying, fraud, forgery or guilt. It cannot produce one, and adding one
            would misrepresent what the comparison actually establishes.
          </Definition>
        </Chapter>

        <Chapter number="03" title="A fingerprint match is narrow" id="integrity">
          <p>
            A SHA-256 match proves the bytes you supplied are identical to the bytes registered earlier. It does not
            prove that the content was accurate, that the file was created by whom it appears to be, or that it was not
            already edited before Proofline first saw it.
          </p>
          <p>
            A mismatch is equally narrow. It means the bytes differ — which can happen because a file was re-saved,
            re-compressed by a messaging app, or converted, not only because someone altered it deliberately.
          </p>
          <p>
            A public anchor adds one thing: evidence that a commitment existed by a certain transaction. It says nothing
            about the truth of what was committed to.
          </p>
        </Chapter>

        <Chapter number="04" title="Chronology has gaps">
          <p>
            Proofline will not place an event in time unless a source establishes a time. Events without one are listed
            separately rather than estimated into position, which means a timeline can have real gaps. That is more
            honest than a neat sequence built on guesses.
          </p>
          <p>
            Timezones are taken from the case setting. A screenshot taken in another timezone can therefore appear in
            the wrong position relative to the rest.
          </p>
        </Chapter>

        <Chapter number="05" title="Identity resolution is deliberately cautious">
          <p>
            Two mentions are merged only when a deterministic identifier matches exactly. Similar names produce a
            &ldquo;possible match&rdquo; that you must confirm. This means the same person can appear twice. That is the
            intended failure: silently merging two different people is far worse.
          </p>
        </Chapter>

        <Chapter number="06" title="Confidence is self-assessment">
          <p>
            Confidence values are the model&apos;s own estimate of whether it read something correctly. They are not
            calibrated probabilities, they are not comparable across artifacts in any rigorous way, and a high value is
            not evidence of correctness.
          </p>
        </Chapter>

        <Chapter number="07" title="Sensitive-value detection is incomplete">
          <p>
            Pattern matching finds common formats. It will miss values written unusually, and it flags things that are
            not sensitive. Faces and handwritten details in images are only found when the model notices them. Review
            the artifacts yourself before sharing an export.
          </p>
        </Chapter>

        <Chapter number="08" title="Responsible use" id="responsible-ai">
          <ul className="m-0 flex list-none flex-col gap-3 p-0 text-sm" style={{ color: "var(--ink-secondary)" }}>
            <li>Review extracted events before relying on them. The analysis can be wrong in ways that read fluently.</li>
            <li>Do not present a potential inconsistency as proof that someone was dishonest.</li>
            <li>Do not treat a fingerprint match as authentication of content.</li>
            <li>Avoid uploading sensitive material casually — processing sends it to a model provider.</li>
            <li>Obtain permission before uploading data about other people where that is required of you.</li>
            <li>Proofline does not provide legal advice, and is not a substitute for it.</li>
            <li>Do not make an important decision on automated analysis alone.</li>
            <li>Deletion is available for every case and removes the stored evidence with it.</li>
          </ul>
        </Chapter>

        <Chapter number="09" title="Known gaps in this build">
          <ul className="m-0 flex list-none flex-col gap-3 p-0 text-sm" style={{ color: "var(--ink-secondary)" }}>
            <li>Audio is analysed only when a transcription service is configured. Without one, an audio artifact is marked failed with that reason rather than being treated as analysed.</li>
            <li>Export is a print-ready document rather than a server-generated PDF. Use the browser&apos;s &ldquo;Save as PDF&rdquo;.</li>
            <li>Difference detection compares status, amount and subject. It does not yet compare stated times against each other.</li>
            <li>PDF locators record a page and an excerpt; a bounding box within the page is optional and often absent.</li>
            <li>Cases cannot yet be shared with another account.</li>
          </ul>
        </Chapter>
      </Article>
    </>
  );
}
