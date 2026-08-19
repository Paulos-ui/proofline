"use client";

import { cn } from "@/lib/utils/cn";

export const WORKSPACE_MODES = [
  { id: "overview", label: "Overview" },
  { id: "evidence", label: "Evidence" },
  { id: "timeline", label: "Timeline" },
  { id: "connections", label: "Connections" },
  { id: "conflicts", label: "Conflicts" },
  { id: "privacy", label: "Privacy" },
  { id: "verify", label: "Verify" },
  { id: "export", label: "Export" },
] as const;

export type WorkspaceMode = (typeof WORKSPACE_MODES)[number]["id"];

/**
 * Navigation is the trace itself: one line through the case, with a node per mode.
 * Counts sit on the nodes so the workspace states what needs attention without a
 * separate summary strip.
 */
export function TraceNav({
  mode,
  onChange,
  counts,
}: {
  mode: WorkspaceMode;
  onChange: (mode: WorkspaceMode) => void;
  counts: Partial<Record<WorkspaceMode, { value: number; tone?: "conflict" | "warning" | "neutral" }>>;
}) {
  const activeIndex = WORKSPACE_MODES.findIndex((item) => item.id === mode);

  return (
    <nav aria-label="Case sections" className="relative">
      <ul className="scrollbar-none relative flex list-none items-stretch gap-0 overflow-x-auto p-0">
        {WORKSPACE_MODES.map((item, index) => {
          const isActive = item.id === mode;
          const isPast = index < activeIndex;
          const count = counts[item.id];
          return (
            <li key={item.id} className="relative shrink-0">
              <button
                type="button"
                onClick={() => onChange(item.id)}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "group relative flex cursor-pointer flex-col items-start gap-2 px-4 pb-3 pt-4 text-sm transition-colors",
                  isActive ? "" : "hover:text-[var(--ink-primary)]",
                )}
                style={{ color: isActive ? "var(--ink-primary)" : "var(--ink-muted)" }}
              >
                <span className="flex items-center gap-2 whitespace-nowrap">
                  {item.label}
                  {count && count.value > 0 ? (
                    <span
                      className="meta"
                      style={{
                        color:
                          count.tone === "conflict"
                            ? "var(--conflict)"
                            : count.tone === "warning"
                              ? "var(--warning)"
                              : "var(--ink-muted)",
                      }}
                    >
                      {count.value}
                    </span>
                  ) : null}
                </span>
                <TraceNode active={isActive} past={isPast} />
              </button>
            </li>
          );
        })}
      </ul>
      <div className="absolute bottom-[6px] left-0 right-0 -z-10 h-px" style={{ background: "var(--trace)" }} aria-hidden="true" />
    </nav>
  );
}

function TraceNode({ active, past }: { active: boolean; past: boolean }) {
  return (
    <svg width="100%" height="13" viewBox="0 0 100 13" preserveAspectRatio="none" aria-hidden="true" className="block">
      <line
        x1="0"
        y1="6.5"
        x2="100"
        y2="6.5"
        stroke={active || past ? "var(--trace-active)" : "var(--trace)"}
        strokeWidth="1"
        vectorEffect="non-scaling-stroke"
        style={{ transition: "stroke 200ms" }}
      />
      <circle
        cx="50"
        cy="6.5"
        r="3"
        fill={active ? "var(--trace-active)" : "var(--surface-primary)"}
        stroke={active || past ? "var(--trace-active)" : "var(--trace)"}
        strokeWidth="1"
        vectorEffect="non-scaling-stroke"
        style={{ transition: "fill 200ms, stroke 200ms" }}
      />
    </svg>
  );
}
