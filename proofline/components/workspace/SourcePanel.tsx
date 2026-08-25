"use client";

import { useEffect, useRef } from "react";
import type { CaseBundle } from "@/lib/schemas/case";
import type { SourceLocator } from "@/lib/schemas/locator";
import { SourceViewer } from "@/components/evidence/SourceViewer";
import { artifactById } from "@/lib/utils/case-derived";
import { RailLabel, StatusPill } from "@/components/ui/atoms";
import { shortHash } from "@/lib/integrity/hash";

export type SourceSelection = {
  title: string;
  statement: string;
  attribution?: string | null;
  sources: Array<{ artifactId: string; locator: SourceLocator; excerpt: string }>;
  index: number;
};

/**
 * The context rail. It only exists when there is a source to show, so the workspace
 * is not permanently carrying empty navigation furniture.
 */
export function SourcePanel({
  bundle,
  selection,
  onChangeIndex,
  onClose,
}: {
  bundle: CaseBundle;
  selection: SourceSelection | null;
  onChangeIndex: (index: number) => void;
  onClose: () => void;
}) {
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!selection) return;
    closeRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selection, onClose]);

  if (!selection) return null;

  const source = selection.sources[selection.index];
  const artifact = source ? artifactById(bundle, source.artifactId) : null;

  return (
    <aside
      className="flex h-full flex-col border-l"
      style={{ borderColor: "var(--border-subtle)", background: "var(--surface-elevated)" }}
      aria-label="Supporting source"
    >
      <header className="flex items-start justify-between gap-3 border-b p-4" style={{ borderColor: "var(--border-subtle)" }}>
        <div>
          <RailLabel>Supporting source</RailLabel>
          <h2 className="mt-1 text-base leading-snug" style={{ fontFamily: "var(--font-display)" }}>
            {selection.title}
          </h2>
        </div>
        <button ref={closeRef} type="button" onClick={onClose} className="btn btn-quiet cursor-pointer" aria-label="Close source panel">
          Close
        </button>
      </header>

      <div className="grow overflow-y-auto p-4">
        <blockquote className="m-0 border-l-2 pl-3 text-sm" style={{ borderColor: "var(--trace-active)", color: "var(--ink-primary)" }}>
          {selection.statement}
          {selection.attribution ? (
            <footer className="meta mt-1.5">— {selection.attribution}</footer>
          ) : null}
        </blockquote>

        {selection.sources.length > 1 ? (
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <RailLabel>{selection.sources.length} sources</RailLabel>
            {selection.sources.map((item, index) => {
              const itemArtifact = artifactById(bundle, item.artifactId);
              const isActive = index === selection.index;
              return (
                <button
                  key={`${item.artifactId}-${index}`}
                  type="button"
                  onClick={() => onChangeIndex(index)}
                  aria-current={isActive}
                  className="btn cursor-pointer !px-2 !py-1 text-xs"
                  style={{
                    border: `1px solid ${isActive ? "var(--trace-active)" : "var(--border-subtle)"}`,
                    color: isActive ? "var(--trace-active)" : "var(--ink-secondary)",
                  }}
                >
                  {itemArtifact?.filename ?? item.artifactId}
                </button>
              );
            })}
          </div>
        ) : null}

        {artifact && source ? (
          <div className="mt-4">
            <SourceViewer artifact={artifact} locator={source.locator} />
            <dl className="mt-4 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5">
              <dt className="rail-label">Artifact</dt>
              <dd className="meta">{artifact.id}</dd>
              <dt className="rail-label">Type</dt>
              <dd className="meta">{artifact.mimeType}</dd>
              <dt className="rail-label">SHA-256</dt>
              <dd className="meta">{shortHash(artifact.sha256)}</dd>
            </dl>
            {artifact.summary ? (
              <p className="mt-3 text-sm" style={{ color: "var(--ink-muted)" }}>
                {artifact.summary}
              </p>
            ) : null}
          </div>
        ) : (
          <p className="mt-4 text-sm" style={{ color: "var(--ink-muted)" }}>
            The artifact for this source is not available in this case.
          </p>
        )}
      </div>

      <footer className="border-t p-3" style={{ borderColor: "var(--border-subtle)" }}>
        <StatusPill tone="analysis" marker={false}>
          Proofline located this region. Read the artifact yourself before relying on it.
        </StatusPill>
      </footer>
    </aside>
  );
}
