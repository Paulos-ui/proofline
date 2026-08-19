import type { Metadata } from "next";
import Link from "next/link";
import { VerifyPanel } from "@/components/verification/VerifyPanel";
import { getDemoCase } from "@/lib/demo";
import { MarketingHeader, MarketingFooter } from "@/components/marketing/Chrome";
import { RailLabel } from "@/components/ui/atoms";

export const metadata: Metadata = {
  title: "Verify a file",
  description:
    "Check whether a file still matches the fingerprint registered for it. Hashing happens in your browser; the file is never uploaded.",
};

export default function VerifyPage() {
  const demo = getDemoCase();

  return (
    <>
      <MarketingHeader />
      <main id="main" className="mx-auto w-full max-w-[64rem] px-4 py-14 md:px-6">
        <RailLabel>Integrity check</RailLabel>
        <h1 className="mt-2 max-w-[20ch] text-4xl leading-[1.1]" style={{ fontFamily: "var(--font-display)" }}>
          Has this file changed since it was registered?
        </h1>
        <p className="prose-editorial mt-4">
          <span>
            Proofline records a SHA-256 fingerprint for every artifact when it enters a case. Drop a file below and it
            is hashed locally, then compared against a manifest. Nothing is uploaded.
          </span>
        </p>

        <div className="mt-10">
          <VerifyPanel manifest={demo.manifest} manifestLabel="Demonstration case manifest (PL-84F2)" />
        </div>

        <section className="mt-12 grid gap-6 md:grid-cols-2">
          <div className="panel p-5">
            <RailLabel>Try it</RailLabel>
            <p className="mt-2 text-sm" style={{ color: "var(--ink-secondary)" }}>
              The demonstration manifest is loaded above. Download the two receipts below and check each one. They look
              almost identical; one figure differs.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <a href="/demo/artifacts/receipt-original.png" download className="btn btn-secondary cursor-pointer text-sm">
                receipt-original.png
              </a>
              <a href="/demo/artifacts/receipt-modified.png" download className="btn btn-secondary cursor-pointer text-sm">
                receipt-modified.png
              </a>
            </div>
            <p className="meta mt-3">
              The original is registered in the manifest. The modified copy is not, and cannot be — its bytes produce a
              different digest.
            </p>
          </div>

          <div className="panel p-5">
            <RailLabel>What a match means</RailLabel>
            <p className="mt-2 text-sm" style={{ color: "var(--ink-secondary)" }}>
              A match proves the bytes you supplied are identical to the bytes that were fingerprinted. That is all it
              proves.
            </p>
            <p className="mt-3 text-sm" style={{ color: "var(--ink-secondary)" }}>
              It does not establish who created the file, whether the content was accurate, or whether the original was
              itself edited before Proofline ever saw it.{" "}
              <Link href="/limitations" className="underline underline-offset-4" style={{ color: "var(--evidence)" }}>
                Read the limitations
              </Link>
              .
            </p>
          </div>
        </section>
      </main>
      <MarketingFooter />
    </>
  );
}
