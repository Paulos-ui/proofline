"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/**
 * Deleting a case removes the derived records and the stored evidence bytes.
 * It is irreversible, so it asks for the case reference to be typed back.
 */
export function DeleteCaseButton({ caseId, caseRef }: { caseId: string; caseRef: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const remove = async () => {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(`/api/cases/${caseId}`, { method: "DELETE" });
      const body = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) {
        setError(body.error ?? "The case could not be deleted.");
        return;
      }
      router.push("/dashboard");
      router.refresh();
    } catch {
      setError("The case could not be deleted. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  };

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="btn btn-quiet cursor-pointer text-sm">
        Delete case
      </button>
    );
  }

  return (
    <div className="panel p-4" style={{ borderColor: "var(--conflict)" }}>
      <p className="text-sm font-medium">Delete this case permanently?</p>
      <p className="mt-1 max-w-[52ch] text-sm" style={{ color: "var(--ink-muted)" }}>
        Every artifact, the chronology built from it and the stored files are removed. Manifests you have already
        downloaded still work, but the evidence they refer to will be gone from here.
      </p>
      <label className="mt-3 flex flex-col gap-1.5">
        <span className="text-sm">
          Type <code className="meta">{caseRef}</code> to confirm
        </span>
        <input
          value={confirmation}
          onChange={(event) => setConfirmation(event.target.value)}
          className="border px-3 py-2 text-sm"
          style={{ background: "var(--surface-primary)", borderColor: "var(--border-strong)", borderRadius: 3 }}
        />
      </label>
      {error ? (
        <p className="mt-2 text-sm" style={{ color: "var(--conflict)" }} role="alert">
          {error}
        </p>
      ) : null}
      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={() => void remove()}
          disabled={confirmation !== caseRef || busy}
          className="btn btn-primary"
          style={{
            background: "var(--conflict)",
            color: "var(--surface-primary)",
            cursor: confirmation === caseRef && !busy ? "pointer" : "not-allowed",
          }}
        >
          {busy ? "Deleting…" : "Delete permanently"}
        </button>
        <button
          type="button"
          onClick={() => {
            setOpen(false);
            setConfirmation("");
            setError(null);
          }}
          className="btn btn-quiet cursor-pointer"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
