"use client";

import type { CaseBundle } from "@/lib/schemas/case";
import { caseSummary } from "@/lib/utils/case-derived";
import { RailLabel, StatusPill } from "@/components/ui/atoms";
import { shortHash } from "@/lib/integrity/hash";
import { buildTimeline } from "@/lib/timeline/engine";
import { formatDate } from "@/lib/utils/format";
import type { WorkspaceMode } from "./TraceNav";

export function OverviewMode({ bundle, onGo }: { bundle: CaseBundle; onGo: (mode: WorkspaceMode) => void }) {
  const summary = caseSummary(bundle);
  const timeline = buildTimeline(bundle.events, bundle.case.incidentTimezone);

  const findings: Array<{ label: string; value: string; mode: WorkspaceMode; tone?: "conflict" | "warning" }> = [
    { label: "Artifacts", value: String(summary.artifactCount), mode: "evidence" },
    { label: "Events placed in time", value: `${timeline.dated.length} of ${summary.eventCount}`, mode: "timeline" },
    { label: "Parties and records", value: String(summary.entityCount), mode: "connections" },
    {
      label: "Potential inconsistencies",
      value: String(summary.inconsistencyCount),
      mode: "conflicts",
      ...(summary.inconsistencyCount > 0 ? { tone: "conflict" as const } : {}),
    },
    {
      label: "Sensitive values to review",
      value: String(summary.redactionCount),
      mode: "privacy",
      ...(summary.redactionCount > 0 ? { tone: "warning" as const } : {}),
    },
  ];

  return (
    <div className="grid gap-8 pb-16 lg:grid-cols-[1fr_18rem]">
      <div>
        <h2 className="text-xl" style={{ fontFamily: "var(--font-display)" }}>
          What this case contains
        </h2>
        {bundle.case.description ? (
          <p className="mt-2 max-w-[64ch] text-sm leading-relaxed" style={{ color: "var(--ink-secondary)" }}>
            {bundle.case.description}
          </p>
        ) : null}

        <dl className="mt-6 grid gap-px border" style={{ borderColor: "var(--border-subtle)", background: "var(--border-subtle)" }}>
          {findings.map((finding) => (
            <div key={finding.label} className="flex items-center justify-between gap-4 p-4" style={{ background: "var(--surface-elevated)" }}>
              <div>
                <dt className="text-sm" style={{ color: "var(--ink-secondary)" }}>
                  {finding.label}
                </dt>
                <dd
                  className="mt-0.5 text-2xl"
                  style={{
                    fontFamily: "var(--font-display)",
                    color: finding.tone === "conflict" ? "var(--conflict)" : finding.tone === "warning" ? "var(--warning)" : "var(--ink-primary)",
                  }}
                >
                  {finding.value}
                </dd>
              </div>
              <button type="button" onClick={() => onGo(finding.mode)} className="btn btn-secondary cursor-pointer text-xs">
                Open
              </button>
            </div>
          ))}
        </dl>

        {summary.undatedCount > 0 ? (
          <p className="mt-4 max-w-[64ch] text-sm" style={{ color: "var(--ink-muted)" }}>
            {summary.undatedCount} event{summary.undatedCount === 1 ? "" : "s"} could not be placed in time from the
            available evidence. Proofline keeps these separate rather than estimating a position for them.
          </p>
        ) : null}
      </div>

      <aside className="flex flex-col gap-5">
        <section>
          <RailLabel>Integrity</RailLabel>
          {bundle.manifest ? (
            <>
              <div className="mt-2">
                <StatusPill tone="verified">Manifest registered</StatusPill>
              </div>
              <p className="meta mt-2">
                {bundle.manifest.artifacts.length} artifacts fingerprinted
                <br />
                root {shortHash(bundle.manifest.merkleRoot)}
              </p>
              <button type="button" onClick={() => onGo("verify")} className="btn btn-secondary mt-3 cursor-pointer text-xs">
                Check a file
              </button>
            </>
          ) : (
            <p className="mt-2 text-sm" style={{ color: "var(--ink-muted)" }}>
              No manifest has been generated for this case yet.
            </p>
          )}
        </section>

        <section>
          <RailLabel>Timeline span</RailLabel>
          <p className="meta mt-2">
            {timeline.span
              ? `${formatDate(timeline.span.start, bundle.case.incidentTimezone)} — ${formatDate(timeline.span.end, bundle.case.incidentTimezone)}`
              : "No dated events"}
            <br />
            timezone {bundle.case.incidentTimezone}
          </p>
        </section>

        <section>
          <RailLabel>Reminder</RailLabel>
          <p className="mt-2 text-sm" style={{ color: "var(--ink-muted)" }}>
            Everything below the artifact level was produced by automated analysis. Open the source for anything you
            intend to rely on.
          </p>
        </section>
      </aside>
    </div>
  );
}
