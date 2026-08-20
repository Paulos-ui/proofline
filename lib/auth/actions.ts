"use server";

import { redirect } from "next/navigation";
import { createServerSupabase } from "@/lib/supabase/server";

/**
 * Signs the current user out using the same request-scoped Supabase client that
 * reads the session everywhere else, so the cookie is cleared through the one
 * auth path the app has. Always redirects home; the header re-renders in its
 * signed-out state on the next request because it reads the session fresh.
 */
export async function signOutAction(): Promise<void> {
  const supabase = await createServerSupabase();
  await supabase.auth.signOut();
  redirect("/");
}
