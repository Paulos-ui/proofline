import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";

/** Serves the manifest as a download. It contains fingerprints only, never content. */
export async function GET(_request: Request, context: { params: Promise<{ caseId: string }> }) {
  const { caseId } = await context.params;
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in to download this manifest." }, { status: 401 });

  const { data } = await supabase
    .from("manifests")
    .select("manifest")
    .eq("case_id", caseId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!data) return NextResponse.json({ error: "This case has no manifest yet." }, { status: 404 });

  return new NextResponse(JSON.stringify(data.manifest, null, 2), {
    headers: {
      "content-type": "application/json",
      "content-disposition": `attachment; filename="proofline-manifest-${caseId}.json"`,
    },
  });
}
