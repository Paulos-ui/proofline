"use client";

import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import type { CaseBundle, RedactionSuggestion } from "@/lib/schemas/case";
import { Wordmark } from "@/components/brand/Mark";
import { RailLabel, StatusPill, SyntheticBadge } from "@/components/ui/atoms";
import { TraceNav, type WorkspaceMode } from "./TraceNav";
import { SourcePanel, type SourceSelection } from "./SourcePanel";
import { OverviewMode } from "./OverviewMode";
import { ExportMode } from "./ExportMode";
import { TimelineMode } from "@/components/timeline/TimelineMode";
import { ConflictsMode } from "@/components/conflicts/ConflictsMode";
import { ConnectionsMode } from "@/components/graph/ConnectionsMode";
import { EvidenceMode } from "@/components/evidence/EvidenceMode";
import { PrivacyMode } from "@/components/privacy/PrivacyMode";
import { VerifyPanel } from "@/components/verification/VerifyPanel";
import { caseSummary } from "@/lib/utils/case-derived";
import { formatDateTime } from "@/lib/utils/format";
import { shortHash } from "@/lib/integrity/hash";

/**
 * The case workspace. The same component serves the seeded demonstration case and a
 * live case; only the data source and the presence of an uploader differ.
 */
export function CaseWorkspace({
  bundle,
  intake,
  banner,
}: {
  bundle: CaseBundle;
  intake?: React.ReactNode;
  banner?: React.ReactNode;
}) {
  const [mode, setMode] = useState<WorkspaceMode>("overview");
  const [selection, setSelection] = useState<SourceSelection | null>(null);
  const [decisions, setDecisions] = useState<Record<string, RedactionSuggestion["decision"]>>({});

  const summary = useMemo(() => caseSummary(bundle), [bundle]);

  const openSource = useCallback((next: SourceSelection) => setSelection(next), []);
  const closeSource = useCallback(() => setSelection(null), []);

  const counts: Partial<Record<WorkspaceMode, { value: number; tone?: "conflict" | "warning" | "neutral" }>> = {
    evidence: { value: summary.artifactCount },
    timeline: { value: summary.eventCount },
    connections: { value: summary.entityCount },
    conflicts: { value: summary.inconsistencyCount, tone: "conflict" },
    privacy: { value: summary.redactionCount, tone: "warning" },
  };

  return (
    <div className="surface-ink flex min-h-dvh flex-col">
      <header className="border-b" style={{ borderColor: "var(--border-subtle)" }}>
        <div className="mx-auto flex w-full max-w-[100rem] items-center justify-between gap-4 px-4 py-3 md:px-6">
          <Link href="/" className="cursor-pointer" aria-label="Proofline home">
            <Wordmark />
          </Link>
          <div className="flex items-center gap-3">
            {bundle.case.isSynthetic ? <SyntheticBadge /> : null}
            <Link href="/verify" className="btn btn-quiet cursor-pointer text-sm">
              Verify a file
            </Link>
            <Link href="/dashboard" className="btn btn-secondary cursor-pointer text-sm">
              Cases
            </Link>
          </div>
        </div>
      </header>

      {banner}

      <div className="mx-auto w-full max-w-[100rem] px-4 pt-6 md:px-6">
        <div className="flex flex-wrap items-start justify-between gap-x-8 gap-y-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <RailLabel>Case {bundle.case.ref}</RailLabel>
              <StatusPill tone={bundle.case.status === "ready" ? "verified" : "neutral"}>{bundle.case.status}</StatusPill>
            </div>
            <h1 className="mt-1.5 max-w-[46ch] text-2xl leading-tight" style={{ fontFamily: "var(--font-display)" }}>
              {bundle.case.title}
            </h1>
          </div>
          <dl className="flex flex-wrap gap-x-8 gap-y-2">
            <div>
              <dt className="rail-label">Artifacts</dt>
              <dd className="meta mt-0.5">{summary.artifactCount}</dd>
            </div>
            <div>
              <dt className="rail-label">Last processed</dt>
              <dd className="meta mt-0.5">
                {bundle.case.lastProcessedAt ? formatDateTime(bundle.case.lastProcessedAt, bundle.case.incidentTimezone) : "Not processed"}
              </dd>
            </div>
            <div>
              <dt className="rail-label">Integrity</dt>
              <dd className="meta mt-0.5">
                {bundle.manifest ? shortHash(bundle.manifest.merkleRoot) : "No manifest"}
              </dd>
            </div>
          </dl>
        </div>

        <div className="mt-4">
          <TraceNav mode={mode} onChange={setMode} counts={counts} />
        </div>
      </div>

      <div className="mx-auto grid w-full max-w-[100rem] grow grid-cols-1 gap-0 lg:grid-cols-[minmax(0,1fr)_auto]">
        <main id="main" className="min-w-0 px-4 pt-8 md:px-6">
          {mode === "overview" ? <OverviewMode bundle={bundle} onGo={setMode} /> : null}
          {mode === "evidence" ? <EvidenceMode bundle={bundle} intake={intake} /> : null}
          {mode === "timeline" ? (
            <TimelineMode bundle={bundle} onOpenSource={openSource} activeEventId={null} />
          ) : null}
          {mode === "connections" ? <ConnectionsMode bundle={bundle} onOpenSource={openSource} /> : null}
          {mode === "conflicts" ? <ConflictsMode bundle={bundle} /> : null}
          {mode === "privacy" ? (
            <PrivacyMode
              bundle={bundle}
              decisions={decisions}
              onDecide={(id, decision) => setDecisions((current) => ({ ...current, [id]: decision }))}
            />
          ) : null}
          {mode === "verify" ? (
            <div className="max-w-[46rem] pb-16">
              <h2 className="text-xl" style={{ fontFamily: "var(--font-display)" }}>
                Check a file against this case
              </h2>
              <p className="mb-6 mt-1 max-w-[64ch] text-sm" style={{ color: "var(--ink-muted)" }}>
                Every artifact was fingerprinted when it entered the case. Drop a copy of one here to see whether its
                bytes still match.
              </p>
              <VerifyPanel manifest={bundle.manifest} manifestLabel={`${bundle.case.ref} manifest`} />
            </div>
          ) : null}
          {mode === "export" ? <ExportMode bundle={bundle} decisions={decisions} /> : null}
        </main>

        {selection ? (
          <div className="w-full lg:w-[26rem] lg:border-l" style={{ borderColor: "var(--border-subtle)" }}>
            <div className="lg:sticky lg:top-0 lg:h-dvh">
              <SourcePanel
                bundle={bundle}
                selection={selection}
                onChangeIndex={(index) => setSelection((current) => (current ? { ...current, index } : current))}
                onClose={closeSource}
              />
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
