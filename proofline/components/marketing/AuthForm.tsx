"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { RailLabel } from "@/components/ui/atoms";

/** Sign-in and sign-up share one form; only the call and the copy differ. */
export function AuthForm({ mode }: { mode: "sign-in" | "sign-up" }) {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") ?? "/dashboard";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const configured = isSupabaseConfigured();

  const submit = async () => {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const supabase = createClient();
      if (mode === "sign-up") {
        const { data, error: signUpError } = await supabase.auth.signUp({ email, password });
        if (signUpError) {
          setError(signUpError.message);
          return;
        }
        if (!data.session) {
          setNotice("Check your email to confirm the address, then sign in.");
          return;
        }
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
        if (signInError) {
          setError(signInError.message);
          return;
        }
      }
      router.push(next);
      router.refresh();
    } catch {
      setError("Authentication is unavailable right now.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <RailLabel>{mode === "sign-up" ? "Create an account" : "Sign in"}</RailLabel>
      <h1 className="mt-2 text-2xl" style={{ fontFamily: "var(--font-display)" }}>
        {mode === "sign-up" ? "Start a case of your own" : "Back to your cases"}
      </h1>
      <p className="mt-2 text-sm" style={{ color: "var(--ink-muted)" }}>
        An account is only needed to store your own evidence. The demonstration case and file verification are open to
        everyone.
      </p>

      {!configured ? (
        <div className="panel mt-6 p-4">
          <p className="text-sm" style={{ color: "var(--warning)" }}>
            This deployment has no Supabase project configured, so accounts are unavailable.
          </p>
          <Link href="/demo" className="btn btn-secondary mt-3 cursor-pointer text-sm">
            Open the demonstration case
          </Link>
        </div>
      ) : (
        <div className="mt-6 flex flex-col gap-4">
          <label className="flex flex-col gap-1.5">
            <span className="text-sm">Email</span>
            <input
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="border px-3 py-2 text-sm"
              style={{ background: "var(--surface-elevated)", borderColor: "var(--border-strong)", borderRadius: 3 }}
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-sm">Password</span>
            <input
              type="password"
              autoComplete={mode === "sign-up" ? "new-password" : "current-password"}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              minLength={8}
              className="border px-3 py-2 text-sm"
              style={{ background: "var(--surface-elevated)", borderColor: "var(--border-strong)", borderRadius: 3 }}
            />
            {mode === "sign-up" ? <span className="meta">At least 8 characters.</span> : null}
          </label>

          {error ? (
            <p className="text-sm" style={{ color: "var(--conflict)" }} role="alert">
              {error}
            </p>
          ) : null}
          {notice ? (
            <p className="text-sm" style={{ color: "var(--verified)" }} role="status">
              {notice}
            </p>
          ) : null}

          <button type="button" onClick={() => void submit()} disabled={busy} className="btn btn-primary cursor-pointer">
            {busy ? "Working…" : mode === "sign-up" ? "Create account" : "Sign in"}
          </button>
        </div>
      )}

      <p className="mt-6 text-sm" style={{ color: "var(--ink-muted)" }}>
        {mode === "sign-up" ? "Already have an account? " : "No account yet? "}
        <Link href={mode === "sign-up" ? "/sign-in" : "/sign-up"} className="underline underline-offset-4" style={{ color: "var(--evidence)" }}>
          {mode === "sign-up" ? "Sign in" : "Create one"}
        </Link>
      </p>
    </div>
  );
}
