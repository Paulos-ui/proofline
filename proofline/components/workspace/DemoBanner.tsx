"use client";

import { useState } from "react";

/**
 * The demo has to be honest about what it is: fictional evidence, and analysis that
 * was computed once and stored rather than produced by a live model call.
 */
export function DemoBanner() {
  const [open, setOpen] = useState(false);

  return (
    <div className="border-b" style={{ borderColor: "var(--border-subtle)", background: "var(--analysis-soft)" }}>
      <div className="mx-auto flex w-full max-w-[100rem] flex-wrap items-center gap-x-4 gap-y-2 px-4 py-2.5 md:px-6">
        <p className="text-sm" style={{ color: "var(--ink-secondary)" }}>
          Everything in this case is fictional and was created for demonstration.
        </p>
        <button type="button" onClick={() => setOpen(!open)} aria-expanded={open} className="btn btn-quiet cursor-pointer text-xs">
          {open ? "Hide detail" : "What is real here?"}
        </button>
      </div>
      {open ? (
        <div className="mx-auto w-full max-w-[100rem] px-4 pb-4 md:px-6">
          <ul className="m-0 grid list-none gap-x-8 gap-y-2 p-0 text-sm md:grid-cols-2" style={{ color: "var(--ink-secondary)" }}>
            <li>
              <strong className="font-medium">Real:</strong> the eight evidence files, their SHA-256 fingerprints, the
              Merkle root, the entity resolution, the differences found between sources, and the sensitive-value
              detection. All of it is computed by the same code the live product runs.
            </li>
            <li>
              <strong className="font-medium">Seeded:</strong> the per-artifact extraction that a vision model would
              normally produce, and the voice-note transcript. These are stored fixtures, so this page cannot fail
              because a provider is unavailable. Live cases call the model for real.
            </li>
          </ul>
        </div>
      ) : null}
    </div>
  );
}
