"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";

/**
 * The hero states the product's thesis before any copy does: five unrelated
 * artifacts, then the same five ordered in time with a trace drawn through them.
 *
 * Positions are fixed, not random, so the animation is the same every load and the
 * resolved order is genuinely chronological.
 */

type Fragment = {
  id: string;
  label: string;
  time: string;
  kind: "message" | "receipt" | "email" | "audio" | "document";
  scattered: { x: number; y: number; rotate: number };
};

const WIDTH = 980;
const HEIGHT = 380;
const RESOLVED_Y = 232;

const FRAGMENTS: Fragment[] = [
  { id: "f1", label: "Chat screenshot", time: "2 Mar 16:09", kind: "message", scattered: { x: 96, y: 44, rotate: -7 } },
  { id: "f2", label: "Transfer receipt", time: "3 Mar 11:47", kind: "receipt", scattered: { x: 640, y: 22, rotate: 6 } },
  { id: "f3", label: "Email", time: "3 Mar 11:41", kind: "email", scattered: { x: 372, y: 96, rotate: 3 } },
  { id: "f4", label: "Voice note", time: "5 Mar 18:40", kind: "audio", scattered: { x: 786, y: 120, rotate: -4 } },
  { id: "f5", label: "Consignment note", time: "5 Mar 16:20", kind: "document", scattered: { x: 208, y: 148, rotate: 8 } },
];

/** Resolved order is by time, which is the point being demonstrated. */
const RESOLVED_ORDER = ["f1", "f3", "f2", "f5", "f4"];

/** Reads the reduced-motion setting as an external store rather than via state. */
function usePrefersReducedMotion(): boolean {
  const subscribe = useCallback((onChange: () => void) => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, []);
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    () => false,
  );
}

export function HeroTrace() {
  const reduced = usePrefersReducedMotion();
  const [settled, setSettled] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (reduced) return;
    const timer = window.setTimeout(() => setSettled(true), 900);
    return () => window.clearTimeout(timer);
  }, [reduced]);

  // With motion reduced the resolved state is shown immediately: the ordering is
  // information, so it must not depend on an animation running.
  const resolved = reduced || settled;

  const resolvedX = (id: string) => {
    const index = RESOLVED_ORDER.indexOf(id);
    return 78 + index * ((WIDTH - 200) / (RESOLVED_ORDER.length - 1));
  };

  const tracePath = RESOLVED_ORDER.map((id, index) => `${index === 0 ? "M" : "L"} ${resolvedX(id)} ${RESOLVED_Y}`).join(" ");

  return (
    <div ref={ref} className="relative w-full select-none" style={{ aspectRatio: `${WIDTH} / ${HEIGHT}` }}>
      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="absolute inset-0 h-full w-full" aria-hidden="true">
        {/* the trace, drawn once the artifacts have settled */}
        <path
          d={tracePath}
          fill="none"
          stroke="var(--trace-active)"
          strokeWidth="1.25"
          strokeDasharray={WIDTH}
          style={{
            strokeDashoffset: resolved ? 0 : WIDTH,
            transition: reduced ? "none" : "stroke-dashoffset 1100ms 700ms cubic-bezier(0.65,0,0.35,1)",
          }}
        />
        {RESOLVED_ORDER.map((id, index) => (
          <circle
            key={id}
            cx={resolvedX(id)}
            cy={RESOLVED_Y}
            r="3.5"
            fill="var(--surface-primary)"
            stroke="var(--trace-active)"
            strokeWidth="1.25"
            style={{
              opacity: resolved ? 1 : 0,
              transition: reduced ? "none" : `opacity 300ms ${900 + index * 180}ms`,
            }}
          />
        ))}
        {/* time axis appears only once the order means something */}
        <line
          x1="60"
          y1={RESOLVED_Y + 44}
          x2={WIDTH - 60}
          y2={RESOLVED_Y + 44}
          stroke="var(--border-subtle)"
          strokeWidth="1"
          style={{ opacity: resolved ? 1 : 0, transition: "opacity 500ms 1400ms" }}
        />
      </svg>

      {FRAGMENTS.map((fragment, index) => {
        const x = resolved ? resolvedX(fragment.id) - 62 : fragment.scattered.x;
        const y = resolved ? RESOLVED_Y - 92 : fragment.scattered.y;
        const rotate = resolved ? 0 : fragment.scattered.rotate;
        return (
          <div
            key={fragment.id}
            className="absolute"
            style={{
              left: `${(x / WIDTH) * 100}%`,
              top: `${(y / HEIGHT) * 100}%`,
              width: `${(124 / WIDTH) * 100}%`,
              transform: `rotate(${rotate}deg)`,
              transition: reduced
                ? "none"
                : `left 900ms cubic-bezier(0.2,0.8,0.2,1) ${index * 70}ms, top 900ms cubic-bezier(0.2,0.8,0.2,1) ${index * 70}ms, transform 900ms cubic-bezier(0.2,0.8,0.2,1) ${index * 70}ms`,
            }}
          >
            <FragmentCard fragment={fragment} showTime={resolved} reduced={reduced} />
          </div>
        );
      })}

      {RESOLVED_ORDER.map((id, index) => {
        const fragment = FRAGMENTS.find((f) => f.id === id)!;
        return (
          <span
            key={`t-${id}`}
            className="meta absolute whitespace-nowrap"
            style={{
              left: `${(resolvedX(id) / WIDTH) * 100}%`,
              top: `${((RESOLVED_Y + 54) / HEIGHT) * 100}%`,
              transform: "translateX(-50%)",
              opacity: resolved ? 1 : 0,
              transition: reduced ? "none" : `opacity 400ms ${1400 + index * 90}ms`,
            }}
          >
            {fragment.time}
          </span>
        );
      })}
    </div>
  );
}

function FragmentCard({ fragment, showTime, reduced }: { fragment: Fragment; showTime: boolean; reduced: boolean }) {
  return (
    <div
      className="flex flex-col gap-1.5 px-2.5 py-2"
      style={{
        background: "var(--surface-elevated)",
        border: "1px solid var(--border-subtle)",
        borderRadius: 2,
        boxShadow: showTime ? "none" : "0 6px 18px -12px rgba(20,18,15,0.45)",
        transition: reduced ? "none" : "box-shadow 700ms",
      }}
    >
      <KindGlyph kind={fragment.kind} />
      <span className="text-[0.6875rem] leading-tight" style={{ color: "var(--ink-secondary)" }}>
        {fragment.label}
      </span>
    </div>
  );
}

function KindGlyph({ kind }: { kind: Fragment["kind"] }) {
  const stroke = "var(--trace)";
  return (
    <svg viewBox="0 0 100 44" className="w-full" style={{ height: 30 }} aria-hidden="true">
      {kind === "message" ? (
        <>
          <rect x="2" y="4" width="52" height="13" rx="2" fill="none" stroke={stroke} />
          <rect x="30" y="21" width="52" height="13" rx="2" fill="none" stroke="var(--evidence)" />
          <path d="M8 10 H40" stroke={stroke} strokeWidth="1" />
          <path d="M36 27 H70" stroke="var(--evidence)" strokeWidth="1" />
        </>
      ) : null}
      {kind === "receipt" ? (
        <>
          <path d="M22 2 H78 V40 L70 36 L62 40 L54 36 L46 40 L38 36 L30 40 L22 36 Z" fill="none" stroke={stroke} />
          <path d="M30 12 H70 M30 20 H58" stroke={stroke} strokeWidth="1" />
          <path d="M30 28 H50" stroke="var(--evidence)" strokeWidth="1.4" />
        </>
      ) : null}
      {kind === "email" ? (
        <>
          <rect x="12" y="6" width="76" height="32" fill="none" stroke={stroke} />
          <path d="M12 6 L50 26 L88 6" fill="none" stroke={stroke} />
          <path d="M18 32 H40" stroke="var(--evidence)" strokeWidth="1.2" />
        </>
      ) : null}
      {kind === "audio" ? (
        <g>
          {Array.from({ length: 17 }, (_, i) => {
            const h = 6 + Math.abs(Math.sin(i * 0.9)) * 26;
            return <line key={i} x1={10 + i * 5} y1={22 - h / 2} x2={10 + i * 5} y2={22 + h / 2} stroke={i > 6 && i < 11 ? "var(--evidence)" : stroke} strokeWidth="1.6" />;
          })}
        </g>
      ) : null}
      {kind === "document" ? (
        <>
          <path d="M24 2 H62 L76 16 V42 H24 Z" fill="none" stroke={stroke} />
          <path d="M62 2 V16 H76" fill="none" stroke={stroke} />
          <path d="M32 24 H68 M32 31 H68" stroke={stroke} strokeWidth="1" />
          <path d="M32 38 H52" stroke="var(--evidence)" strokeWidth="1.2" />
        </>
      ) : null}
    </svg>
  );
}
