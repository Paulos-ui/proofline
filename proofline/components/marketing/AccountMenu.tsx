"use client";

import { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { signOutAction } from "@/lib/auth/actions";

/** Two letters, drawn from the mailbox name — never the domain. */
function initialsFor(email: string): string {
  const local = email.split("@")[0] ?? email;
  const parts = local.split(/[._+-]+/).filter(Boolean);
  const letters =
    parts.length > 1 ? [parts[0]?.[0], parts[1]?.[0]] : [local[0], local[1]];
  return letters.filter(Boolean).join("").toUpperCase() || "•";
}

export function AccountMenu({ email }: { email: string }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuId = useId();

  useEffect(() => {
    if (!open) return;

    function onPointerDown(event: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
    }

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const mark = initialsFor(email);

  return (
    <div ref={rootRef} className="relative ml-2">
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        className="btn btn-secondary cursor-pointer gap-2 text-sm"
      >
        <span
          aria-hidden="true"
          className="flex h-5 w-5 shrink-0 items-center justify-center text-[0.625rem] leading-none"
          style={{
            fontFamily: "var(--font-mono)",
            letterSpacing: "0.02em",
            border: "1px solid currentColor",
            borderRadius: 2,
          }}
        >
          {mark}
        </span>
        <span className="hidden max-w-[16ch] truncate md:inline" style={{ color: "var(--ink-secondary)" }}>
          {email}
        </span>
      </button>

      {open ? (
        <div
          id={menuId}
          role="menu"
          aria-label="Account"
          className="panel absolute right-0 top-[calc(100%+6px)] z-40 w-64 max-w-[calc(100vw-2rem)] p-1"
        >
          <div className="px-3 py-2.5">
            <p className="rail-label">Signed in as</p>
            <p className="mt-1 truncate text-sm" title={email}>
              {email}
            </p>
          </div>
          <div className="my-1 h-px" style={{ background: "var(--border-subtle)" }} />
          <div className="flex flex-col">
            <Link
              href="/dashboard"
              role="menuitem"
              onClick={() => setOpen(false)}
              className="btn btn-quiet w-full cursor-pointer justify-start text-left text-sm"
            >
              Your cases
            </Link>
            <form action={signOutAction}>
              <button
                type="submit"
                role="menuitem"
                className="btn btn-quiet w-full cursor-pointer justify-start text-left text-sm"
                style={{ color: "var(--conflict)" }}
              >
                Sign out
              </button>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
