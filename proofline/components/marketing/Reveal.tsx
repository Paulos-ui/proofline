"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Reveals its children as they scroll into view. Purely additive: with JavaScript
 * off or reduced-motion on, the content is simply visible. The CSS class does the
 * animation; this component only decides when to add it.
 */
export function Reveal({
  children,
  delay = 0,
  className = "",
  as: Tag = "div",
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
  as?: "div" | "section" | "li" | "article";
}) {
  const ref = useRef<HTMLElement | null>(null);
  // Reduced-motion visitors start visible; there is nothing to animate in.
  const [visible, setVisible] = useState(() =>
    typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );

  useEffect(() => {
    const node = ref.current;
    if (!node || visible) return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setVisible(true);
            observer.disconnect();
          }
        }
      },
      { threshold: 0.15, rootMargin: "0px 0px -40px 0px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [visible]);

  const Component = Tag as React.ElementType;
  return (
    <Component
      ref={ref as React.Ref<HTMLElement>}
      className={`reveal ${visible ? "is-visible" : ""} ${className}`}
      style={{ ["--reveal-delay" as string]: `${delay}ms` }}
    >
      {children}
    </Component>
  );
}
