"use client";

import { useMemo, useState } from "react";
import type { CaseBundle, RedactionSuggestion } from "@/lib/schemas/case";
import { EmptyState, RailLabel, StatusPill } from "@/components/ui/atoms";
import { artifactById } from "@/lib/utils/case-derived";
import { SourceViewer } from "@/components/evidence/SourceViewer";
import { describeLocator } from "@/lib/schemas/locator";

const CATEGORY_LABEL: Record<string, string> = {
  email: "Email address",
  phone: "Phone number",
  "financial-account": "Financial account",
  address: "Postal address",
  "government-id": "Identifier",
  username: "Username",
  "wallet-address": "Wallet address",
  face: "Face",
  other: "Other",
};

/**
 * Review of sensitive values before anything leaves the workspace. Decisions apply to
 * exported copies only — the original artifact is never modified.
 */
export function PrivacyMode({
  bundle,
  decisions,
  onDecide,
}: {
  bundle: CaseBundle;
  decisions: Record<string, RedactionSuggestion["decision"]>;
  onDecide: (id: string, decision: RedactionSuggestion["decision"]) => void;
}) {
  const [openId, setOpenId] = useState<string | null>(null);

  const grouped = useMemo(() => {
    const map = new Map<string, RedactionSuggestion[]>();
    for (const suggestion of bundle.redactions) {
      const list = map.get(suggestion.artifactId) ?? [];
      list.push(suggestion);
      map.set(suggestion.artifactId, list);
    }
    return [...map.entries()];
  }, [bundle.redactions]);

  const pending = bundle.redactions.filter((s) => (decisions[s.id] ?? s.decision) === "pending").length;
  const toRedact = bundle.redactions.filter((s) => (decisions[s.id] ?? s.decision) === "redact").length;

  if (bundle.redactions.length === 0) {
    return (
      <EmptyState
        title="No sensitive values found"
        body="Pattern matching did not find addresses, account numbers or identifiers in this case. This is not a guarantee that none are present — review the artifacts yourself before sharing an export."
      />
    );
  }

  return (
    <div className="pb-16">
      <header className="mb-6">
        <h2 className="text-xl" style={{ fontFamily: "var(--font-display)" }}>
          Sensitive information candidates
        </h2>
        <p className="mt-1 max-w-[66ch] text-sm" style={{ color: "var(--ink-muted)" }}>
          {bundle.redactions.length} values were flagged across {grouped.length} artifacts. Choosing to redact affects
          exported copies only — Proofline never alters the file you uploaded.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <StatusPill tone="warning">{pending} awaiting a decision</StatusPill>
          <StatusPill tone="verified">{toRedact} will be redacted on export</StatusPill>
        </div>
      </header>

      <div className="flex flex-col gap-6">
        {grouped.map(([artifactId, suggestions]) => {
          const artifact = artifactById(bundle, artifactId);
          return (
            <section key={artifactId}>
              <div className="mb-2 flex items-center gap-3">
                <RailLabel>{artifact?.filename ?? artifactId}</RailLabel>
                <div className="h-px grow" style={{ background: "var(--border-subtle)" }} />
              </div>
              <ul className="m-0 flex list-none flex-col gap-2 p-0">
                {suggestions.map((suggestion) => {
                  const decision = decisions[suggestion.id] ?? suggestion.decision;
                  const isOpen = openId === suggestion.id;
                  return (
                    <li key={suggestion.id} className="panel p-3">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <StatusPill tone={decision === "redact" ? "verified" : decision === "pending" ? "warning" : "neutral"}>
                              {CATEGORY_LABEL[suggestion.category] ?? suggestion.category}
                            </StatusPill>
                            <span className="meta">
                              {suggestion.detector === "pattern" ? "pattern match" : "model suggestion"} ·{" "}
                              {describeLocator(suggestion.locator)} · {suggestion.confidence.toFixed(2)}
                            </span>
                          </div>
                          <p className="mt-1.5 break-all text-sm" style={{ fontFamily: "var(--font-mono)", color: "var(--ink-secondary)" }}>
                            {suggestion.preview}
                          </p>
                        </div>
                        <div className="flex items-center gap-1" role="group" aria-label="Decision">
                          {(["redact", "keep", "ignored"] as const).map((value) => (
                            <button
                              key={value}
                              type="button"
                              onClick={() => onDecide(suggestion.id, value)}
                              aria-pressed={decision === value}
                              className="btn cursor-pointer !px-2.5 !py-1 text-xs"
                              style={{
                                border: `1px solid ${decision === value ? "var(--ink-primary)" : "var(--border-subtle)"}`,
                                color: decision === value ? "var(--ink-primary)" : "var(--ink-muted)",
                              }}
                            >
                              {value === "redact" ? "Redact in export" : value === "keep" ? "Keep" : "Ignore"}
                            </button>
                          ))}
                          <button
                            type="button"
                            onClick={() => setOpenId(isOpen ? null : suggestion.id)}
                            aria-expanded={isOpen}
                            className="btn btn-quiet cursor-pointer text-xs"
                          >
                            {isOpen ? "Hide" : "Show in artifact"}
                          </button>
                        </div>
                      </div>
                      {isOpen && artifact ? (
                        <div className="mt-3">
                          <SourceViewer artifact={artifact} locator={suggestion.locator} compact />
                        </div>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            </section>
          );
        })}
      </div>
    </div>
  );
}
