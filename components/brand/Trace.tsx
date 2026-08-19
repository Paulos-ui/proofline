"use client";

import { useEffect, useRef, useState } from "react";

/**
 * The trace is Proofline's one structural device. It appears as a section divider,
 * a timeline spine, a progress rail and the thread drawn from a claim to its source.
 * Everything else on the page stays quiet so the trace carries the identity.
 */

/** A horizontal rule with evidence nodes on it. Draws itself when scrolled into view. */
export function TraceRule({
  nodes = 3,
  className = "",
  active = -1,
  animate = true,
}: {
  nodes?: number;
  className?: string;
  /** Index of the node rendered in the evidence colour. */
  active?: number;
  animate?: boolean;
}) {
  const ref = useRef<SVGSVGElement>(null);
  const [drawn, setDrawn] = useState(!animate);

  useEffect(() => {
    if (!animate || drawn) return;
    const element = ref.current;
    if (!element) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setDrawn(true);
          observer.disconnect();
        }
      },
      { threshold: 0.4 },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, [animate, drawn]);

  const positions = Array.from({ length: nodes }, (_, i) => ((i + 1) / (nodes + 1)) * 100);

  return (
    <svg ref={ref} className={`w-full h-3 ${className}`} viewBox="0 0 100 6" preserveAspectRatio="none" aria-hidden="true">
      <line
        x1="0"
        y1="3"
        x2="100"
        y2="3"
        stroke="var(--trace)"
        strokeWidth="0.4"
        vectorEffect="non-scaling-stroke"
        className={drawn ? "trace-draw" : ""}
        style={drawn ? ({ ["--trace-length" as string]: 100, ["--trace-duration" as string]: "900ms" }) : { strokeDashoffset: 100, strokeDasharray: 100 }}
      />
      {positions.map((x, i) => (
        <circle
          key={x}
          cx={x}
          cy="3"
          r="1.4"
          fill={i === active ? "var(--trace-active)" : "var(--surface-primary)"}
          stroke={i === active ? "var(--trace-active)" : "var(--trace)"}
          strokeWidth="0.4"
          vectorEffect="non-scaling-stroke"
          className={drawn ? "node-settle" : ""}
          style={{ ["--node-delay" as string]: `${300 + i * 120}ms`, opacity: drawn ? undefined : 0 }}
        />
      ))}
    </svg>
  );
}

/** A vertical spine for the timeline. The segment above `progress` is drawn active. */
export function TraceSpine({ className = "" }: { className?: string }) {
  return (
    <div
      className={`w-px shrink-0 ${className}`}
      style={{ backgroundColor: "var(--trace)" }}
      aria-hidden="true"
    />
  );
}

/**
 * A curved thread from a claim to the artifact region that supports it. Rendered as
 * an overlay when the source panel opens.
 */
export function TraceThread({
  from,
  to,
  visible,
}: {
  from: { x: number; y: number };
  to: { x: number; y: number };
  visible: boolean;
}) {
  const midX = (from.x + to.x) / 2;
  const path = `M ${from.x} ${from.y} C ${midX} ${from.y}, ${midX} ${to.y}, ${to.x} ${to.y}`;
  const length = Math.hypot(to.x - from.x, to.y - from.y) * 1.6;

  return (
    <svg className="pointer-events-none fixed inset-0 z-40 h-full w-full" aria-hidden="true">
      <path
        d={path}
        fill="none"
        stroke="var(--trace-active)"
        strokeWidth="1.25"
        strokeDasharray={length}
        style={{
          strokeDashoffset: visible ? 0 : length,
          transition: "stroke-dashoffset 420ms cubic-bezier(0.65,0,0.35,1)",
        }}
      />
      <circle cx={to.x} cy={to.y} r="3" fill="var(--trace-active)" opacity={visible ? 1 : 0} style={{ transition: "opacity 200ms 320ms" }} />
    </svg>
  );
}
