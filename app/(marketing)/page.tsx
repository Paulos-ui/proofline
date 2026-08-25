import Link from "next/link";
import { InteractiveHero } from "@/components/marketing/InteractiveHero";
import { Reveal } from "@/components/marketing/Reveal";
import { CountUp } from "@/components/marketing/CountUp";
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
      {/* Hero: a claim, then the product doing the thing the claim describes. */}
      <section className="mx-auto w-full max-w-[76rem] px-4 pb-6 pt-14 md:px-6 md:pt-20">
        <div className="max-w-[44rem]">
          <span
            className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs"
            style={{ borderColor: "var(--border-strong)", color: "var(--ink-muted)", letterSpacing: "0.04em" }}
          >
            <span className="h-1.5 w-1.5 rounded-full" style={{ background: "var(--signal)" }} aria-hidden="true" />
            Evidence you can actually stand behind
          </span>
          <h1 className="mt-4 text-[clamp(2.35rem,5.4vw,3.9rem)] leading-[1.03]" style={{ fontFamily: "var(--font-display)" }}>
            Seventeen screenshots
            <br />
            isn&apos;t a story.
            <br />
            <span style={{ color: "var(--evidence)" }}>Proofline makes it one.</span>
          </h1>
          <p className="prose-editorial mt-5 max-w-[52ch]">
            <span>
              Drop in your screenshots, receipts, emails and voice notes. Get back one clear timeline where every line
              points to exactly where it came from, and you can prove nothing was quietly changed.
            </span>
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link href="/demo" className="btn btn-primary cursor-pointer">
              See it work (no sign-up)
            </Link>
            <Link href="/sign-up" className="btn btn-secondary cursor-pointer">
              Start your own case
            </Link>
          </div>
        </div>

        <div className="mt-10">
          <InteractiveHero />
        </div>
      </section>

      {/* The problem — warmer, more human framing. */}
      <Section eyebrow="Why this is hard" title="The truth is in there. It's just scattered.">
        <div className="grid gap-10 md:grid-cols-2">
          <Reveal>
            <p className="prose-editorial">
              <span>
                When something goes wrong online, the proof is already spread across five apps by the time you need it: a
                chat screenshot on your phone, a receipt buried in email, a courier PDF, a voice note you never played
                twice.
              </span>
            </p>
            <p className="prose-editorial mt-4">
              <span>
                Piecing it together means putting it in order, spotting where two things quietly disagree, and being
                able to point at the exact line behind every claim. That&apos;s the slow part and the part people get
                wrong under pressure.
              </span>
            </p>
          </Reveal>
          <ul className="m-0 flex list-none flex-col gap-0 p-0">
            {[
              ["Time", "One source gives a time. One gives a date. One gives nothing — and pretending otherwise is a lie of its own."],
              ["Identity", "The same person shows up as a nickname, a handle, and an email — and it's easy to think they're three people."],
              ["Disagreement", "Two sources describe the same moment differently, and it slips right past you."],
              ["Change", "Nothing tells you whether a file is still the one you saved last month."],
            ].map(([term, description], i) => (
              <li key={term} className="border-t" style={{ borderColor: "var(--border-subtle)" }}>
                <Reveal delay={i * 70} className="py-4">
                  <p className="rail-label">{term}</p>
                  <p className="mt-1.5 text-sm" style={{ color: "var(--ink-secondary)" }}>
                    {description}
                  </p>
                </Reveal>
              </li>
            ))}
          </ul>
        </div>
      </Section>

      {/* Source grounding. */}
      <Section eyebrow="How you can trust it" title="Every claim points back to the receipt.">
        <div className="grid gap-8 lg:grid-cols-[1fr_1.15fr]">
          <Reveal>
            <p className="prose-editorial">
              <span>
                Proofline never just summarises your evidence and asks you to take its word. Every event, claim and
                connection remembers exactly where it came from the file, and the spot inside it.
              </span>
            </p>
            <p className="prose-editorial mt-4">
              <span>
                For an image that&apos;s a box drawn on the picture. For a PDF, the page. For audio, the seconds. Tap
                &ldquo;View source&rdquo; and the artifact opens with that exact spot lit up.
              </span>
            </p>
            <Link href="/demo" className="btn btn-secondary mt-6 cursor-pointer">
              Try it in the demo
            </Link>
          </Reveal>

          <Reveal delay={90}>
            <figure className="panel lift m-0 overflow-hidden">
              <div className="border-b p-4" style={{ borderColor: "var(--border-subtle)" }}>
                <p className="meta" style={{ color: "var(--evidence)" }}>11:41</p>
                <p className="mt-1 text-sm font-medium">Seller says the payment has cleared</p>
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
          </Reveal>
        </div>
      </Section>

      {/* Integrity. */}
      <Section eyebrow="Proof it hasn't changed" title="A fingerprint, not a verdict.">
        <div className="grid gap-8 md:grid-cols-[1.1fr_1fr]">
          <Reveal>
            <p className="prose-editorial">
              <span>
                Every file gets a SHA-256 fingerprint in your browser, before it uploads. Those fingerprints fold into a
                single Merkle root that stands for the whole case.
              </span>
            </p>
            <p className="prose-editorial mt-4">
              <span>
                Later, anyone can check a file against that record. A match proves the bytes are identical to what was
                registered. It does <em>not</em> prove the content was ever true and Proofline tells you that, on
                screen, every single time.
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
          </Reveal>
          <Reveal delay={90}>
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
                This root is computed from the eight synthetic files this site serves. It is not decorative.
              </p>
            </div>
          </Reveal>
        </div>
      </Section>

      {/* Live proof-point strip with count-ups. */}
      <section className="mx-auto w-full max-w-[76rem] px-4 py-4 md:px-6">
        <Reveal>
          <div
            className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border md:grid-cols-4"
            style={{ borderColor: "var(--border-subtle)", background: "var(--border-subtle)" }}
          >
            {[
              [summary.artifactCount, "", "artifacts, one timeline"],
              [summary.eventCount, "", "events, each sourced"],
              [summary.inconsistencyCount, "", "differences surfaced"],
              [100, "%", "of claims traceable"],
            ].map(([n, suffix, label]) => (
              <div key={label as string} className="p-5" style={{ background: "var(--surface-elevated)" }}>
                <p className="text-3xl" style={{ fontFamily: "var(--font-display)", color: "var(--evidence)" }}>
                  <CountUp to={n as number} suffix={suffix as string} />
                </p>
                <p className="mt-1 text-sm" style={{ color: "var(--ink-muted)" }}>
                  {label}
                </p>
              </div>
            ))}
          </div>
        </Reveal>
      </section>

      {/* Limits. */}
      <Section eyebrow="Being straight with you" title="What Proofline will never do.">
        <ul className="m-0 grid list-none gap-px p-0 md:grid-cols-3" style={{ background: "var(--border-subtle)" }}>
          {[
            ["It won't decide who's right", "When two sources disagree, it shows you both and names the difference. It never concludes that someone lied."],
            ["It won't vouch for content", "A fingerprint match catches byte-level change. It says nothing about whether the original was genuine."],
            ["It won't replace your judgement", "Automated reading gets things wrong. Everything it produces links to a source, so you can check it yourself."],
          ].map(([title, body], i) => (
            <li key={title} style={{ background: "var(--surface-primary)" }}>
              <Reveal delay={i * 70} className="block p-5">
                <h3 className="text-base leading-snug" style={{ fontFamily: "var(--font-display)" }}>
                  {title}
                </h3>
                <p className="mt-2 text-sm" style={{ color: "var(--ink-muted)" }}>
                  {body}
                </p>
              </Reveal>
            </li>
          ))}
        </ul>
      </Section>

      {/* Close. */}
      <section className="mx-auto w-full max-w-[76rem] px-4 py-20 md:px-6">
        <Reveal>
          <TraceRule nodes={5} active={4} />
          <h2 className="mt-8 max-w-[18ch] text-[clamp(1.75rem,4vw,2.75rem)] leading-tight" style={{ fontFamily: "var(--font-display)" }}>
            Start with what you already have.
          </h2>
          <p className="prose-editorial mt-3 max-w-[48ch]">
            <span>
              Screenshots, PDFs, receipts, emails, images, text files, audio they can all become part of the same
              timeline in a few minutes.
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
        </Reveal>
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
      <Reveal>
        <div className="mb-8 flex items-baseline gap-4">
          <RailLabel>{eyebrow}</RailLabel>
          <div className="h-px grow" style={{ background: "var(--border-subtle)" }} />
        </div>
        <h2 className="max-w-[26ch] text-[clamp(1.5rem,3vw,2.35rem)] leading-tight" style={{ fontFamily: "var(--font-display)" }}>
          {title}
        </h2>
      </Reveal>
      <div className="mt-8">{children}</div>
    </section>
  );
}
