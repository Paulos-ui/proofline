"use client";

import { useEffect, useRef, useState } from "react";

/**
 * The interactive hero. Instead of playing an animation at the visitor, it lets them
 * drive it: pick an evidence type and watch that fragment take its place on the
 * timeline with the trace drawn to its source. The point of the product — scattered
 * things become one ordered, sourced line — is something you do here, not read.
 *
 * Everything is keyboard operable and honours reduced-motion.
 */

type Piece = {
  id: string;
  kind: "chat" | "receipt" | "email" | "voice" | "doc";
  label: string;
  time: string;
  said: string;
  /** Order on the resolved timeline (by time). */
  order: number;
};

const PIECES: Piece[] = [
  { id: "chat", kind: "chat", label: "Screenshot", time: "2 Mar, 16:09", said: "$560 all in. Courier is on me.", order: 0 },
  { id: "email", kind: "email", label: "Email", time: "3 Mar, 11:41", said: "The payment has cleared on my end.", order: 1 },
  { id: "receipt", kind: "receipt", label: "Receipt", time: "3 Mar, 11:47", said: "Status: Pending", order: 2 },
  { id: "doc", kind: "doc", label: "Courier PDF", time: "5 Mar, 16:20", said: "Label created — not yet collected.", order: 3 },
  { id: "voice", kind: "voice", label: "Voice note", time: "5 Mar, 18:40", said: "I'll drop it at the courier tomorrow.", order: 4 },
];

export function InteractiveHero() {
  const reduced = typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  // Reduced-motion visitors see the finished timeline from the first render.
  const [placed, setPlaced] = useState<string[]>(() => (reduced ? PIECES.map((p) => p.id) : []));
  const [active, setActive] = useState<string | null>(null);
  const autoRef = useRef<number | null>(null);
  const startedRef = useRef(false);

  const allPlaced = placed.length === PIECES.length;

  // Gentle auto-demo the first time the hero is on screen, so a visitor who does
  // nothing still sees the idea. It stops the moment they interact.
  useEffect(() => {
    if (reduced || startedRef.current) return;
    const timer = window.setTimeout(() => {
      startedRef.current = true;
      let i = 0;
      const step = () => {
        setPlaced((current) => {
          if (current.length >= PIECES.length) return current;
          const next = PIECES.find((p) => !current.includes(p.id));
          return next ? [...current, next.id] : current;
        });
        i += 1;
        if (i < PIECES.length) autoRef.current = window.setTimeout(step, 620);
      };
      step();
    }, 700);
    return () => window.clearTimeout(timer);
  }, [reduced]);

  const stopAuto = () => {
    if (autoRef.current) window.clearTimeout(autoRef.current);
    startedRef.current = true;
  };

  const place = (id: string) => {
    stopAuto();
    setActive(id);
    setPlaced((current) => (current.includes(id) ? current : [...current, id]));
  };

  const reset = () => {
    stopAuto();
    setActive(null);
    setPlaced([]);
  };

  const resolved = PIECES.filter((p) => placed.includes(p.id)).sort((a, b) => a.order - b.order);

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_1.35fr] lg:items-center">
      {/* Controls — the "you do something" side */}
      <div>
        <p className="rail-label">Try it: drop each piece in</p>
        <div className="mt-3 flex flex-wrap gap-2" role="group" aria-label="Add evidence to the timeline">
          {PIECES.map((piece) => {
            const done = placed.includes(piece.id);
            return (
              <button
                key={piece.id}
                type="button"
                onClick={() => place(piece.id)}
                aria-pressed={done}
                className="group flex cursor-pointer items-center gap-2 rounded-full border px-3 py-2 text-sm transition-all"
                style={{
                  borderColor: done ? "var(--evidence)" : "var(--border-strong)",
                  background: done ? "var(--evidence-soft)" : "var(--surface-elevated)",
                  color: done ? "var(--evidence)" : "var(--ink-secondary)",
                }}
              >
                <PieceGlyph kind={piece.kind} size={16} placed={done} />
                {piece.label}
                <span
                  className="ml-0.5 transition-transform"
                  style={{ transform: done ? "scale(1)" : "scale(0)", color: "var(--evidence)" }}
                  aria-hidden="true"
                >
                  ✓
                </span>
              </button>
            );
          })}
        </div>

        <div className="mt-5 min-h-[3.5rem]">
          {allPlaced ? (
            <p className="text-sm" style={{ color: "var(--ink-secondary)" }}>
              Five unrelated files, now one ordered story — and{" "}
              <span style={{ color: "var(--evidence)", fontWeight: 500 }}>the payment shows cleared and pending six minutes apart.</span>{" "}
              Proofline flags that, and shows you both sources.
            </p>
          ) : (
            <p className="text-sm" style={{ color: "var(--ink-muted)" }}>
              Each piece takes its place in time, with a line drawn back to exactly where the claim came from.
            </p>
          )}
        </div>

        {placed.length > 0 ? (
          <button
            type="button"
            onClick={reset}
            className="mt-1 cursor-pointer text-sm underline decoration-dotted underline-offset-4"
            style={{ color: "var(--ink-muted)" }}
          >
            Clear and try again
          </button>
        ) : null}
      </div>

      {/* The timeline: the result side */}
      <div
        className="relative rounded-xl border p-5 sm:p-6"
        style={{ background: "var(--surface-elevated)", borderColor: "var(--border-subtle)", minHeight: 340 }}
      >
        <div className="mb-4 flex items-center justify-between">
          <span className="rail-label">Chronology</span>
          <span className="meta" style={{ color: allPlaced ? "var(--evidence)" : "var(--ink-muted)" }}>
            {resolved.length} of {PIECES.length} placed
          </span>
        </div>

        {resolved.length === 0 ? (
          <div className="flex h-[220px] flex-col items-center justify-center gap-2 text-center">
            <TraceGlyph />
            <p className="mt-2 text-sm" style={{ color: "var(--ink-muted)" }}>
              Pick a piece on the left to begin.
            </p>
          </div>
        ) : (
          <ol className="relative m-0 list-none p-0">
            {/* the spine */}
            <span
              className="absolute bottom-2 left-[7px] top-2 w-px"
              style={{ background: "var(--trace)" }}
              aria-hidden="true"
            />
            {resolved.map((piece, index) => (
              <li
                key={piece.id}
                className="relative grid grid-cols-[1rem_1fr] gap-3 pb-4 last:pb-0"
                style={{
                  animation: reduced ? "none" : "hero-drop 420ms cubic-bezier(0.2,0.8,0.2,1) both",
                  animationDelay: `${index * 40}ms`,
                }}
              >
                <span
                  className="relative z-10 mt-1 block h-[15px] w-[15px] rounded-full border-2"
                  style={{
                    background: "var(--surface-elevated)",
                    borderColor: active === piece.id ? "var(--evidence)" : "var(--trace-active)",
                  }}
                  aria-hidden="true"
                />
                <div>
                  <div className="flex flex-wrap items-baseline gap-x-2">
                    <span className="meta" style={{ color: "var(--evidence)" }}>
                      {piece.time}
                    </span>
                    <span className="text-sm font-medium">{piece.label}</span>
                  </div>
                  <p className="mt-0.5 text-sm" style={{ color: "var(--ink-secondary)" }}>
                    “{piece.said}”
                  </p>
                </div>
              </li>
            ))}
          </ol>
        )}

        {allPlaced ? (
          <div
            className="mt-2 flex items-center gap-2 rounded-lg border px-3 py-2"
            style={{ borderColor: "var(--conflict)", background: "var(--conflict-soft)" }}
          >
            <span
              className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs"
              style={{ background: "var(--conflict)", color: "white" }}
              aria-hidden="true"
            >
              !
            </span>
            <span className="text-sm" style={{ color: "var(--ink-primary)" }}>
              Potential inconsistency found: cleared vs pending
            </span>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function PieceGlyph({ kind, size = 18, placed = false }: { kind: Piece["kind"]; size?: number; placed?: boolean }) {
  const c = placed ? "var(--evidence)" : "var(--ink-muted)";
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      {kind === "chat" ? <path d="M4 5h13v9H9l-4 4v-4H4z" stroke={c} strokeWidth="1.5" strokeLinejoin="round" /> : null}
      {kind === "receipt" ? (
        <path d="M6 3h12v18l-3-2-3 2-3-2-3 2zM9 8h6M9 12h6M9 16h3" stroke={c} strokeWidth="1.5" strokeLinejoin="round" />
      ) : null}
      {kind === "email" ? (
        <>
          <rect x="3" y="5" width="18" height="14" rx="1.5" stroke={c} strokeWidth="1.5" />
          <path d="M3 7l9 6 9-6" stroke={c} strokeWidth="1.5" />
        </>
      ) : null}
      {kind === "voice" ? (
        <>
          <rect x="9" y="3" width="6" height="11" rx="3" stroke={c} strokeWidth="1.5" />
          <path d="M6 11a6 6 0 0012 0M12 17v4" stroke={c} strokeWidth="1.5" strokeLinecap="round" />
        </>
      ) : null}
      {kind === "doc" ? (
        <path d="M7 3h7l4 4v14H7zM14 3v4h4M10 12h5M10 16h5" stroke={c} strokeWidth="1.5" strokeLinejoin="round" />
      ) : null}
    </svg>
  );
}

function TraceGlyph() {
  return (
    <svg width="120" height="40" viewBox="0 0 120 40" fill="none" aria-hidden="true">
      <path d="M4 30 L30 30 L52 14 L74 22 L116 8" stroke="var(--trace)" strokeWidth="1.5" strokeLinecap="round" />
      {[30, 52, 74].map((x, i) => (
        <circle key={x} cx={x} cy={[30, 14, 22][i]} r="3" fill="var(--surface-elevated)" stroke="var(--trace)" strokeWidth="1.5" />
      ))}
      <circle cx="116" cy="8" r="3.5" fill="var(--evidence)" />
    </svg>
  );
}
