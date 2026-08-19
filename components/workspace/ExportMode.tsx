"use client";

import type { CaseBundle, RedactionSuggestion } from "@/lib/schemas/case";
import { RailLabel, StatusPill } from "@/components/ui/atoms";
import { caseSummary } from "@/lib/utils/case-derived";
import { DeleteCaseButton } from "./DeleteCaseButton";

/**
 * The Proof Pack. It is generated as a print-ready document in a new tab, which is
 * what the browser can produce reliably; the same route drives "Save as PDF".
 */
export function ExportMode({
  bundle,
  decisions,
}: {
  bundle: CaseBundle;
  decisions: Record<string, RedactionSuggestion["decision"]>;
}) {
  const summary = caseSummary(bundle);
  const redactCount = bundle.redactions.filter((s) => (decisions[s.id] ?? s.decision) === "redact").length;
  const redactedIds = bundle.redactions
    .filter((s) => (decisions[s.id] ?? s.decision) === "redact")
    .map((s) => s.id)
    .join(",");

  const reportUrl = `/case/${bundle.case.id}/report${redactedIds ? `?redact=${encodeURIComponent(redactedIds)}` : ""}`;
  const manifestUrl = bundle.case.isSynthetic ? "/demo/manifest.json" : `/api/cases/${bundle.case.id}/manifest`;

  return (
    <div className="grid gap-6 pb-16 lg:grid-cols-2">
      <section className="panel p-5">
        <RailLabel>Proof pack</RailLabel>
        <h2 className="mt-2 text-xl" style={{ fontFamily: "var(--font-display)" }}>
          A report someone else can check
        </h2>
        <p className="mt-2 text-sm" style={{ color: "var(--ink-muted)" }}>
          The pack contains the chronology, the parties, the artifact index with fingerprints, the differences between
          sources, and the limitations of the analysis. Source references stay visible throughout.
        </p>
        <ul className="m-0 mt-4 flex list-none flex-col gap-1.5 p-0 text-sm" style={{ color: "var(--ink-secondary)" }}>
          <li>{summary.eventCount} events, {summary.claimCount} claims</li>
          <li>{summary.artifactCount} artifacts with SHA-256 fingerprints</li>
          <li>{summary.inconsistencyCount} potential inconsistencies</li>
          <li>{redactCount} values redacted in this copy</li>
        </ul>
        <div className="mt-5 flex flex-wrap gap-2">
          <a href={reportUrl} target="_blank" rel="noreferrer" className="btn btn-primary cursor-pointer">
            Open proof pack
          </a>
          <a href={manifestUrl} download className="btn btn-secondary cursor-pointer">
            Download manifest
          </a>
        </div>
        <p className="meta mt-3">
          Use your browser&apos;s print dialog and choose &ldquo;Save as PDF&rdquo; to keep a copy.
        </p>
      </section>

      <section className="panel p-5">
        <RailLabel>Before you share this</RailLabel>
        <ul className="m-0 mt-3 flex list-none flex-col gap-3 p-0 text-sm" style={{ color: "var(--ink-secondary)" }}>
          <li className="flex gap-2">
            <Bullet />
            <span>
              {summary.redactionCount > 0
                ? `${summary.redactionCount} flagged values are still awaiting a decision. They will appear in full unless you mark them for redaction.`
                : "Every flagged value has a decision recorded."}
            </span>
          </li>
          <li className="flex gap-2">
            <Bullet />
            <span>The pack states which parts were produced by automated analysis and which are file fingerprints.</span>
          </li>
          <li className="flex gap-2">
            <Bullet />
            <span>Anyone can check a file against the manifest at /verify without an account.</span>
          </li>
        </ul>
        <div className="mt-4">
          {bundle.case.isSynthetic ? <StatusPill tone="analysis" marker={false}>Synthetic demonstration data</StatusPill> : null}
        </div>

        {!bundle.case.isSynthetic ? (
          <div className="mt-6 border-t pt-4" style={{ borderColor: "var(--border-subtle)" }}>
            <RailLabel>Remove this case</RailLabel>
            <p className="mb-3 mt-2 text-sm" style={{ color: "var(--ink-muted)" }}>
              Deletion removes the stored evidence as well as the records derived from it.
            </p>
            <DeleteCaseButton caseId={bundle.case.id} caseRef={bundle.case.ref} />
          </div>
        ) : null}
      </section>
    </div>
  );
}

function Bullet() {
  return (
    <svg width="10" height="14" viewBox="0 0 10 14" aria-hidden="true" className="mt-1 shrink-0">
      <path d="M1 7 H9" stroke="var(--trace-active)" strokeWidth="1.2" />
      <circle cx="9" cy="7" r="1.6" fill="var(--trace-active)" />
    </svg>
  );
}
