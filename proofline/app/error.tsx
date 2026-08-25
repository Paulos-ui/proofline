"use client";

import Link from "next/link";
import { RailLabel } from "@/components/ui/atoms";

export default function ErrorBoundary({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-[44rem] flex-col justify-center px-4 py-16 md:px-6">
      <RailLabel>Something failed</RailLabel>
      <h1 className="mt-2 text-3xl" style={{ fontFamily: "var(--font-display)" }}>
        This page could not be shown
      </h1>
      <p className="mt-3 text-sm" style={{ color: "var(--ink-secondary)" }}>
        {error.message || "An unexpected error occurred."}
      </p>
      {error.digest ? <p className="meta mt-2">reference {error.digest}</p> : null}
      <div className="mt-6 flex flex-wrap gap-3">
        <button type="button" onClick={reset} className="btn btn-primary cursor-pointer">
          Try again
        </button>
        <Link href="/" className="btn btn-secondary cursor-pointer">
          Go to the start
        </Link>
      </div>
    </div>
  );
}
