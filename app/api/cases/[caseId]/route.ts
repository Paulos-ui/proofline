import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";
import { supabaseConfig } from "@/lib/supabase/config";

/**
 * Deleting a case removes the stored evidence as well as the rows. Child tables cascade;
 * storage objects have to be removed explicitly.
 */
export async function DELETE(_request: Request, context: { params: Promise<{ caseId: string }> }) {
  const { caseId } = await context.params;
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in to delete a case." }, { status: 401 });

  const { data: artifacts } = await supabase.from("artifacts").select("storage_path").eq("case_id", caseId);
  const paths = (artifacts ?? []).map((artifact) => artifact.storage_path);
  const { bucket } = supabaseConfig();

  if (paths.length > 0) {
    const { error } = await supabase.storage.from(bucket).remove(paths);
    if (error) {
      return NextResponse.json(
        { error: "The stored files could not be removed, so nothing was deleted. Try again." },
        { status: 500 },
      );
    }
  }

  const { error } = await supabase.from("cases").delete().eq("id", caseId);
  if (error) return NextResponse.json({ error: "The case could not be deleted." }, { status: 500 });

  return NextResponse.json({ deleted: true, filesRemoved: paths.length });
}
