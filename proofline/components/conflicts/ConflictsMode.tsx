"use client";

import { useState } from "react";
import type { CaseBundle, Conflict } from "@/lib/schemas/case";
import { CLASSIFICATION_LABELS } from "@/lib/conflicts/engine";
import { ConfidenceTag, EmptyState, RailLabel, StatusPill } from "@/components/ui/atoms";
import { SourceViewer } from "@/components/evidence/SourceViewer";
import { artifactById, claimById } from "@/lib/utils/case-derived";

/**
 * Two sources that describe the same thing differently, shown side by side. The
 * product's job here is to put both in front of the user, not to decide between them.
 */
export function ConflictsMode({ bundle }: { bundle: CaseBundle }) {
  const surfaced = bundle.conflicts.filter((conflict) => conflict.classification !== "compatible");
  const compatible = bundle.conflicts.length - surfaced.length;
  const [openId, setOpenId] = useState<string | null>(surfaced[0]?.id ?? null);

  if (surfaced.length === 0) {
    return (
      <EmptyState
        title="No differences found between sources"
        body="Proofline compared the claims in this case and did not find statements that describe the same thing differently. This is not a finding that everything is accurate — only that the available evidence does not disagree with itself."
      />
    );
  }

  return (
    <div className="pb-16">
      <header className="mb-6">
        <h2 className="text-xl" style={{ fontFamily: "var(--font-display)" }}>
          Where sources differ
        </h2>
        <p className="mt-1 max-w-[64ch] text-sm" style={{ color: "var(--ink-muted)" }}>
          Proofline compared {bundle.claims.length} claims and found {surfaced.length} pairs that describe the same
          subject differently. {compatible} further pairs agreed. A difference is not a finding of dishonesty — sources
          can disagree because of timing, partial information or a mistake.
        </p>
      </header>

      <ul className="m-0 flex list-none flex-col gap-3 p-0">
        {surfaced.map((conflict) => (
          <ConflictCard
            key={conflict.id}
            bundle={bundle}
            conflict={conflict}
            open={openId === conflict.id}
            onToggle={() => setOpenId(openId === conflict.id ? null : conflict.id)}
          />
        ))}
      </ul>
    </div>
  );
}

function ConflictCard({
  bundle,
  conflict,
  open,
  onToggle,
}: {
  bundle: CaseBundle;
  conflict: Conflict;
  open: boolean;
  onToggle: () => void;
}) {
  const claimA = claimById(bundle, conflict.claimAId);
  const claimB = conflict.claimBId ? claimById(bundle, conflict.claimBId) : null;
  const tone = conflict.classification === "potentially-inconsistent" ? "conflict" : "warning";

  return (
    <li className="panel overflow-hidden">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="flex w-full cursor-pointer items-start gap-4 p-4 text-left"
      >
        <ConvergenceGlyph open={open} tone={tone} />
        <span className="grow">
          <span className="flex flex-wrap items-center gap-2">
            <StatusPill tone={tone}>{CLASSIFICATION_LABELS[conflict.classification]}</StatusPill>
            <span className="rail-label">{conflict.dimension}</span>
            <ConfidenceTag value={conflict.confidence} />
          </span>
          <span className="mt-2 block max-w-[70ch] text-sm" style={{ color: "var(--ink-secondary)" }}>
            {conflict.explanation}
          </span>
        </span>
      </button>

      {open ? (
        <div className="grid gap-px border-t md:grid-cols-2" style={{ borderColor: "var(--border-subtle)", background: "var(--border-subtle)" }}>
          {[claimA, claimB].map((claim, index) =>
            claim ? (
              <div key={claim.id} className="p-4" style={{ background: "var(--surface-elevated)" }}>
                <RailLabel>Source {String.fromCharCode(65 + index)}</RailLabel>
                <blockquote className="m-0 mt-2 text-sm" style={{ color: "var(--ink-primary)" }}>
                  “{claim.text}”
                </blockquote>
                <p className="meta mt-1.5">{claim.speakerOrSource ?? "Source not attributed"}</p>
                {claim.sources[0]
                  ? (() => {
                      const artifact = artifactById(bundle, claim.sources[0]!.artifactId);
                      return artifact ? (
                        <div className="mt-3">
                          <SourceViewer artifact={artifact} locator={claim.sources[0]!.locator} compact />
                        </div>
                      ) : null;
                    })()
                  : null}
              </div>
            ) : (
              <div key="none" className="p-4" style={{ background: "var(--surface-elevated)" }}>
                <RailLabel>Source B</RailLabel>
                <p className="mt-2 text-sm" style={{ color: "var(--ink-muted)" }}>
                  No second claim is attached to this finding.
                </p>
              </div>
            ),
          )}
        </div>
      ) : null}
    </li>
  );
}

/**
 * Two traces that converge and then separate around a marker. It replaces the usual
 * warning triangle: the shape says "these met and did not agree".
 */
function ConvergenceGlyph({ open, tone }: { open: boolean; tone: "conflict" | "warning" }) {
  const color = tone === "conflict" ? "var(--conflict)" : "var(--warning)";
  return (
    <svg width="34" height="34" viewBox="0 0 34 34" aria-hidden="true" className="mt-1 shrink-0">
      <path
        d="M2 6 C 12 6, 12 15, 17 15"
        fill="none"
        stroke={color}
        strokeWidth="1.2"
        style={{ transition: "transform 300ms", transform: open ? "translateY(-2px)" : "none", transformOrigin: "center" }}
      />
      <path
        d="M2 28 C 12 28, 12 19, 17 19"
        fill="none"
        stroke={color}
        strokeWidth="1.2"
        style={{ transition: "transform 300ms", transform: open ? "translateY(2px)" : "none", transformOrigin: "center" }}
      />
      <path d="M17 15 L32 15" fill="none" stroke={color} strokeWidth="1.2" opacity={open ? 1 : 0.4} />
      <path d="M17 19 L32 19" fill="none" stroke={color} strokeWidth="1.2" opacity={open ? 1 : 0.4} />
      <rect x="15" y="15" width="4" height="4" fill={color} />
    </svg>
  );
}
