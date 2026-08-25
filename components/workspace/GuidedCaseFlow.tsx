"use client";

import { useCallback, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { CaseBundle } from "@/lib/schemas/case";
import { sha256File, shortHash } from "@/lib/integrity/hash";
import { ACCEPT_ATTRIBUTE, MAX_BATCH_FILES, validateUpload } from "@/lib/evidence/validate";
import { formatBytes } from "@/lib/utils/format";
import type { NextStep } from "@/lib/cases/next-steps";

/**
 * The guided case flow. For a case that is not yet processed, this replaces the full
 * eight-mode workspace with a calmer, stepped path:
 *
 *   1. Collect — add every file, fingerprinted in the browser as it arrives
 *   2. Context — describe what happened, so the analysis reads the evidence in context
 *   3. Analyse — one clear action, with an honest loading state
 *   4. Result — what was found, general next steps, and a downloadable pack
 *
 * Once a case is ready, the rich workspace takes over; this is the on-ramp, not a
 * replacement for it.
 */

type Stage = "collect" | "context" | "analyzing" | "result";

type UploadState = "queued" | "hashing" | "uploading" | "uploaded" | "failed";

type UploadItem = {
  key: string;
  filename: string;
  size: number;
  state: UploadState;
  progress: number;
  sha256?: string;
  error?: string;
};

type ProcessResult = {
  analysed: number;
  failed: Array<{ filename: string; reason: string }>;
  events: number;
  claims: number;
  conflicts: number;
  merkleRoot: string;
};

const STATE_LABEL: Record<UploadState, string> = {
  queued: "Queued",
  hashing: "Fingerprinting",
  uploading: "Uploading",
  uploaded: "Ready",
  failed: "Failed",
};

export function GuidedCaseFlow({
  bundle,
  canProcess,
  processDisabledReason,
  nextSteps,
}: {
  bundle: CaseBundle;
  canProcess: boolean;
  processDisabledReason?: string;
  nextSteps: NextStep[];
}) {
  const router = useRouter();
  const caseId = bundle.case.id;

  // If the case already has artifacts (e.g. returning to a part-built case), start
  // further along so the user is not asked to re-upload.
  const initialStage: Stage = bundle.case.status === "ready" ? "result" : bundle.artifacts.length > 0 ? "context" : "collect";

  const [stage, setStage] = useState<Stage>(initialStage);
  const [items, setItems] = useState<UploadItem[]>([]);
  const [dragging, setDragging] = useState(false);
  const [context, setContext] = useState(bundle.case.description ?? "");
  const [savingContext, setSavingContext] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ProcessResult | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const uploadedCount = bundle.artifacts.length + items.filter((i) => i.state === "uploaded").length;

  const update = useCallback((key: string, patch: Partial<UploadItem>) => {
    setItems((current) => current.map((item) => (item.key === key ? { ...item, ...patch } : item)));
  }, []);

  const ingest = useCallback(
    async (files: File[]) => {
      const batch = files.slice(0, MAX_BATCH_FILES);
      const queued: UploadItem[] = batch.map((file, index) => ({
        key: `${Date.now()}-${index}-${file.name}`,
        filename: file.name,
        size: file.size,
        state: "queued",
        progress: 0,
      }));
      setItems((current) => [...current, ...queued]);

      for (const [index, file] of batch.entries()) {
        const key = queued[index]!.key;
        const validation = validateUpload(file);
        if (!validation.ok) {
          update(key, { state: "failed", error: validation.reason });
          continue;
        }
        try {
          update(key, { state: "hashing" });
          const sha256 = await sha256File(file, (fraction) => update(key, { progress: fraction }));
          update(key, { state: "uploading", sha256, progress: 1 });

          const form = new FormData();
          form.append("file", file);
          form.append("sha256", sha256);
          form.append("mimeType", validation.mimeType);

          const response = await fetch(`/api/cases/${caseId}/artifacts`, { method: "POST", body: form });
          if (!response.ok) {
            const body = (await response.json().catch(() => ({}))) as { error?: string };
            update(key, { state: "failed", error: body.error ?? `Upload failed (${response.status}).` });
            continue;
          }
          update(key, { state: "uploaded" });
        } catch (err) {
          update(key, { state: "failed", error: err instanceof Error ? err.message : "The file could not be read." });
        }
      }
      router.refresh();
    },
    [caseId, router, update],
  );

  const saveContextAndAnalyze = useCallback(async () => {
    setSavingContext(true);
    setError(null);
    try {
      // Persist the context first, so a failed analysis does not lose what was typed.
      if (context.trim() !== (bundle.case.description ?? "")) {
        await fetch(`/api/cases/${caseId}`, {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ description: context.trim() || null }),
        });
      }
    } catch {
      // Saving context is best-effort; do not block analysis on it.
    } finally {
      setSavingContext(false);
    }

    setStage("analyzing");
    setError(null);
    try {
      const response = await fetch(`/api/cases/${caseId}/process`, { method: "POST" });
      const body = (await response.json().catch(() => ({}))) as Partial<ProcessResult> & { error?: string };
      if (!response.ok) {
        setError(body.error ?? "The analysis did not complete. Your files are safe, you can try again.");
        setStage("context");
        return;
      }
      setResult({
        analysed: body.analysed ?? 0,
        failed: body.failed ?? [],
        events: body.events ?? 0,
        claims: body.claims ?? 0,
        conflicts: body.conflicts ?? 0,
        merkleRoot: body.merkleRoot ?? "",
      });
      setStage("result");
      router.refresh();
    } catch {
      setError("The analysis could not be reached. Your files are safe — you can try again.");
      setStage("context");
    }
  }, [bundle.case.description, caseId, context, router]);

  return (
    <div className="mx-auto w-full max-w-[60rem] px-4 pb-24 pt-8 md:px-6">
      <StageRail stage={stage} />

      {stage === "collect" ? (
        <Panel
          step="1"
          title="Bring together everything you have"
          lede="Add every file that might matter screenshots, receipts, emails, PDFs, images, text files, voice notes. You can always add more later. Each file is fingerprinted in your browser before it uploads."
        >
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragging(false);
              void ingest(Array.from(e.dataTransfer.files));
            }}
            className="flex flex-col items-center gap-3 rounded-xl border border-dashed p-8 text-center transition-colors"
            style={{
              borderColor: dragging ? "var(--evidence)" : "var(--border-strong)",
              background: dragging ? "var(--evidence-soft)" : "var(--surface-elevated)",
            }}
          >
            <TraceGlyph />
            <p className="text-sm" style={{ color: "var(--ink-secondary)" }}>
              Drag your files here, or
            </p>
            <button type="button" onClick={() => inputRef.current?.click()} className="btn btn-primary cursor-pointer">
              Choose files
            </button>
            <p className="meta">Up to 25 MB each · images, PDF, text, email, audio</p>
            <input
              ref={inputRef}
              type="file"
              multiple
              accept={ACCEPT_ATTRIBUTE}
              className="sr-only"
              onChange={(e) => {
                void ingest(Array.from(e.target.files ?? []));
                e.target.value = "";
              }}
            />
          </div>

          {items.length > 0 ? (
            <ul className="m-0 mt-4 flex list-none flex-col gap-px overflow-hidden rounded-lg p-0" style={{ background: "var(--border-subtle)" }}>
              {items.map((item) => (
                <li key={item.key} className="flex items-center gap-3 p-3" style={{ background: "var(--surface-elevated)" }}>
                  <span
                    className="rounded-full px-2 py-0.5 text-xs"
                    style={{
                      background: item.state === "failed" ? "var(--conflict-soft)" : item.state === "uploaded" ? "var(--verified-soft)" : "var(--surface-sunken)",
                      color: item.state === "failed" ? "var(--conflict)" : item.state === "uploaded" ? "var(--verified)" : "var(--ink-muted)",
                    }}
                  >
                    {STATE_LABEL[item.state]}
                  </span>
                  <span className="min-w-0 grow truncate text-sm">{item.filename}</span>
                  <span className="meta shrink-0">{formatBytes(item.size)}</span>
                  {item.sha256 ? <code className="meta shrink-0">{shortHash(item.sha256)}</code> : null}
                </li>
              ))}
            </ul>
          ) : null}

          {items.some((i) => i.state === "failed") ? (
            <ul className="m-0 mt-2 flex list-none flex-col gap-1 p-0">
              {items
                .filter((i) => i.state === "failed")
                .map((i) => (
                  <li key={`${i.key}-err`} className="text-sm" style={{ color: "var(--conflict)" }}>
                    {i.filename}: {i.error}
                  </li>
                ))}
            </ul>
          ) : null}

          <div className="mt-6 flex items-center justify-between gap-3">
            <span className="meta">{uploadedCount} file{uploadedCount === 1 ? "" : "s"} ready</span>
            <button
              type="button"
              onClick={() => setStage("context")}
              disabled={uploadedCount === 0}
              className="btn btn-primary"
              style={{ cursor: uploadedCount > 0 ? "pointer" : "not-allowed" }}
            >
              Next — add context
            </button>
          </div>
        </Panel>
      ) : null}

      {stage === "context" ? (
        <Panel
          step="2"
          title="Tell Proofline what happened"
          lede="A few sentences in your own words. This is not analysed as a claim, it helps the analysis read ambiguous files the way you would, and gives the eventual report something to orient around."
        >
          <textarea
            value={context}
            onChange={(e) => setContext(e.target.value)}
            rows={6}
            maxLength={2000}
            placeholder="e.g. I bought a laptop from someone on a marketplace. They said the payment cleared and they'd shipped it, but I never received anything and the tracking never updated."
            className="w-full rounded-lg border px-4 py-3 text-sm"
            style={{ background: "var(--surface-elevated)", borderColor: "var(--border-strong)" }}
          />
          <p className="meta mt-2">{context.length} / 2000 · optional, but it makes the result better</p>

          {error ? (
            <p className="mt-3 rounded-lg border px-3 py-2 text-sm" style={{ borderColor: "var(--conflict)", background: "var(--conflict-soft)", color: "var(--ink-primary)" }} role="alert">
              {error}
            </p>
          ) : null}

          {!canProcess ? (
            <p className="mt-3 text-sm" style={{ color: "var(--warning)" }}>
              {processDisabledReason}
            </p>
          ) : null}

          <div className="mt-6 flex items-center justify-between gap-3">
            <button type="button" onClick={() => setStage("collect")} className="btn btn-quiet cursor-pointer">
              Back
            </button>
            <button
              type="button"
              onClick={() => void saveContextAndAnalyze()}
              disabled={!canProcess || savingContext}
              className="btn btn-primary"
              style={{ cursor: canProcess && !savingContext ? "pointer" : "not-allowed" }}
            >
              Analyze the evidence
            </button>
          </div>
        </Panel>
      ) : null}

      {stage === "analyzing" ? <AnalyzingPanel count={uploadedCount} /> : null}

      {stage === "result" ? (
        <ResultPanel bundle={bundle} result={result} nextSteps={nextSteps} />
      ) : null}
    </div>
  );
}

function StageRail({ stage }: { stage: Stage }) {
  const steps: Array<{ id: Stage; label: string }> = [
    { id: "collect", label: "Collect" },
    { id: "context", label: "Context" },
    { id: "analyzing", label: "Analyze" },
    { id: "result", label: "Result" },
  ];
  const activeIndex = steps.findIndex((s) => s.id === stage);

  return (
    <ol className="m-0 mb-8 flex list-none items-center gap-0 p-0" aria-label="Progress">
      {steps.map((step, index) => {
        const done = index < activeIndex;
        const active = index === activeIndex;
        return (
          <li key={step.id} className="flex flex-1 items-center gap-3 last:flex-none">
            <div className="flex items-center gap-2">
              <span
                className="flex h-7 w-7 items-center justify-center rounded-full border text-xs transition-colors"
                style={{
                  borderColor: active || done ? "var(--evidence)" : "var(--border-strong)",
                  background: done ? "var(--evidence)" : active ? "var(--evidence-soft)" : "transparent",
                  color: done ? "white" : active ? "var(--evidence)" : "var(--ink-muted)",
                }}
              >
                {done ? "✓" : index + 1}
              </span>
              <span className="text-sm" style={{ color: active ? "var(--ink-primary)" : "var(--ink-muted)", fontWeight: active ? 500 : 400 }}>
                {step.label}
              </span>
            </div>
            {index < steps.length - 1 ? (
              <span className="h-px flex-1" style={{ background: done ? "var(--evidence)" : "var(--border-subtle)" }} aria-hidden="true" />
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}

function Panel({ step, title, lede, children }: { step: string; title: string; lede: string; children: React.ReactNode }) {
  return (
    <section className="reveal is-visible">
      <p className="rail-label">Step {step}</p>
      <h1 className="mt-2 text-[clamp(1.5rem,3vw,2.1rem)] leading-tight" style={{ fontFamily: "var(--font-display)" }}>
        {title}
      </h1>
      <p className="mt-3 max-w-[60ch] text-sm" style={{ color: "var(--ink-secondary)" }}>
        {lede}
      </p>
      <div className="mt-7">{children}</div>
    </section>
  );
}

function AnalyzingPanel({ count }: { count: number }) {
  return (
    <section className="flex flex-col items-center py-16 text-center">
      <div className="trace-loader" aria-hidden="true">
        <span />
        <span />
        <span />
      </div>
      <h2 className="mt-8 text-xl" style={{ fontFamily: "var(--font-display)" }}>
        Reading your {count} file{count === 1 ? "" : "s"}…
      </h2>
      <p className="mt-2 max-w-[46ch] text-sm" style={{ color: "var(--ink-muted)" }}>
        Each file is analysed on its own, then placed in time and checked against the others. This usually takes under a
        minute, and longer for audio.
      </p>
      <ul className="m-0 mt-6 flex list-none flex-col items-start gap-2 p-0 text-sm" style={{ color: "var(--ink-secondary)" }}>
        {["Fingerprinting and reading each file", "Building the chronology", "Resolving who is who", "Comparing sources for differences"].map((line) => (
          <li key={line} className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full" style={{ background: "var(--evidence)" }} aria-hidden="true" />
            {line}
          </li>
        ))}
      </ul>
    </section>
  );
}

function ResultPanel({ bundle, result, nextSteps }: { bundle: CaseBundle; result: ProcessResult | null; nextSteps: NextStep[] }) {
  const events = result?.events ?? bundle.events.length;
  const conflicts = result?.conflicts ?? bundle.conflicts.filter((c) => c.classification !== "compatible").length;
  const analysed = result?.analysed ?? bundle.artifacts.length;
  const failed = result?.failed ?? [];

  return (
    <section className="reveal is-visible">
      <div
        className="flex items-center gap-3 rounded-xl border p-4"
        style={{ borderColor: "var(--verified)", background: "var(--verified-soft)" }}
      >
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm" style={{ background: "var(--verified)", color: "white" }} aria-hidden="true">
          ✓
        </span>
        <div>
          <p className="text-sm font-medium">Your evidence is organised.</p>
          <p className="meta">
            {analysed} file{analysed === 1 ? "" : "s"} read · {events} event{events === 1 ? "" : "s"} on the timeline ·{" "}
            {conflicts} difference{conflicts === 1 ? "" : "s"} found
          </p>
        </div>
      </div>

      {failed.length > 0 ? (
        <div className="mt-3 rounded-lg border px-3 py-2" style={{ borderColor: "var(--warning)", background: "var(--warning-soft)" }}>
          <p className="text-sm font-medium" style={{ color: "var(--warning)" }}>
            {failed.length} file{failed.length === 1 ? "" : "s"} could not be read
          </p>
          <ul className="m-0 mt-1 flex list-none flex-col gap-0.5 p-0">
            {failed.map((f) => (
              <li key={f.filename} className="meta">
                {f.filename}: {f.reason}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="mt-6 flex flex-wrap gap-3">
        <Link href={`/case/${bundle.case.id}?view=workspace`} className="btn btn-primary cursor-pointer">
          Open the full workspace
        </Link>
        <Link href={`/case/${bundle.case.id}/report`} className="btn btn-secondary cursor-pointer">
          Download the proof pack
        </Link>
      </div>

      {/* Suggested next steps — general options, explicitly not advice. */}
      <div className="mt-12">
        <p className="rail-label">Suggested next steps</p>
        <h2 className="mt-2 text-xl" style={{ fontFamily: "var(--font-display)" }}>
          What people often do from here
        </h2>
        <p className="mt-2 max-w-[62ch] text-sm" style={{ color: "var(--ink-muted)" }}>
          These are general options, not advice about your specific situation, and not legal guidance. Proofline
          organises evidence, the decisions are yours.
        </p>

        <ul className="m-0 mt-5 grid list-none gap-3 p-0 sm:grid-cols-2">
          {nextSteps.map((step) => (
            <li key={step.id} className="lift rounded-xl border p-4" style={{ borderColor: "var(--border-subtle)", background: "var(--surface-elevated)" }}>
              <p className="text-sm font-medium">{step.title}</p>
              <p className="mt-1.5 text-sm" style={{ color: "var(--ink-secondary)" }}>
                {step.body}
              </p>
              <p className="meta mt-2" style={{ color: "var(--signal)" }}>
                {step.because}
              </p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function TraceGlyph() {
  return (
    <svg width="140" height="44" viewBox="0 0 140 44" fill="none" aria-hidden="true">
      <path d="M6 34 L38 34 L64 16 L90 24 L134 10" stroke="var(--trace)" strokeWidth="1.5" strokeLinecap="round" />
      {[[38, 34], [64, 16], [90, 24]].map(([x, y]) => (
        <circle key={x} cx={x} cy={y} r="3.5" fill="var(--surface-elevated)" stroke="var(--trace)" strokeWidth="1.5" />
      ))}
      <circle cx="134" cy="10" r="4" fill="var(--evidence)" />
    </svg>
  );
}
