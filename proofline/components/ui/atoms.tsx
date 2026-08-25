"use client";

import { cn } from "@/lib/utils/cn";
import { confidenceBand, confidenceLabel } from "@/lib/schemas/extraction";

type Tone = "neutral" | "evidence" | "verified" | "warning" | "conflict" | "analysis";

const TONE_VARS: Record<Tone, { fg: string; bg: string }> = {
  neutral: { fg: "var(--ink-secondary)", bg: "var(--surface-sunken)" },
  evidence: { fg: "var(--evidence)", bg: "var(--evidence-soft)" },
  verified: { fg: "var(--verified)", bg: "var(--verified-soft)" },
  warning: { fg: "var(--warning)", bg: "var(--warning-soft)" },
  conflict: { fg: "var(--conflict)", bg: "var(--conflict-soft)" },
  analysis: { fg: "var(--analysis)", bg: "var(--analysis-soft)" },
};

/**
 * Status is never carried by colour alone — every pill has a text label, and the
 * marker shape differs by tone for anyone who cannot distinguish them.
 */
export function StatusPill({
  tone = "neutral",
  children,
  marker = true,
  className,
}: {
  tone?: Tone;
  children: React.ReactNode;
  marker?: boolean;
  className?: string;
}) {
  const { fg, bg } = TONE_VARS[tone];
  return (
    <span
      className={cn("inline-flex items-center gap-1.5 px-2 py-[3px] text-[0.6875rem] font-medium", className)}
      style={{ color: fg, background: bg, borderRadius: 2, fontFamily: "var(--font-mono)", letterSpacing: "0.02em" }}
    >
      {marker ? <Marker tone={tone} /> : null}
      {children}
    </span>
  );
}

function Marker({ tone }: { tone: Tone }) {
  const color = TONE_VARS[tone].fg;
  if (tone === "conflict") {
    return (
      <svg width="8" height="8" viewBox="0 0 8 8" aria-hidden="true">
        <path d="M4 0 L8 8 L0 8 Z" fill={color} />
      </svg>
    );
  }
  if (tone === "verified") {
    return (
      <svg width="8" height="8" viewBox="0 0 8 8" aria-hidden="true">
        <path d="M1 4 L3 6.5 L7 1.5" stroke={color} strokeWidth="1.6" fill="none" />
      </svg>
    );
  }
  if (tone === "warning") {
    return (
      <svg width="8" height="8" viewBox="0 0 8 8" aria-hidden="true">
        <rect x="0.5" y="0.5" width="7" height="7" stroke={color} strokeWidth="1.2" fill="none" />
      </svg>
    );
  }
  return <span style={{ width: 6, height: 6, background: color, borderRadius: 1 }} aria-hidden="true" />;
}

/** Bands, not percentages. The exact value stays available in detail views. */
export function ConfidenceTag({ value, showValue = false }: { value: number; showValue?: boolean }) {
  const band = confidenceBand(value);
  const tone: Tone = band === "high" ? "neutral" : band === "medium" ? "warning" : "conflict";
  return (
    <StatusPill tone={tone} marker={band !== "high"}>
      {confidenceLabel(value)}
      {showValue ? ` · ${value.toFixed(2)}` : ""}
    </StatusPill>
  );
}

export function RailLabel({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("rail-label", className)}>{children}</div>;
}

export function Hash({ value, className }: { value: string; className?: string }) {
  return (
    <code
      className={cn("meta break-all", className)}
      style={{ color: "var(--ink-secondary)" }}
      title={value}
    >
      {value}
    </code>
  );
}

export function EmptyState({
  title,
  body,
  action,
}: {
  title: string;
  body: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-start gap-3 border border-dashed p-8" style={{ borderColor: "var(--border-subtle)", borderRadius: 3 }}>
      <h3 className="text-lg" style={{ fontFamily: "var(--font-display)" }}>
        {title}
      </h3>
      <p className="max-w-[52ch] text-sm" style={{ color: "var(--ink-muted)" }}>
        {body}
      </p>
      {action}
    </div>
  );
}

export function SyntheticBadge() {
  return (
    <StatusPill tone="analysis" marker={false}>
      Synthetic demonstration data
    </StatusPill>
  );
}
