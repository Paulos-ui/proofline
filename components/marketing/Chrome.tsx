import Link from "next/link";
import { Wordmark } from "@/components/brand/Mark";

const NAV = [
  { href: "/demo", label: "Demo case" },
  { href: "/verify", label: "Verify" },
  { href: "/docs", label: "Docs" },
  { href: "/about", label: "About" },
];

export function MarketingHeader() {
  return (
    <header className="sticky top-0 z-30 border-b backdrop-blur" style={{ borderColor: "var(--border-subtle)", background: "color-mix(in srgb, var(--surface-primary) 88%, transparent)" }}>
      <div className="mx-auto flex w-full max-w-[76rem] items-center justify-between gap-6 px-4 py-3 md:px-6">
        <Link href="/" className="cursor-pointer" aria-label="Proofline home">
          <Wordmark />
        </Link>
        <nav aria-label="Main" className="flex items-center gap-1">
          {NAV.map((item) => (
            <Link key={item.href} href={item.href} className="btn btn-quiet cursor-pointer text-sm">
              {item.label}
            </Link>
          ))}
          <Link href="/sign-in" className="btn btn-secondary ml-2 cursor-pointer text-sm">
            Sign in
          </Link>
        </nav>
      </div>
    </header>
  );
}

export function MarketingFooter() {
  return (
    <footer className="mt-24 border-t" style={{ borderColor: "var(--border-subtle)" }}>
      <div className="mx-auto grid w-full max-w-[76rem] gap-8 px-4 py-12 md:grid-cols-4 md:px-6">
        <div>
          <Wordmark />
          <p className="mt-3 max-w-[26ch] text-sm" style={{ color: "var(--ink-muted)" }}>
            Scattered evidence. One traceable story.
          </p>
        </div>
        <FooterColumn
          title="Product"
          links={[
            { href: "/demo", label: "Demonstration case" },
            { href: "/verify", label: "Verify a file" },
            { href: "/dashboard", label: "Your cases" },
          ]}
        />
        <FooterColumn
          title="Understand it"
          links={[
            { href: "/docs", label: "Documentation" },
            { href: "/about", label: "Why it exists" },
            { href: "/limitations", label: "Limitations" },
          ]}
        />
        <FooterColumn
          title="Handling"
          links={[
            { href: "/privacy", label: "Privacy model" },
            { href: "/limitations#responsible-ai", label: "Responsible use" },
          ]}
        />
      </div>
      <div className="mx-auto w-full max-w-[76rem] px-4 pb-10 md:px-6">
        <p className="meta">
          Proofline organises evidence and detects file changes. It does not determine truth, and it is not legal
          advice.
        </p>
      </div>
    </footer>
  );
}

function FooterColumn({ title, links }: { title: string; links: Array<{ href: string; label: string }> }) {
  return (
    <div>
      <p className="rail-label">{title}</p>
      <ul className="m-0 mt-3 flex list-none flex-col gap-2 p-0">
        {links.map((link) => (
          <li key={link.href + link.label}>
            <Link href={link.href} className="cursor-pointer text-sm hover:underline" style={{ color: "var(--ink-secondary)" }}>
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
