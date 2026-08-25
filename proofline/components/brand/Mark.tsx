/**
 * The Proofline mark: one continuous line crossing three offset evidence points,
 * broken once by the verification notch. The break is the point of the product —
 * the line is only continuous where the evidence supports it.
 */
export function Mark({ size = 24, className = "" }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      <path d="M2 22 L9 22" stroke="currentColor" strokeWidth="1.5" strokeLinecap="square" />
      <path d="M13 22 L17 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="square" />
      <path d="M17 12 L23 17" stroke="currentColor" strokeWidth="1.5" strokeLinecap="square" />
      <path d="M23 17 L30 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="square" />
      {/* verification notch — the deliberate discontinuity */}
      <path d="M9 25 L11 19" stroke="var(--evidence)" strokeWidth="1.5" strokeLinecap="square" />
      <circle cx="17" cy="12" r="2.5" fill="var(--surface-primary)" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="23" cy="17" r="2.5" fill="var(--surface-primary)" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="30" cy="7" r="2" fill="var(--evidence)" />
    </svg>
  );
}

export function Wordmark({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-baseline gap-2 ${className}`}>
      <Mark size={22} className="translate-y-[3px]" />
      <span className="font-display text-[1.0625rem] tracking-[-0.01em]" style={{ fontFamily: "var(--font-display)" }}>
        Proofline
      </span>
    </span>
  );
}
