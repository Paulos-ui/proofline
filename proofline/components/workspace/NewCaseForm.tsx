"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { RailLabel } from "@/components/ui/atoms";

const TIMEZONES = ["UTC", "Europe/London", "America/New_York", "Africa/Lagos", "Asia/Kolkata", "Asia/Singapore"];

export function NewCaseForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [timezone, setTimezone] = useState("UTC");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (title.trim().length === 0) {
      setError("Give the case a title so you can recognise it later.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/cases", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ title: title.trim(), description: description.trim(), incidentTimezone: timezone }),
      });
      const body = (await response.json().catch(() => ({}))) as { id?: string; error?: string };
      if (!response.ok || !body.id) {
        setError(body.error ?? "The case could not be created.");
        return;
      }
      router.push(`/case/${body.id}`);
    } catch {
      setError("The case could not be created. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  };

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="btn btn-primary cursor-pointer">
        New case
      </button>
    );
  }

  return (
    <div className="panel p-5">
      <RailLabel>New case</RailLabel>
      <div className="mt-3 flex flex-col gap-4">
        <label className="flex flex-col gap-1.5">
          <span className="text-sm">Title</span>
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            maxLength={200}
            placeholder="Marketplace laptop purchase"
            className="border px-3 py-2 text-sm"
            style={{ background: "var(--surface-primary)", borderColor: "var(--border-strong)", borderRadius: 3 }}
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-sm">
            What happened <span style={{ color: "var(--ink-muted)" }}>(optional)</span>
          </span>
          <textarea
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            rows={3}
            maxLength={2000}
            placeholder="A short description helps the analysis interpret the evidence."
            className="border px-3 py-2 text-sm"
            style={{ background: "var(--surface-primary)", borderColor: "var(--border-strong)", borderRadius: 3 }}
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-sm">Timezone for the chronology</span>
          <select
            value={timezone}
            onChange={(event) => setTimezone(event.target.value)}
            className="cursor-pointer border px-3 py-2 text-sm"
            style={{ background: "var(--surface-primary)", borderColor: "var(--border-strong)", borderRadius: 3 }}
          >
            {TIMEZONES.map((zone) => (
              <option key={zone} value={zone}>
                {zone}
              </option>
            ))}
          </select>
        </label>
        {error ? (
          <p className="text-sm" style={{ color: "var(--conflict)" }} role="alert">
            {error}
          </p>
        ) : null}
        <div className="flex gap-2">
          <button type="button" onClick={() => void submit()} disabled={busy} className="btn btn-primary cursor-pointer">
            {busy ? "Creating…" : "Create case"}
          </button>
          <button type="button" onClick={() => setOpen(false)} className="btn btn-quiet cursor-pointer">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
