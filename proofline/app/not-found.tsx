import Link from "next/link";
import { Wordmark } from "@/components/brand/Mark";
import { RailLabel } from "@/components/ui/atoms";

export default function NotFound() {
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-[44rem] flex-col justify-center px-4 py-16 md:px-6">
      <Link href="/" className="cursor-pointer">
        <Wordmark />
      </Link>
      <RailLabel className="mt-10">Not found</RailLabel>
      <h1 className="mt-2 text-3xl" style={{ fontFamily: "var(--font-display)" }}>
        There is nothing at this address
      </h1>
      <p className="mt-3 text-sm" style={{ color: "var(--ink-secondary)" }}>
        The case may have been deleted, or it belongs to another account.
      </p>
      <div className="mt-6 flex flex-wrap gap-3">
        <Link href="/dashboard" className="btn btn-primary cursor-pointer">
          Your cases
        </Link>
        <Link href="/demo" className="btn btn-secondary cursor-pointer">
          Demonstration case
        </Link>
      </div>
    </div>
  );
}
