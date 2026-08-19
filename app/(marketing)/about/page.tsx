import type { Metadata } from "next";
import Link from "next/link";
import { Article, Chapter, PageHeader } from "@/components/marketing/Editorial";

export const metadata: Metadata = {
  title: "About",
  description: "Why Proofline exists, who it is for, and what was built during the hackathon.",
};

export default function AboutPage() {
  return (
    <>
      <PageHeader
        eyebrow="About"
        title="Why Proofline exists"
        lede="Most people dealing with a difficult digital situation are not short of evidence. They are short of a way to hold it together."
      />

      <Article>
        <Chapter number="01" title="The situation">
          <p>
            A student pays for a laptop that does not arrive. A freelancer is told an invoice was settled when it was
            not. Someone is impersonated and needs to show, in order, what happened and when.
          </p>
          <p>
            In each case the evidence already exists — it is just spread across a phone, an inbox, a downloads folder
            and a chat export. Turning that into something another person can follow means ordering it, noticing where
            two sources disagree, and being able to point at the exact line behind every statement you make.
          </p>
          <p>
            That work is slow and easy to get wrong. It is also the part that decides whether anyone takes the account
            seriously.
          </p>
        </Chapter>

        <Chapter number="02" title="What Proofline is">
          <p>
            An evidence workspace. You add what you have; it reads each file, extracts what that file establishes, and
            assembles a chronology in which every event points back at the region of the artifact that supports it.
            Where two sources describe the same thing differently, it says so, shows both, and stops there.
          </p>
          <p>
            Alongside that, it fingerprints every file, so that months later you can tell whether a copy is the same one
            you registered.
          </p>
        </Chapter>

        <Chapter number="03" title="What it is not">
          <p>
            Proofline is not a court, an investigator, a fact-checking service or a forensic authority. It does not
            determine truth and it does not provide legal advice. It organises evidence and detects change.
          </p>
          <p>
            That restraint is the design, not a gap in it. A tool that confidently told people who was lying would be
            more impressive to demonstrate and much worse to rely on.
          </p>
        </Chapter>

        <Chapter number="04" title="Who it is for">
          <p>
            The first user is an ordinary person with a confusing incident: a marketplace dispute, a payment
            disagreement, an impersonated account, documentation of harassment, a support escalation that has gone in
            circles. Not a legal team with a case-management system.
          </p>
        </Chapter>

        <Chapter number="05" title="The principle">
          <p style={{ color: "var(--ink-primary)", fontFamily: "var(--font-display)", fontSize: "1.25rem", lineHeight: 1.4 }}>
            AI may help organise the story. The evidence must remain inspectable.
          </p>
          <p>
            Every generated statement in Proofline carries a pointer to its source, and the interface is built so that
            following that pointer is one click. If a claim cannot be traced, it does not belong in the product.
          </p>
          <p>
            <Link href="/docs" className="underline underline-offset-4" style={{ color: "var(--evidence)" }}>
              Read how it works
            </Link>{" "}
            or{" "}
            <Link href="/demo" className="underline underline-offset-4" style={{ color: "var(--evidence)" }}>
              open the demonstration case
            </Link>
            .
          </p>
        </Chapter>
      </Article>
    </>
  );
}
