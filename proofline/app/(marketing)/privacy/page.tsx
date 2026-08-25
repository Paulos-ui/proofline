import type { Metadata } from "next";
import { Article, Chapter, Definition, PageHeader } from "@/components/marketing/Editorial";

export const metadata: Metadata = {
  title: "Privacy",
  description: "Where evidence is stored, who can reach it, what is sent to a model provider, and how to delete everything.",
};

export default function PrivacyPage() {
  return (
    <>
      <PageHeader
        eyebrow="Privacy"
        title="Where your evidence goes"
        lede="Proofline handles material people would not want anywhere else. This page states plainly what happens to it."
      />

      <Article>
        <Chapter number="01" title="Storage">
          <p>
            Evidence is stored in a private bucket. There are no public URLs for it. When the workspace needs to display
            a file it requests a signed URL that expires after five minutes.
          </p>
          <p>
            Row level security is enforced in the database, not only in the application: a case is reachable only by the
            account that owns it, and every child record — artifacts, events, claims, sources, redaction suggestions —
            is gated by a policy that walks back to that owner.
          </p>
          <Definition term="Storage paths">
            Object keys are built as user id / case id / artifact id. Filenames are never used to build a path, so a
            crafted filename cannot reach another account&apos;s data.
          </Definition>
        </Chapter>

        <Chapter number="02" title="What is sent to a model provider">
          <p>
            When you process a case, each artifact is sent to the configured model provider for analysis. For images and
            PDFs that means the file itself. For text and email it is the text. For audio, the file goes to the
            configured transcription service first, and the resulting transcript is analysed.
          </p>
          <p>
            The default configuration uses Anthropic for analysis. If you host Proofline yourself, whichever provider you
            configure is the one that receives your evidence, subject to that provider&apos;s own terms.
          </p>
          <p>
            The demonstration case sends nothing anywhere. Its analysis is a stored fixture.
          </p>
        </Chapter>

        <Chapter number="03" title="Hashing happens in your browser">
          <p>
            Fingerprints are computed locally with the Web Crypto API before an upload begins. On the verification page,
            nothing is uploaded at all: the file is read in the browser, hashed, and only the digest is compared against
            a manifest.
          </p>
        </Chapter>

        <Chapter number="04" title="Sensitive values">
          <p>
            Proofline flags addresses, phone numbers, account numbers, identifiers, usernames and wallet addresses as
            candidates for redaction, using deterministic pattern matching first and model suggestions second.
          </p>
          <p>
            Redaction applies to exported copies only. The original artifact is never modified — altering the file you
            uploaded would destroy the thing its fingerprint refers to.
          </p>
        </Chapter>

        <Chapter number="05" title="Deletion">
          <p>
            Deleting a case removes the case record, every derived record, and the stored bytes. If the stored files
            cannot be removed, the deletion fails rather than leaving orphaned evidence behind with no record pointing
            at it.
          </p>
        </Chapter>

        <Chapter number="06" title="What Proofline does not claim">
          <p>
            There is no end-to-end encryption. Evidence is encrypted in transit and at rest by the storage provider, and
            the server can read it — it has to, in order to analyse it. Claiming otherwise would be false.
          </p>
          <p>
            Please also consider whether material involving other people is yours to upload. Proofline cannot tell
            whether you have permission, and it does not ask.
          </p>
        </Chapter>
      </Article>
    </>
  );
}
