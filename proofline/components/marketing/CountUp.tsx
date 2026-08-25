"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Counts up to a number when it first scrolls into view. With reduced-motion on, it
 * shows the final value immediately. The final value is always correct — the count is
 * decoration on top of a real number, never a substitute for one.
 */
export function CountUp({
  to,
  suffix = "",
  durationMs = 900,
}: {
  to: number;
  suffix?: string;
  durationMs?: number;
}) {
  const ref = useRef<HTMLSpanElement | null>(null);
  const reduced = typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const [value, setValue] = useState(() => (reduced ? to : 0));
  const done = useRef(false);

  useEffect(() => {
    const node = ref.current;
    if (!node || reduced) return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting || done.current) continue;
          done.current = true;
          const start = performance.now();
          const tick = (now: number) => {
            const t = Math.min((now - start) / durationMs, 1);
            const eased = 1 - Math.pow(1 - t, 3);
            setValue(Math.round(eased * to));
            if (t < 1) requestAnimationFrame(tick);
          };
          requestAnimationFrame(tick);
          observer.disconnect();
        }
      },
      { threshold: 0.5 },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [to, durationMs, reduced]);

  return (
    <span ref={ref}>
      {value}
      {suffix}
    </span>
  );
}
