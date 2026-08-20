import Link from "next/link";
import { HeroTrace } from "@/components/marketing/HeroTrace";
import { TraceRule } from "@/components/brand/Trace";
import { RailLabel, StatusPill } from "@/components/ui/atoms";
import { getDemoCase } from "@/lib/demo";
import { caseSummary } from "@/lib/utils/case-derived";
import { shortHash } from "@/lib/integrity/hash";

export default function LandingPage() {
  const demo = getDemoCase();
  const summary = caseSummary(demo);

  return (
    <>
      <section className="mx-auto w-full max-w-[76rem] px-4 pb-4 pt-14 md:px-6 md:pt-20">
        <div className="max-w-[42rem]">
          <RailLabel>Evidence organisation and integrity</RailLabel>
          <h1 className="mt-3 text-[clamp(2.25rem,5.2vw,3.75rem)] leading-[1.04]" style={{ fontFamily: "var(--font-display)" }}>
            Scattered evidence.
            <br />
            One traceable story.
          </h1>
          <p className="prose-editorial mt-5">
            <span>
              Proofline turns screenshots, documents, messages, receipts and audio into a structured timeline where
              every important claim leads back to its source  and gives you a way to tell, later, whether a file has
              changed.
            </span>
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link href="/demo" className="btn btn-primary cursor-pointer">
              Explore a demo case
            </Link>
            <Link href="/sign-up" className="btn btn-secondary cursor-pointer">
              Create a case
            </Link>
          </div>
          <p className="meta mt-3">No account needed for the demonstration case.</p>
        </div>
      </section>

      <section className="mx-auto w-full max-w-[76rem] px-4 md:px-6" aria-label="How scattered artifacts become a chronology">
        <HeroTrace />
      </section>

      {/* ---------------------------------------------------------------- */}

      <Section eyebrow="The problem" title="Seventeen screenshots is not a story">
        <div className="grid gap-10 md:grid-cols-2">
          <div>
            <p className="prose-editorial">
              <span>
                When something goes wrong online, the evidence is already scattered by the time you need it: a chat
                screenshot on your phone, a receipt in an email, a PDF from a courier, a voice note you never listened
                to twice.
              </span>
            </p>
            <p className="prose-editorial mt-4">
              <span>
                Working out what actually happened means putting them in order, noticing that two of them disagree, and
                being able to point at the exact line that supports each thing you say. That is slow, and it is the part
                people get wrong.
              </span>
            </p>
          </div>
          <ul className="m-0 flex list-none flex-col gap-0 p-0">
            {[
              ["Timestamps", "Some sources state a time. Some state a date. Some state nothing at all."],
              ["Identity", "The same person appears as a nickname, a handle and an email address."],
              ["Disagreement", "Two sources describe the same moment differently, and it is easy to miss."],
              ["Change", "Nothing tells you whether a file is the same one you saved last month."],
            ].map(([term, description]) => (
              <li key={term} className="border-t py-4" style={{ borderColor: "var(--border-subtle)" }}>
                <p className="rail-label">{term}</p>
                <p className="mt-1.5 text-sm" style={{ color: "var(--ink-secondary)" }}>
                  {description}
                </p>
              </li>
            ))}
          </ul>
        </div>
      </Section>

      <Section eyebrow="Source grounding" title="Every claim leads somewhere">
        <div className="grid gap-8 lg:grid-cols-[1fr_1.15fr]">
          <div>
            <p className="prose-editorial">
              <span>
                Proofline does not summarise your evidence and ask you to trust it. Each generated event, claim and
                relationship stores a source locator: the artifact, and the region within it.
              </span>
            </p>
            <p className="prose-editorial mt-4">
              <span>
                For an image that means a bounding box. For a PDF, a page. For audio, a start and end time. Clicking
                &ldquo;View source&rdquo; opens the artifact with that exact region brought forward.
              </span>
            </p>
            <Link href="/demo" className="btn btn-secondary mt-6 cursor-pointer">
              See it in the demo case
            </Link>
          </div>

          <figure className="panel m-0 overflow-hidden">
            <div className="border-b p-4" style={{ borderColor: "var(--border-subtle)" }}>
              <p className="meta">11:41</p>
              <p className="mt-1 text-sm font-medium">Seller states the payment has cleared</p>
              <p className="mt-1 text-sm" style={{ color: "var(--ink-muted)" }}>
                2 sources · chat screenshot, email
              </p>
            </div>
            <div className="p-4">
              <p className="rail-label">Supporting source</p>
              <blockquote className="m-0 mt-2 border-l-2 pl-3 text-sm" style={{ borderColor: "var(--trace-active)" }}>
                “The payment has cleared on my end. Posting it out shortly.”
                <footer className="meta mt-1.5">— chat-02-payment-claim.png · image region</footer>
              </blockquote>
              <div className="mt-4 flex items-center gap-2">
                <StatusPill tone="conflict">Potential inconsistency</StatusPill>
                <span className="meta">a later receipt shows Pending</span>
              </div>
            </div>
          </figure>
        </div>
      </Section>

      <Section eyebrow="Integrity" title="A fingerprint, not a verdict">
        <div className="grid gap-8 md:grid-cols-[1.1fr_1fr]">
          <div>
            <p className="prose-editorial">
              <span>
                Every artifact is hashed with SHA-256 in your browser before it is uploaded. Those fingerprints are
                combined into a Merkle root that represents the case&apos;s evidence set.
              </span>
            </p>
            <p className="prose-editorial mt-4">
              <span>
                Later, anyone can check a file against that manifest. A match proves the bytes are identical to the
                bytes that were registered. It does not prove the content was ever true — and Proofline says so, in the
                interface, every time.
              </span>
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link href="/verify" className="btn btn-secondary cursor-pointer">
                Check a file
              </Link>
              <Link href="/docs#integrity" className="btn btn-quiet cursor-pointer">
                How the manifest works
              </Link>
            </div>
          </div>
          <div className="panel p-5">
            <RailLabel>Demonstration case manifest</RailLabel>
            <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-5 gap-y-2">
              <dt className="rail-label">Case</dt>
              <dd className="meta">{demo.case.ref}</dd>
              <dt className="rail-label">Artifacts</dt>
              <dd className="meta">{summary.artifactCount}</dd>
              <dt className="rail-label">Merkle root</dt>
              <dd className="meta break-all">{demo.manifest?.merkleRoot ?? "—"}</dd>
              <dt className="rail-label">Short</dt>
              <dd className="meta">{demo.manifest ? shortHash(demo.manifest.merkleRoot) : "—"}</dd>
            </dl>
            <p className="meta mt-4">
              This root is computed from the eight synthetic files served by this site. It is not decorative.
            </p>
          </div>
        </div>
      </Section>

      <Section eyebrow="What it will not do" title="The limits are part of the product">
        <ul className="m-0 grid list-none gap-px p-0 md:grid-cols-3" style={{ background: "var(--border-subtle)" }}>
          {[
            ["It does not decide who is right", "When two sources disagree, Proofline shows both and labels the difference. It never concludes that someone lied."],
            ["It does not authenticate content", "A fingerprint match detects byte-level change. It says nothing about whether the original was genuine."],
            ["It does not replace judgement", "Automated extraction misreads things. Everything it produces is linked to a source so you can check it."],
          ].map(([title, body]) => (
            <li key={title} className="p-5" style={{ background: "var(--surface-primary)" }}>
              <h3 className="text-base leading-snug" style={{ fontFamily: "var(--font-display)" }}>
                {title}
              </h3>
              <p className="mt-2 text-sm" style={{ color: "var(--ink-muted)" }}>
                {body}
              </p>
            </li>
          ))}
        </ul>
      </Section>

      <section className="mx-auto w-full max-w-[76rem] px-4 py-20 md:px-6">
        <TraceRule nodes={5} active={4} />
        <h2 className="mt-8 max-w-[18ch] text-3xl leading-tight" style={{ fontFamily: "var(--font-display)" }}>
          Start with what you have.
        </h2>
        <p className="prose-editorial mt-3">
          <span>
            Screenshots, PDFs, receipts, emails, images, text files and audio can all become part of the same timeline.
          </span>
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link href="/demo" className="btn btn-primary cursor-pointer">
            Explore a demo case
          </Link>
          <Link href="/docs" className="btn btn-secondary cursor-pointer">
            Read the documentation
          </Link>
        </div>
      </section>
    </>
  );
}

function Section({
  eyebrow,
  title,
  children,
}: {
  eyebrow: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mx-auto w-full max-w-[76rem] px-4 py-16 md:px-6 md:py-20">
      <div className="mb-8 flex items-baseline gap-4">
        <RailLabel>{eyebrow}</RailLabel>
        <div className="h-px grow" style={{ background: "var(--border-subtle)" }} />
      </div>
      <h2 className="mb-8 max-w-[24ch] text-[clamp(1.5rem,3vw,2.25rem)] leading-tight" style={{ fontFamily: "var(--font-display)" }}>
        {title}
      </h2>
      {children}
    </section>
  );
}
