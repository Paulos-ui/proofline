"use client";

import { useCallback, useRef, useState } from "react";
import { sha256File, shortHash } from "@/lib/integrity/hash";
import { checkFingerprint, type FingerprintResult } from "@/lib/integrity/manifest";
import type { Manifest } from "@/lib/schemas/case";
import { RailLabel, StatusPill } from "@/components/ui/atoms";
import { formatBytes, formatDateTime } from "@/lib/utils/format";

/**
 * Fingerprint checking. The file never leaves the browser: it is read locally, hashed
 * with Web Crypto, and only the digest is compared against the manifest.
 */
export function VerifyPanel({
  manifest,
  manifestLabel,
  allowManifestUpload = true,
}: {
  manifest: Manifest | null;
  manifestLabel?: string;
  allowManifestUpload?: boolean;
}) {
  const [activeManifest, setActiveManifest] = useState<Manifest | null>(manifest);
  const [manifestName, setManifestName] = useState(manifestLabel ?? (manifest ? `${manifest.caseRef} manifest` : ""));
  const [state, setState] = useState<
    | { phase: "idle" }
    | { phase: "hashing"; filename: string; progress: number }
    | { phase: "done"; filename: string; size: number; hash: string; result: FingerprintResult }
    | { phase: "error"; message: string }
  >({ phase: "idle" });
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const runCheck = useCallback(
    async (file: File) => {
      if (!activeManifest) {
        setState({ phase: "error", message: "Load a manifest first, then choose the file you want to check." });
        return;
      }
      setState({ phase: "hashing", filename: file.name, progress: 0 });
      try {
        const hash = await sha256File(file, (fraction) =>
          setState({ phase: "hashing", filename: file.name, progress: fraction }),
        );
        const result = await checkFingerprint(hash, file.name, activeManifest);
        setState({ phase: "done", filename: file.name, size: file.size, hash, result });
      } catch (error) {
        setState({
          phase: "error",
          message: error instanceof Error ? error.message : "The file could not be read.",
        });
      }
    },
    [activeManifest],
  );

  const loadManifest = useCallback(async (file: File) => {
    try {
      const parsed = JSON.parse(await file.text()) as Manifest;
      setActiveManifest(parsed);
      setManifestName(file.name);
      setState({ phase: "idle" });
    } catch {
      setState({ phase: "error", message: `${file.name} is not valid JSON, so it cannot be read as a manifest.` });
    }
  }, []);

  return (
    <div className="flex flex-col gap-4">
      <div>
        <RailLabel>Registered manifest</RailLabel>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          {activeManifest ? (
            <>
              <StatusPill tone="neutral" marker={false}>
                {activeManifest.caseRef} · {activeManifest.artifacts.length} artifacts
              </StatusPill>
              <code className="meta">{shortHash(activeManifest.merkleRoot)}</code>
              <span className="meta">{manifestName}</span>
            </>
          ) : (
            <span className="text-sm" style={{ color: "var(--ink-muted)" }}>
              No manifest loaded.
            </span>
          )}
          {allowManifestUpload ? (
            <label className="btn btn-quiet cursor-pointer text-xs">
              Use a different manifest
              <input
                type="file"
                accept="application/json,.json"
                className="sr-only"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) void loadManifest(file);
                  event.target.value = "";
                }}
              />
            </label>
          ) : null}
        </div>
      </div>

      <div
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          const file = event.dataTransfer.files?.[0];
          if (file) void runCheck(file);
        }}
        className="flex flex-col items-start gap-3 border border-dashed p-6 transition-colors"
        style={{
          borderColor: dragging ? "var(--trace-active)" : "var(--border-strong)",
          background: dragging ? "var(--evidence-soft)" : "transparent",
          borderRadius: 3,
        }}
      >
        <h3 className="text-base" style={{ fontFamily: "var(--font-display)" }}>
          Check a file against its registered fingerprint
        </h3>
        <p className="max-w-[58ch] text-sm" style={{ color: "var(--ink-muted)" }}>
          Drop a file here, or choose one. It is hashed in your browser with SHA-256 and never uploaded.
        </p>
        <button type="button" className="btn btn-primary cursor-pointer" onClick={() => inputRef.current?.click()}>
          Choose a file
        </button>
        <input
          ref={inputRef}
          type="file"
          className="sr-only"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void runCheck(file);
            event.target.value = "";
          }}
        />
      </div>

      {state.phase === "hashing" ? <HashingProgress filename={state.filename} progress={state.progress} /> : null}

      {state.phase === "error" ? (
        <p className="panel p-4 text-sm" style={{ color: "var(--conflict)" }}>
          {state.message}
        </p>
      ) : null}

      {state.phase === "done" ? (
        <VerificationResult filename={state.filename} size={state.size} hash={state.hash} result={state.result} />
      ) : null}
    </div>
  );
}

/** The fingerprint resolves progressively as the file is read. */
function HashingProgress({ filename, progress }: { filename: string; progress: number }) {
  const revealed = Math.floor(progress * 64);
  const placeholder = "0123456789abcdef";
  const characters = Array.from({ length: 64 }, (_, i) =>
    i < revealed ? "•" : placeholder[(i * 7) % 16],
  ).join("");

  return (
    <div className="panel p-4" aria-live="polite">
      <RailLabel>Fingerprinting {filename}</RailLabel>
      <code className="meta mt-2 block break-all" style={{ color: "var(--ink-muted)" }}>
        {characters}
      </code>
      <div className="mt-3 h-px w-full" style={{ background: "var(--border-subtle)" }}>
        <div className="h-px" style={{ width: `${progress * 100}%`, background: "var(--trace-active)", transition: "width 120ms linear" }} />
      </div>
    </div>
  );
}

function VerificationResult({
  filename,
  size,
  hash,
  result,
}: {
  filename: string;
  size: number;
  hash: string;
  result: FingerprintResult;
}) {
  if (result.status === "manifest-invalid") {
    return (
      <div className="panel p-5" role="status">
        <StatusPill tone="conflict">Manifest could not be used</StatusPill>
        <p className="mt-3 text-sm" style={{ color: "var(--ink-secondary)" }}>
          {result.reason}
        </p>
      </div>
    );
  }

  const matched = result.status === "match";

  return (
    <div
      className="panel overflow-hidden"
      role="status"
      style={{ borderColor: matched ? "var(--verified)" : "var(--conflict)" }}
    >
      <div className="flex items-center gap-3 p-5" style={{ background: matched ? "var(--verified-soft)" : "var(--conflict-soft)" }}>
        <IntegrityGlyph matched={matched} />
        <div>
          <h3 className="text-lg" style={{ fontFamily: "var(--font-display)", color: matched ? "var(--verified)" : "var(--conflict)" }}>
            {matched ? "Integrity match" : "Fingerprint mismatch"}
          </h3>
          <p className="mt-0.5 text-sm" style={{ color: "var(--ink-secondary)" }}>
            {matched
              ? `This file matches the fingerprint registered for ${result.entry.filename}.`
              : "This file does not match any fingerprint registered in this manifest."}
          </p>
        </div>
      </div>

      <dl className="grid grid-cols-[auto_1fr] gap-x-5 gap-y-2 p-5">
        <dt className="rail-label">File</dt>
        <dd className="meta">
          {filename} · {formatBytes(size)}
        </dd>
        <dt className="rail-label">Computed</dt>
        <dd className="meta break-all">{hash}</dd>
        {result.status === "match" ? (
          <>
            <dt className="rail-label">Registered as</dt>
            <dd className="meta">
              {result.entry.filename} · {formatBytes(result.entry.byteSize)} · {result.entry.mimeType}
            </dd>
          </>
        ) : result.nearest ? (
          <>
            <dt className="rail-label">Expected</dt>
            <dd className="meta break-all" style={{ color: "var(--conflict)" }}>
              {result.nearest.sha256}
              <span className="block" style={{ color: "var(--ink-muted)" }}>
                registered for {result.nearest.filename} ({formatBytes(result.nearest.byteSize)})
              </span>
            </dd>
          </>
        ) : null}
        <dt className="rail-label">Case</dt>
        <dd className="meta">
          {result.manifest.caseRef} · registered {formatDateTime(result.manifest.createdAt)}
        </dd>
        <dt className="rail-label">Merkle root</dt>
        <dd className="meta break-all">{result.manifest.merkleRoot}</dd>
      </dl>

      <p className="border-t p-4 text-sm" style={{ borderColor: "var(--border-subtle)", color: "var(--ink-muted)" }}>
        This test detects byte-level changes. It does not independently establish whether the original content was
        truthful or genuine.
      </p>
    </div>
  );
}

/** The verification motif: the trace closes, or it does not. */
function IntegrityGlyph({ matched }: { matched: boolean }) {
  const color = matched ? "var(--verified)" : "var(--conflict)";
  return (
    <svg width="40" height="40" viewBox="0 0 40 40" aria-hidden="true" className="shrink-0">
      <circle cx="20" cy="20" r="15" fill="none" stroke={color} strokeWidth="1.2" opacity="0.4" />
      {matched ? (
        <path d="M11 8 L11 20 L20 26 L29 20 L29 32" fill="none" stroke={color} strokeWidth="1.6" />
      ) : (
        <>
          <path d="M11 8 L11 19" fill="none" stroke={color} strokeWidth="1.6" />
          <path d="M20 25 L29 19 L29 32" fill="none" stroke={color} strokeWidth="1.6" />
          <path d="M13 22 L18 22" fill="none" stroke={color} strokeWidth="1.6" strokeDasharray="2 2" />
        </>
      )}
      <circle cx="20" cy={matched ? 26 : 22} r="2.5" fill={color} />
    </svg>
  );
}
