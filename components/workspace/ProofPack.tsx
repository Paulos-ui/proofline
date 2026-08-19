import type { CaseBundle } from "@/lib/schemas/case";
import { buildTimeline, formatEventTime, precisionNote } from "@/lib/timeline/engine";
import { CLASSIFICATION_LABELS } from "@/lib/conflicts/engine";
import { caseSummary } from "@/lib/utils/case-derived";
import { confidenceLabel } from "@/lib/schemas/extraction";
import { describeLocator } from "@/lib/schemas/locator";
import { formatBytes, formatDateTime } from "@/lib/utils/format";
import { Mark } from "@/components/brand/Mark";
import { PrintButton } from "./PrintButton";

/**
 * The proof pack: a printable record of the case that someone else can check.
 *
 * It is rendered as a document rather than generated as a binary, so it prints
 * identically from any browser and "Save as PDF" produces the same result. Source
 * references stay visible throughout — a reader must be able to see what each
 * statement rests on.
 */
export function ProofPack({ bundle, redactedIds }: { bundle: CaseBundle; redactedIds: Set<string> }) {
  const summary = caseSummary(bundle);
  const timeline = buildTimeline(bundle.events, bundle.case.incidentTimezone);
  const findings = bundle.conflicts.filter((c) => c.classification !== "compatible");
  const generatedAt = new Date().toISOString();

  const redactionsByArtifact = new Map<string, number>();
  // Accepted text redactions are resolved back to the literal value so that any
  // excerpt quoting it in this pack is redacted too, not just the artifact listing.
  const redactedValues = new Map<string, string[]>();

  for (const suggestion of bundle.redactions) {
    if (!redactedIds.has(suggestion.id)) continue;
    redactionsByArtifact.set(suggestion.artifactId, (redactionsByArtifact.get(suggestion.artifactId) ?? 0) + 1);

    if (suggestion.locator.type !== "text-range") continue;
    const artifact = bundle.artifacts.find((a) => a.id === suggestion.artifactId);
    const content = artifact?.textContent ?? artifact?.transcript ?? null;
    if (!content) continue;
    const value = content.slice(suggestion.locator.startOffset, suggestion.locator.endOffset).trim();
    if (value.length < 3) continue;
    const list = redactedValues.get(suggestion.artifactId) ?? [];
    list.push(value);
    redactedValues.set(suggestion.artifactId, list);
  }

  const mask = (value: string, artifactId: string): string => {
    const values = redactedValues.get(artifactId);
    if (!values) return value;
    return values.reduce((text, secret) => text.split(secret).join("[redacted]"), value);
  };

  return (
    <div className="mx-auto max-w-[52rem] px-6 py-10 print:px-0 print:py-0" style={{ background: "var(--surface-primary)" }}>
      <div className="mb-6 flex justify-end print:hidden">
        <PrintButton />
      </div>

      <header className="border-b pb-6" style={{ borderColor: "var(--border-strong)" }}>
        <div className="flex items-start justify-between gap-6">
          <div>
            <div className="flex items-center gap-2">
              <Mark size={20} />
              <span className="rail-label">Proofline proof pack</span>
            </div>
            <h1 className="mt-3 max-w-[36ch] text-3xl leading-tight" style={{ fontFamily: "var(--font-display)" }}>
              {bundle.case.title}
            </h1>
            {bundle.case.description ? (
              <p className="mt-2 max-w-[62ch] text-sm" style={{ color: "var(--ink-secondary)" }}>
                {bundle.case.description}
              </p>
            ) : null}
          </div>
          <dl className="shrink-0 text-right">
            <dt className="rail-label">Case</dt>
            <dd className="meta">{bundle.case.ref}</dd>
            <dt className="rail-label mt-2">Generated</dt>
            <dd className="meta">{formatDateTime(generatedAt, bundle.case.incidentTimezone)}</dd>
            <dt className="rail-label mt-2">Timezone</dt>
            <dd className="meta">{bundle.case.incidentTimezone}</dd>
          </dl>
        </div>
        {bundle.case.isSynthetic ? (
          <p className="mt-4 border p-2 text-sm" style={{ borderColor: "var(--analysis)", color: "var(--analysis)" }}>
            Synthetic demonstration data. Every person, company and transaction in this pack is fictional.
          </p>
        ) : null}
      </header>

      <Section title="Summary">
        <dl className="grid grid-cols-2 gap-x-8 gap-y-2 sm:grid-cols-3">
          {[
            ["Artifacts", String(summary.artifactCount)],
            ["Events", `${timeline.dated.length} dated, ${timeline.unresolved.length} undated`],
            ["Parties and records", String(summary.entityCount)],
            ["Claims compared", String(summary.claimCount)],
            ["Potential inconsistencies", String(summary.inconsistencyCount)],
            ["Values redacted here", String(redactedIds.size)],
          ].map(([label, value]) => (
            <div key={label}>
              <dt className="rail-label">{label}</dt>
              <dd className="mt-0.5 text-sm">{value}</dd>
            </div>
          ))}
        </dl>
      </Section>

      <Section title="Chronology">
        <ol className="m-0 list-none p-0">
          {timeline.bands.map((band) => (
            <li key={band.key} className="mb-4 break-inside-avoid">
              <p className="rail-label border-b pb-1" style={{ borderColor: "var(--border-subtle)" }}>
                {band.label}
              </p>
              {band.events.map((event) => (
                <div key={event.id} className="mt-3 grid grid-cols-[6rem_1fr] gap-3 break-inside-avoid">
                  <span className="meta">{formatEventTime(event, bundle.case.incidentTimezone)}</span>
                  <div>
                    <p className="text-sm font-medium">{event.title}</p>
                    <p className="mt-0.5 text-sm" style={{ color: "var(--ink-secondary)" }}>
                      {event.description}
                    </p>
                    <ul className="m-0 mt-1 flex list-none flex-col gap-0.5 p-0">
                      {event.sources.map((source, index) => {
                        const artifact = bundle.artifacts.find((a) => a.id === source.artifactId);
                        return (
                          <li key={`${event.id}-${index}`} className="meta">
                            ↳ {artifact?.filename ?? source.artifactId} · {describeLocator(source.locator)}
                            {source.excerpt ? ` · “${mask(source.excerpt, source.artifactId)}”` : ""}
                          </li>
                        );
                      })}
                    </ul>
                    {event.timePrecision !== "minute" && event.timePrecision !== "exact" ? (
                      <p className="meta mt-0.5" style={{ color: "var(--warning)" }}>
                        {precisionNote(event.timePrecision)}
                      </p>
                    ) : null}
                  </div>
                </div>
              ))}
            </li>
          ))}
        </ol>
      </Section>

      <Section title="Parties and records">
        <ul className="m-0 grid list-none gap-x-8 gap-y-2 p-0 sm:grid-cols-2">
          {bundle.entities.map((entity) => (
            <li key={entity.id} className="break-inside-avoid">
              <p className="text-sm">
                {entity.canonicalName} <span className="meta">({entity.type})</span>
              </p>
              <p className="meta">
                {entity.mentions.length} mention{entity.mentions.length === 1 ? "" : "s"} · {confidenceLabel(entity.confidence)}
                {entity.resolution === "possible-match" ? " · possible match, not merged" : ""}
              </p>
            </li>
          ))}
        </ul>
      </Section>

      <Section title="Where sources differ">
        {findings.length === 0 ? (
          <p className="text-sm" style={{ color: "var(--ink-secondary)" }}>
            No differences were found between the claims in this case.
          </p>
        ) : (
          <ol className="m-0 flex list-none flex-col gap-4 p-0">
            {findings.map((conflict) => {
              const claimA = bundle.claims.find((c) => c.id === conflict.claimAId);
              const claimB = bundle.claims.find((c) => c.id === conflict.claimBId);
              return (
                <li key={conflict.id} className="break-inside-avoid border-l-2 pl-3" style={{ borderColor: "var(--conflict)" }}>
                  <p className="rail-label" style={{ color: "var(--conflict)" }}>
                    {CLASSIFICATION_LABELS[conflict.classification]} · {conflict.dimension}
                  </p>
                  <p className="mt-1 text-sm">{conflict.explanation}</p>
                  {[claimA, claimB].filter(Boolean).map((claim, index) => (
                    <p key={claim!.id} className="meta mt-1">
                      {String.fromCharCode(65 + index)} · “{mask(claim!.text, claim!.sources[0]?.artifactId ?? "")}” —{" "}
                      {claim!.speakerOrSource ?? "unattributed"}
                    </p>
                  ))}
                </li>
              );
            })}
          </ol>
        )}
      </Section>

      <Section title="Artifact index and fingerprints">
        <table className="w-full border-collapse text-left">
          <thead>
            <tr>
              {["File", "Type", "Size", "SHA-256"].map((heading) => (
                <th key={heading} className="rail-label border-b py-1.5 pr-3" style={{ borderColor: "var(--border-strong)" }}>
                  {heading}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {bundle.artifacts.map((artifact) => (
              <tr key={artifact.id} className="break-inside-avoid">
                <td className="border-b py-1.5 pr-3 text-sm" style={{ borderColor: "var(--border-subtle)" }}>
                  {artifact.filename}
                  {redactionsByArtifact.has(artifact.id) ? (
                    <span className="meta"> · {redactionsByArtifact.get(artifact.id)} redacted</span>
                  ) : null}
                </td>
                <td className="meta border-b py-1.5 pr-3" style={{ borderColor: "var(--border-subtle)" }}>
                  {artifact.mimeType}
                </td>
                <td className="meta border-b py-1.5 pr-3" style={{ borderColor: "var(--border-subtle)" }}>
                  {formatBytes(artifact.byteSize)}
                </td>
                <td className="meta border-b py-1.5 text-[0.5625rem] leading-tight" style={{ borderColor: "var(--border-subtle)", wordBreak: "break-all" }}>
                  {artifact.sha256}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {bundle.manifest ? (
          <p className="meta mt-3">
            Merkle root · {bundle.manifest.merkleRoot}
            <br />
            Registered {formatDateTime(bundle.manifest.createdAt, bundle.case.incidentTimezone)} · manifest version{" "}
            {bundle.manifest.version}
          </p>
        ) : null}
        {bundle.anchor ? (
          <p className="meta mt-2">
            Public integrity anchor · {bundle.anchor.cluster} · {bundle.anchor.signature}
            <br />
            Nothing private is written to the public anchor: the memo contains only the version prefix and the Merkle
            root.
          </p>
        ) : null}
      </Section>

      <Section title="How to check this pack">
        <ol className="m-0 flex list-none flex-col gap-1.5 p-0 text-sm" style={{ color: "var(--ink-secondary)" }}>
          <li>1 · Open /verify and load the manifest for case {bundle.case.ref}.</li>
          <li>2 · Drop any file listed above into the checker.</li>
          <li>3 · A match means the bytes are identical to those registered. A mismatch means the file has changed.</li>
        </ol>
      </Section>

      <Section title="Limitations of this report">
        <ul className="m-0 flex list-none flex-col gap-1.5 p-0 text-sm" style={{ color: "var(--ink-secondary)" }}>
          <li>· Events, claims and relationships were produced by automated analysis and can be wrong. Each one lists the source it came from so it can be checked.</li>
          <li>· A difference between sources is not a finding that anyone was dishonest. Sources disagree for many reasons.</li>
          <li>· A fingerprint match detects byte-level change only. It does not establish that the original content was accurate or that the file is what it appears to be.</li>
          <li>· Times are shown at no greater precision than the evidence supports. Events with no established time are listed separately and are not ordered.</li>
          <li>· Proofline is not a forensic certification service and does not provide legal advice.</li>
        </ul>
      </Section>

      <footer className="mt-10 border-t pt-4" style={{ borderColor: "var(--border-subtle)" }}>
        <p className="meta">
          Generated by Proofline · {formatDateTime(generatedAt)} · case {bundle.case.ref}
        </p>
      </footer>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-8 break-inside-avoid">
      <h2 className="mb-3 border-b pb-1 text-base" style={{ fontFamily: "var(--font-display)", borderColor: "var(--border-strong)" }}>
        {title}
      </h2>
      {children}
    </section>
  );
}
