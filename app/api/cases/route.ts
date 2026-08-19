import { NextResponse } from "next/server";
import { z } from "zod";
import { createServerSupabase } from "@/lib/supabase/server";
import { generateCaseRef } from "@/lib/evidence/case-ref";

const CreateCaseSchema = z.object({
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().max(2000).optional(),
  incidentTimezone: z.string().trim().max(64).default("UTC"),
});

export async function POST(request: Request) {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in to create a case." }, { status: 401 });

  const parsed = CreateCaseSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "A case needs a title of up to 200 characters." }, { status: 400 });
  }

  // Retry on the (rare) ref collision rather than failing the user's action.
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const { data, error } = await supabase
      .from("cases")
      .insert({
        owner_id: user.id,
        ref: generateCaseRef(),
        title: parsed.data.title,
        description: parsed.data.description ?? null,
        incident_timezone: parsed.data.incidentTimezone,
        status: "draft",
      })
      .select("id, ref")
      .single();

    if (!error) return NextResponse.json({ id: data.id, ref: data.ref }, { status: 201 });
    if (!error.message.includes("cases_ref_idx")) {
      return NextResponse.json({ error: "The case could not be created." }, { status: 500 });
    }
  }

  return NextResponse.json({ error: "The case could not be created. Try again." }, { status: 500 });
}

export async function GET() {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in to list your cases." }, { status: 401 });

  const { data, error } = await supabase
    .from("cases")
    .select("id, ref, title, status, updated_at, last_processed_at, merkle_root")
    .order("updated_at", { ascending: false });

  if (error) return NextResponse.json({ error: "Your cases could not be loaded." }, { status: 500 });
  return NextResponse.json({ cases: data });
}
