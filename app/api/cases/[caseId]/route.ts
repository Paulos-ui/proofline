import { NextResponse } from "next/server";
import { z } from "zod";
import { createServerSupabase } from "@/lib/supabase/server";
import { supabaseConfig } from "@/lib/supabase/config";

const UpdateCaseSchema = z.object({
  title: z.string().trim().min(1).max(200).optional(),
  description: z.string().trim().max(2000).nullable().optional(),
});

/**
 * Updates a case's editable fields. Used by the guided flow to save the context a
 * user adds before analysis. Row level security limits this to the case owner.
 */
export async function PATCH(request: Request, context: { params: Promise<{ caseId: string }> }) {
  const { caseId } = await context.params;
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in to edit this case." }, { status: 401 });

  const parsed = UpdateCaseSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Nothing valid to update." }, { status: 400 });
  }

  const patch: Record<string, unknown> = {};
  if (parsed.data.title !== undefined) patch.title = parsed.data.title;
  if (parsed.data.description !== undefined) patch.description = parsed.data.description;
  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "Nothing to update." }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("cases")
    .update(patch)
    .eq("id", caseId)
    .select("id, title, description")
    .maybeSingle();

  if (error || !data) {
    return NextResponse.json({ error: "The case could not be updated." }, { status: 500 });
  }
  return NextResponse.json({ case: data });
}

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
