"use client";

import { createBrowserClient } from "@supabase/ssr";
import { supabaseConfig } from "./config";

/** Browser client. Only ever receives the publishable key. */
export function createClient() {
  const { url, publishableKey } = supabaseConfig();
  return createBrowserClient(url, publishableKey);
}
