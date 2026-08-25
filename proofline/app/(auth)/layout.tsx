import Link from "next/link";
import { Wordmark } from "@/components/brand/Mark";
import { TraceRule } from "@/components/brand/Trace";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="border-b" style={{ borderColor: "var(--border-subtle)" }}>
        <div className="mx-auto flex w-full max-w-[76rem] items-center justify-between px-4 py-3 md:px-6">
          <Link href="/" className="cursor-pointer" aria-label="Proofline home">
            <Wordmark />
          </Link>
          <Link href="/demo" className="btn btn-quiet cursor-pointer text-sm">
            Explore the demo instead
          </Link>
        </div>
      </header>
      <main id="main" className="mx-auto flex w-full max-w-[26rem] grow flex-col justify-center px-4 py-16">
        {children}
        <div className="mt-10">
          <TraceRule nodes={3} active={1} />
        </div>
      </main>
    </div>
  );
}
