import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { supabaseConfig } from "./config";

/** Request-scoped client that respects the signed-in user and row level security. */
export async function createServerSupabase() {
  const { url, publishableKey } = supabaseConfig();
  const cookieStore = await cookies();

  return createServerClient(url, publishableKey, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (items) => {
        try {
          items.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Called from a Server Component; the middleware refreshes the session instead.
        }
      },
    },
  });
}

/**
 * Elevated client using the project's secret key. Bypasses row level security, so every caller must have
 * already established that the signed-in user owns the case being touched. It is
 * never imported from a "use client" module — the key would end up in the bundle.
 */
export function createServiceSupabase() {
  const { url, secretKey } = supabaseConfig();
  if (!secretKey) throw new Error("SUPABASE_SECRET_KEY is not set on the server.");
  return createSupabaseClient(url, secretKey, { auth: { persistSession: false } });
}

export async function requireUser() {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user };
}
