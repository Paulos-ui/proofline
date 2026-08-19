"use client";

import { useCallback, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { sha256File, shortHash } from "@/lib/integrity/hash";
import { ACCEPT_ATTRIBUTE, MAX_BATCH_FILES, validateUpload } from "@/lib/evidence/validate";
import { RailLabel, StatusPill } from "@/components/ui/atoms";
import { formatBytes } from "@/lib/utils/format";

type IntakeState = "queued" | "hashing" | "uploading" | "uploaded" | "failed";

type IntakeItem = {
  key: string;
  filename: string;
  size: number;
  state: IntakeState;
  progress: number;
  sha256?: string;
  error?: string;
};

const STATE_LABEL: Record<IntakeState, string> = {
  queued: "Queued",
  hashing: "Hashing",
  uploading: "Uploading",
  uploaded: "Uploaded",
  failed: "Failed",
};

/**
 * Intake. Files are fingerprinted locally before they are sent, so the hash exists
 * before the bytes leave the machine and the server can be checked against it.
 * One failure never takes the batch down with it.
 */
export function EvidenceIntake({
  caseId,
  canProcess,
  processDisabledReason,
}: {
  caseId: string;
  canProcess: boolean;
  processDisabledReason?: string;
}) {
  const router = useRouter();
  const [items, setItems] = useState<IntakeItem[]>([]);
  const [dragging, setDragging] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [processResult, setProcessResult] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const update = useCallback((key: string, patch: Partial<IntakeItem>) => {
    setItems((current) => current.map((item) => (item.key === key ? { ...item, ...patch } : item)));
  }, []);

  const ingest = useCallback(
    async (files: File[]) => {
      const batch = files.slice(0, MAX_BATCH_FILES);
      const queued: IntakeItem[] = batch.map((file, index) => ({
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
        } catch (error) {
          update(key, {
            state: "failed",
            error: error instanceof Error ? error.message : "The file could not be read.",
          });
        }
      }

      router.refresh();
    },
    [caseId, router, update],
  );

  const runProcessing = useCallback(async () => {
    setProcessing(true);
    setProcessResult(null);
    try {
      const response = await fetch(`/api/cases/${caseId}/process`, { method: "POST" });
      const body = (await response.json().catch(() => ({}))) as {
        error?: string;
        analysed?: number;
        failed?: Array<{ filename: string; reason: string }>;
        conflicts?: number;
      };
      if (!response.ok) {
        setProcessResult(body.error ?? "Processing did not complete.");
      } else {
        const failedCount = body.failed?.length ?? 0;
        setProcessResult(
          `Analysed ${body.analysed} artifacts${failedCount > 0 ? `, ${failedCount} failed` : ""}. ${body.conflicts ?? 0} differences found between sources.`,
        );
        router.refresh();
      }
    } catch {
      setProcessResult("Processing could not be started.");
    } finally {
      setProcessing(false);
    }
  }, [caseId, router]);

  const uploadedCount = items.filter((item) => item.state === "uploaded").length;
  const failedItems = items.filter((item) => item.state === "failed");

  return (
    <section aria-label="Add evidence">
      <div
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          void ingest(Array.from(event.dataTransfer.files));
        }}
        className="flex flex-col items-start gap-3 border border-dashed p-6 transition-colors"
        style={{
          borderColor: dragging ? "var(--trace-active)" : "var(--border-strong)",
          background: dragging ? "var(--evidence-soft)" : "transparent",
          borderRadius: 3,
        }}
      >
        <h3 className="text-base" style={{ fontFamily: "var(--font-display)" }}>
          Start with what you have.
        </h3>
        <p className="max-w-[58ch] text-sm" style={{ color: "var(--ink-muted)" }}>
          Screenshots, PDFs, receipts, emails, images, text files and audio can all become part of the same timeline.
          Each file is fingerprinted in your browser before it is uploaded.
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={() => inputRef.current?.click()} className="btn btn-primary cursor-pointer">
            Choose files
          </button>
          <span className="meta">or drop them here · up to 25 MB each</span>
        </div>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept={ACCEPT_ATTRIBUTE}
          className="sr-only"
          onChange={(event) => {
            void ingest(Array.from(event.target.files ?? []));
            event.target.value = "";
          }}
        />
      </div>

      {items.length > 0 ? (
        <div className="mt-4">
          <div className="mb-2 flex items-center justify-between">
            <RailLabel>Intake queue</RailLabel>
            <span className="meta">
              {uploadedCount} of {items.length} uploaded
            </span>
          </div>
          <ul className="m-0 flex list-none flex-col gap-px p-0" style={{ background: "var(--border-subtle)" }}>
            {items.map((item) => (
              <li key={item.key} className="flex items-center gap-3 p-2.5" style={{ background: "var(--surface-elevated)" }}>
                <StatusPill tone={item.state === "failed" ? "conflict" : item.state === "uploaded" ? "verified" : "neutral"}>
                  {STATE_LABEL[item.state]}
                </StatusPill>
                <span className="min-w-0 grow truncate text-sm">{item.filename}</span>
                <span className="meta shrink-0">{formatBytes(item.size)}</span>
                {item.sha256 ? <code className="meta shrink-0">{shortHash(item.sha256)}</code> : null}
                {item.state === "hashing" ? (
                  <span className="meta shrink-0">{Math.round(item.progress * 100)}%</span>
                ) : null}
              </li>
            ))}
          </ul>
          {failedItems.length > 0 ? (
            <ul className="m-0 mt-2 flex list-none flex-col gap-1 p-0">
              {failedItems.map((item) => (
                <li key={`${item.key}-error`} className="text-sm" style={{ color: "var(--conflict)" }}>
                  {item.filename}: {item.error}
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}

      <div className="mt-5 flex flex-wrap items-center gap-3 border-t pt-4" style={{ borderColor: "var(--border-subtle)" }}>
        <button
          type="button"
          onClick={() => void runProcessing()}
          disabled={!canProcess || processing}
          className="btn btn-primary"
          style={{ cursor: canProcess && !processing ? "pointer" : "not-allowed" }}
        >
          {processing ? "Processing…" : "Process evidence"}
        </button>
        {!canProcess && processDisabledReason ? (
          <span className="text-sm" style={{ color: "var(--warning)" }}>
            {processDisabledReason}
          </span>
        ) : (
          <span className="meta">Extraction runs on the server and rebuilds the timeline, connections and findings.</span>
        )}
        {processResult ? (
          <p className="w-full text-sm" style={{ color: "var(--ink-secondary)" }} role="status">
            {processResult}
          </p>
        ) : null}
      </div>
    </section>
  );
}
