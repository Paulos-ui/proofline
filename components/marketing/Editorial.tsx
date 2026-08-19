import { RailLabel } from "@/components/ui/atoms";

export function PageHeader({ eyebrow, title, lede }: { eyebrow: string; title: string; lede: string }) {
  return (
    <header className="mx-auto w-full max-w-[76rem] px-4 pb-2 pt-14 md:px-6">
      <RailLabel>{eyebrow}</RailLabel>
      <h1 className="mt-3 max-w-[22ch] text-[clamp(2rem,4.4vw,3.25rem)] leading-[1.06]" style={{ fontFamily: "var(--font-display)" }}>
        {title}
      </h1>
      <p className="prose-editorial mt-4">
        <span>{lede}</span>
      </p>
    </header>
  );
}

export function Article({ children }: { children: React.ReactNode }) {
  return <article className="mx-auto w-full max-w-[76rem] px-4 pb-10 md:px-6">{children}</article>;
}

/** Numbered because these pages really are sequences; the number carries order. */
export function Chapter({
  id,
  number,
  title,
  children,
}: {
  id?: string;
  number: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="grid gap-x-10 gap-y-4 border-t py-10 md:grid-cols-[13rem_1fr]" style={{ borderColor: "var(--border-subtle)" }}>
      <div>
        <p className="rail-label">{number}</p>
        <h2 className="mt-1.5 text-xl leading-tight" style={{ fontFamily: "var(--font-display)" }}>
          {title}
        </h2>
      </div>
      <div className="prose-editorial flex flex-col gap-4">{children}</div>
    </section>
  );
}

export function Definition({ term, children }: { term: string; children: React.ReactNode }) {
  return (
    <div className="border-l-2 pl-4" style={{ borderColor: "var(--trace)" }}>
      <p className="rail-label">{term}</p>
      <p className="mt-1 text-sm" style={{ color: "var(--ink-secondary)" }}>
        {children}
      </p>
    </div>
  );
}

export function Steps({ steps }: { steps: Array<{ title: string; body: string }> }) {
  return (
    <ol className="m-0 flex list-none flex-col p-0">
      {steps.map((step, index) => (
        <li key={step.title} className="grid grid-cols-[2.5rem_1fr] gap-x-3 pb-5">
          <div className="relative flex justify-center">
            {index < steps.length - 1 ? (
              <span className="absolute inset-y-0 top-4 w-px" style={{ background: "var(--trace)" }} aria-hidden="true" />
            ) : null}
            <span
              className="relative mt-1 block h-2.5 w-2.5 rounded-full"
              style={{ background: "var(--surface-primary)", border: "1.5px solid var(--trace-active)" }}
              aria-hidden="true"
            />
          </div>
          <div>
            <p className="text-sm font-medium">{step.title}</p>
            <p className="mt-1 text-sm" style={{ color: "var(--ink-muted)" }}>
              {step.body}
            </p>
          </div>
        </li>
      ))}
    </ol>
  );
}

export function Code({ children }: { children: string }) {
  return (
    <pre
      className="m-0 overflow-x-auto p-4 text-[0.75rem] leading-relaxed"
      style={{ background: "var(--surface-elevated)", border: "1px solid var(--border-subtle)", borderRadius: 3, fontFamily: "var(--font-mono)", color: "var(--ink-secondary)" }}
    >
      {children}
    </pre>
  );
}
