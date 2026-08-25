export function supabaseConfig() {
  return {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
    publishableKey: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "",
    // Supabase now issues sb_secret_… keys; projects created before the change may
    // still use a service_role JWT. Either is accepted, new name first.
    secretKey: process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || "",
    bucket: "evidence",
    /** Signed URLs are short-lived: long enough to render, short enough to leak badly. */
    signedUrlSeconds: 300,
  };
}

export function isSupabaseConfigured(): boolean {
  const config = supabaseConfig();
  return config.url.length > 0 && config.publishableKey.length > 0;
}
