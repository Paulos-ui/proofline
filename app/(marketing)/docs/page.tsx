import type { Metadata } from "next";
import Link from "next/link";
import { Article, Chapter, Code, Definition, PageHeader, Steps } from "@/components/marketing/Editorial";
import { getDemoCase } from "@/lib/demo";

export const metadata: Metadata = {
  title: "Documentation",
  description: "How Proofline processes evidence, what the AI does, how source grounding works, and what the integrity model proves.",
};

export default function DocsPage() {
  const demo = getDemoCase();

  return (
    <>
      <PageHeader
        eyebrow="Documentation"
        title="How Proofline works"
        lede="What the software does deterministically, what a model does, where the boundary is, and what each part of the output means."
      />

      <Article>
        <Chapter number="01" title="The pipeline" id="pipeline">
          <p>
            A case moves through seven stages. Each one is independent: if the analysis stage cannot run, the earlier
            stages still produce something useful, and the integrity stages still work.
          </p>
          <Steps
            steps={[
              { title: "Upload", body: "Files are validated in the browser and again on the server, where the declared type is checked against the file's actual signature." },
              { title: "Hash", body: "SHA-256 is computed in your browser with Web Crypto before the upload starts. The server recomputes it from the bytes it received; a disagreement rejects the file." },
              { title: "Understand", body: "Each artifact is sent to a vision- and PDF-capable model on its own, with a strict schema. Audio goes through a transcription adapter first." },
              { title: "Structure", body: "The response is validated against the schema. Anything that does not parse is discarded whole rather than partially trusted." },
              { title: "Connect", body: "Entity resolution merges identical identifiers and proposes — but never performs — merges based on similar names." },
              { title: "Compare", body: "Claims about the same subject are compared along one dimension at a time to find differences between sources." },
              { title: "Verify", body: "Fingerprints are combined into a Merkle root, which becomes the case's manifest." },
            ]}
          />
        </Chapter>

        <Chapter number="02" title="What the AI does, and what it does not" id="ai">
          <p>
            The model reads one artifact at a time and never sees the whole case. It returns a typed object: what the
            artifact is, who and what it mentions, what happened according to it, what was claimed in it, and which
            values look sensitive. Every item carries a source locator.
          </p>
          <p>
            Everything that spans more than one artifact is ordinary software. Chronology, identity resolution,
            difference detection, sensitive-pattern matching, hashing and the Merkle tree are all deterministic and
            testable. This split matters: the parts that could quietly fabricate a conclusion are the parts a model does
            not touch.
          </p>
          <Definition term="Never invented">
            If an artifact does not state a time, the event keeps a null timestamp and is filed under &ldquo;time not
            established&rdquo;. The schema does not allow a timestamp with unknown precision, and the database rejects
            that combination too.
          </Definition>
        </Chapter>

        <Chapter number="03" title="Source grounding" id="grounding">
          <p>
            A source locator is a typed pointer into an artifact. It is what turns a generated sentence into something
            you can check in two seconds instead of trusting.
          </p>
          <Code>{`{ artifactId, type: "image-region", bbox: { x, y, width, height }, excerpt }
{ artifactId, type: "pdf-page",     page: 3, excerpt }
{ artifactId, type: "audio-range",  startMs: 10000, endMs: 14000, transcript }
{ artifactId, type: "text-range",   startOffset, endOffset, excerpt }
{ artifactId, type: "email-field",  field: "body", excerpt }`}</Code>
          <p>
            Bounding boxes are stored as fractions of the image, not pixels, so a locator stays correct at any display
            size. Opening a source dims the rest of the artifact rather than cropping it — the region is always shown in
            context.
          </p>
          <p>
            A locator that points at an artifact other than the one being analysed causes the whole analysis to be
            rejected. A model that invents an artifact id is producing ungrounded output, and none of it is kept.
          </p>
        </Chapter>

        <Chapter number="04" title="Differences between sources" id="conflicts">
          <p>
            Each claim is normalised into a subject, a predicate and an object. Two claims are compared only when their
            subjects are close enough to plausibly refer to the same thing, and then only along one dimension: status,
            amount, time.
          </p>
          <p>
            Status vocabularies are grouped, so &ldquo;payment cleared&rdquo; and &ldquo;parcel shipped&rdquo; are never
            treated as a disagreement — they describe different things. Within a group, opposing buckets produce a
            finding.
          </p>
          <Definition term="The strongest label available">
            <strong>Potential inconsistency</strong> means two sources describe the same thing differently and someone
            should read both. Proofline has no label for lying, fraud, forgery or guilt, and cannot produce one.
          </Definition>
          <p>
            Weakly supported pairs are downgraded to <em>unresolved</em> rather than reported as findings, and pairs that
            agree are stored as <em>compatible</em> so the comparison is auditable rather than invisible.
          </p>
        </Chapter>

        <Chapter number="05" title="The integrity model" id="integrity">
          <p>
            Every artifact is hashed with SHA-256. Those digests, together with each file&apos;s size, type and name, are
            sorted deterministically and used as the leaves of a Merkle tree. The root is the case&apos;s manifest
            fingerprint.
          </p>
          <p>
            Leaves and internal nodes are hashed with different prefixes, following RFC 6962, so a leaf value can never
            be presented as an internal node. An odd node is promoted unchanged rather than duplicated, which avoids the
            ambiguity that a naive implementation has.
          </p>
          <Code>{`root  ${demo.manifest?.merkleRoot ?? ""}
case  ${demo.case.ref}
files ${demo.manifest?.artifacts.length ?? 0}`}</Code>
          <p>
            Because the leaves are sorted before hashing, the same set of files always produces the same root regardless
            of upload order — and changing one byte in one file changes it completely.
          </p>
          <Definition term="What a match proves">
            That the bytes you supplied are identical to the bytes that were fingerprinted. Nothing more. It does not
            establish authorship, accuracy, or whether the file was already altered before Proofline saw it.
          </Definition>
        </Chapter>

        <Chapter number="06" title="The optional public anchor" id="anchor">
          <p>
            A case can optionally publish its Merkle root to Solana devnet as a memo. The memo contains a version tag
            and the root — 64 hexadecimal characters — and nothing else. A guard rejects any memo that does not match
            that exact shape, so case content cannot reach a public chain even by mistake.
          </p>
          <p>
            An anchor shows that a commitment existed by a given transaction. It does not make the underlying evidence
            true, and Proofline is fully usable with anchoring switched off, which is the default.
          </p>
        </Chapter>

        <Chapter number="07" title="Confidence" id="confidence">
          <p>
            Confidence values come from the model&apos;s own assessment of its extraction. They are not calibrated
            probabilities and should not be read as one. The interface shows bands — high confidence, review suggested,
            low confidence — and keeps the numeric value for detail views where it is genuinely useful.
          </p>
          <p>
            Entity confidence rises when several artifacts corroborate the same identifier, but is capped below
            certainty. Proofline does not have a way to be certain about anything it inferred.
          </p>
        </Chapter>

        <Chapter number="08" title="Running it yourself" id="running-it">
          <p>
            The demonstration case and file verification need nothing configured. Creating your own cases needs a
            Supabase project; analysis needs a model API key.
          </p>
          <Code>{`pnpm install
cp .env.example .env.local
pnpm dev            # http://localhost:3000

# demo and /verify work immediately
# add NEXT_PUBLIC_SUPABASE_URL + keys for live cases
# add ANTHROPIC_API_KEY for artifact analysis`}</Code>
          <p>
            The repository&apos;s <code className="meta">START-HERE.md</code> covers migrations, seeding, tests and
            deployment step by step.
          </p>
        </Chapter>

        <Chapter number="09" title="Using Proofline well" id="using-it">
          <Steps
            steps={[
              { title: "Add everything at once", body: "The comparison stage only finds differences between sources it has. A case with one screenshot has nothing to compare." },
              { title: "Describe the incident", body: "A short case description helps the analysis interpret ambiguous artifacts — an unlabelled screenshot, an amount with no currency." },
              { title: "Open the sources", body: "Read the artifact behind anything you intend to rely on. The analysis is a starting point, not a finding." },
              { title: "Review the privacy list before sharing", body: "Flagged values appear in full in an export unless you mark them for redaction." },
              { title: "Keep the manifest", body: "It is the only thing needed to check a file later, and it contains no evidence content." },
            ]}
          />
          <p>
            <Link href="/limitations" className="underline underline-offset-4" style={{ color: "var(--evidence)" }}>
              Read the limitations
            </Link>{" "}
            before using Proofline for anything that matters.
          </p>
        </Chapter>
      </Article>
    </>
  );
}
