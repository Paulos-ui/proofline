"use client";

import { useState } from "react";
import type { Artifact, CaseBundle, ProcessingStatus } from "@/lib/schemas/case";
import { ConfidenceTag, RailLabel, StatusPill } from "@/components/ui/atoms";
import { shortHash } from "@/lib/integrity/hash";
import { formatBytes } from "@/lib/utils/format";
import { eventsForArtifact } from "@/lib/utils/case-derived";
import { pluralise } from "@/lib/utils/format";
import { SourceViewer } from "./SourceViewer";

const STATUS_TONE: Record<ProcessingStatus, "neutral" | "warning" | "conflict" | "verified"> = {
  queued: "neutral",
  hashing: "neutral",
  uploaded: "neutral",
  analyzing: "neutral",
  extracted: "verified",
  "needs-review": "warning",
  failed: "conflict",
};

const STATUS_LABEL: Record<ProcessingStatus, string> = {
  queued: "Queued",
  hashing: "Hashing",
  uploaded: "Uploaded",
  analyzing: "Analysing",
  extracted: "Extracted",
  "needs-review": "Needs review",
  failed: "Failed",
};

export function EvidenceMode({
  bundle,
  intake,
}: {
  bundle: CaseBundle;
  /** Live cases pass their uploader here; the demo case has none. */
  intake?: React.ReactNode;
}) {
  const [openId, setOpenId] = useState<string | null>(null);

  return (
    <div className="pb-16">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-xl" style={{ fontFamily: "var(--font-display)" }}>
            Evidence
          </h2>
          <p className="mt-1 text-sm" style={{ color: "var(--ink-muted)" }}>
            {pluralise(bundle.artifacts.length, "artifact")}, each fingerprinted when it entered the case.
          </p>
        </div>
      </header>

      {intake}

      <ul className="m-0 mt-6 grid list-none gap-3 p-0 sm:grid-cols-2 xl:grid-cols-3">
        {bundle.artifacts.map((artifact) => (
          <ArtifactCard
            key={artifact.id}
            bundle={bundle}
            artifact={artifact}
            open={openId === artifact.id}
            onToggle={() => setOpenId(openId === artifact.id ? null : artifact.id)}
          />
        ))}
      </ul>
    </div>
  );
}

function ArtifactCard({
  bundle,
  artifact,
  open,
  onToggle,
}: {
  bundle: CaseBundle;
  artifact: Artifact;
  open: boolean;
  onToggle: () => void;
}) {
  const events = eventsForArtifact(bundle, artifact.id);
  const redactions = bundle.redactions.filter((r) => r.artifactId === artifact.id);

  return (
    <li className="panel flex flex-col overflow-hidden">
      <div className="flex items-start justify-between gap-2 border-b p-3" style={{ borderColor: "var(--border-subtle)" }}>
        <div className="min-w-0">
          <p className="truncate text-sm font-medium" title={artifact.filename}>
            {artifact.filename}
          </p>
          <p className="meta mt-0.5">
            {artifact.mimeType} · {formatBytes(artifact.byteSize)}
            {artifact.dimensions ? ` · ${artifact.dimensions.width}×${artifact.dimensions.height}` : ""}
          </p>
        </div>
        <StatusPill tone={STATUS_TONE[artifact.processingStatus]}>{STATUS_LABEL[artifact.processingStatus]}</StatusPill>
      </div>

      <Thumbnail artifact={artifact} />

      <div className="flex grow flex-col gap-2 p-3">
        {artifact.summary ? (
          <p className="text-sm" style={{ color: "var(--ink-muted)" }}>
            {artifact.summary}
          </p>
        ) : null}
        {artifact.failureReason ? (
          <p className="text-sm" style={{ color: "var(--conflict)" }}>
            {artifact.failureReason}
          </p>
        ) : null}
        <div className="mt-auto flex flex-wrap items-center gap-2 pt-2">
          <span className="meta">{pluralise(events.length, "event")}</span>
          {redactions.length > 0 ? <StatusPill tone="warning">{redactions.length} sensitive</StatusPill> : null}
        </div>
        <div className="flex items-center justify-between gap-2 border-t pt-2" style={{ borderColor: "var(--border-subtle)" }}>
          <code className="meta" title={artifact.sha256}>
            {shortHash(artifact.sha256)}
          </code>
          <button type="button" onClick={onToggle} aria-expanded={open} className="btn btn-quiet cursor-pointer text-xs">
            {open ? "Hide detail" : "Inspect"}
          </button>
        </div>
      </div>

      {open ? (
        <div className="border-t p-3" style={{ borderColor: "var(--border-subtle)", background: "var(--surface-sunken)" }}>
          <RailLabel>Full fingerprint</RailLabel>
          <code className="meta mt-1 block break-all">{artifact.sha256}</code>
          <RailLabel className="mt-3">Events drawn from this artifact</RailLabel>
          <ul className="m-0 mt-1.5 flex list-none flex-col gap-1 p-0">
            {events.map((event) => (
              <li key={event.id} className="flex items-center justify-between gap-2 text-sm" style={{ color: "var(--ink-secondary)" }}>
                <span className="truncate">{event.title}</span>
                <ConfidenceTag value={event.confidence} />
              </li>
            ))}
            {events.length === 0 ? (
              <li className="text-sm" style={{ color: "var(--ink-muted)" }}>
                No events were drawn from this artifact.
              </li>
            ) : null}
          </ul>
          {artifact.transcript ? (
            <>
              <RailLabel className="mt-3">Transcript</RailLabel>
              <pre className="meta mt-1 max-h-40 overflow-auto whitespace-pre-wrap">{artifact.transcript}</pre>
            </>
          ) : null}
        </div>
      ) : null}
    </li>
  );
}

function Thumbnail({ artifact }: { artifact: Artifact }) {
  if (artifact.mimeType.startsWith("image/") && artifact.previewPath) {
    return (
      <div className="relative h-36 overflow-hidden" style={{ background: "var(--surface-sunken)" }}>
        <img src={artifact.previewPath} alt="" className="h-full w-full object-cover object-top" style={{ opacity: 0.9 }} />
      </div>
    );
  }
  return (
    <div className="flex h-36 items-center justify-center" style={{ background: "var(--surface-sunken)" }}>
      <FormatGlyph mime={artifact.mimeType} />
    </div>
  );
}

/** Rectangular format marks rather than generic file icons. */
function FormatGlyph({ mime }: { mime: string }) {
  const label = mime === "application/pdf" ? "PDF" : mime.startsWith("audio/") ? "AUDIO" : mime === "message/rfc822" ? "EMAIL" : "TEXT";
  return (
    <div className="flex flex-col items-center gap-2">
      <svg width="42" height="52" viewBox="0 0 42 52" aria-hidden="true">
        <path d="M1 1 H29 L41 13 V51 H1 Z" fill="none" stroke="var(--border-strong)" strokeWidth="1.4" />
        <path d="M29 1 V13 H41" fill="none" stroke="var(--border-strong)" strokeWidth="1.4" />
        <path d="M9 24 H33 M9 31 H33 M9 38 H24" stroke="var(--trace)" strokeWidth="1.2" />
      </svg>
      <span className="rail-label">{label}</span>
    </div>
  );
}

export { SourceViewer };
