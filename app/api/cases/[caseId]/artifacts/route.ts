import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";
import { sha256Bytes, isSha256 } from "@/lib/integrity/hash";
import { safeFilename, serverValidate, storagePathFor, MAX_FILE_BYTES } from "@/lib/evidence/validate";
import { supabaseConfig } from "@/lib/supabase/config";

export const maxDuration = 60;

/**
 * Registers one artifact. The client sends its own SHA-256; the server recomputes it
 * from the received bytes and refuses the upload if they disagree, so the stored
 * fingerprint is always one the server established itself.
 */
export async function POST(request: Request, context: { params: Promise<{ caseId: string }> }) {
  const { caseId } = await context.params;
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in to add evidence." }, { status: 401 });

  // Row level security would block the insert anyway; this returns a clearer error.
  const { data: caseRow } = await supabase.from("cases").select("id").eq("id", caseId).maybeSingle();
  if (!caseRow) return NextResponse.json({ error: "That case does not exist, or is not yours." }, { status: 404 });

  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  const clientHash = String(form?.get("sha256") ?? "");
  if (!(file instanceof File)) return NextResponse.json({ error: "No file was received." }, { status: 400 });
  if (file.size > MAX_FILE_BYTES) return NextResponse.json({ error: "That file is too large." }, { status: 413 });

  const bytes = new Uint8Array(await file.arrayBuffer());
  const declaredMime = String(form?.get("mimeType") ?? file.type);
  const validation = serverValidate(declaredMime, bytes);
  if (!validation.ok) return NextResponse.json({ error: validation.reason }, { status: 415 });

  const sha256 = await sha256Bytes(bytes);
  if (isSha256(clientHash) && clientHash !== sha256) {
    return NextResponse.json(
      { error: "The file changed in transit — its fingerprint does not match the one computed in your browser." },
      { status: 409 },
    );
  }

  const filename = safeFilename(file.name);
  const { data: existing } = await supabase
    .from("artifacts")
    .select("id, filename")
    .eq("case_id", caseId)
    .eq("sha256", sha256)
    .maybeSingle();
  if (existing) {
    return NextResponse.json(
      { error: `This file is already in the case as ${existing.filename}.`, duplicateOf: existing.id },
      { status: 409 },
    );
  }

  const artifactId = crypto.randomUUID();
  const storagePath = storagePathFor(user.id, caseId, artifactId);
  const { bucket } = supabaseConfig();

  const { error: uploadError } = await supabase.storage.from(bucket).upload(storagePath, bytes, {
    contentType: validation.mimeType,
    upsert: false,
  });
  if (uploadError) return NextResponse.json({ error: "The file could not be stored." }, { status: 500 });

  const metadata: Record<string, unknown> = {};
  if (validation.mimeType === "text/plain" || validation.mimeType === "message/rfc822") {
    metadata.textContent = new TextDecoder().decode(bytes).slice(0, 200_000);
  }

  const { data, error } = await supabase
    .from("artifacts")
    .insert({
      id: artifactId,
      case_id: caseId,
      filename,
      mime_type: validation.mimeType,
      byte_size: bytes.byteLength,
      storage_path: storagePath,
      sha256,
      processing_status: "uploaded",
      metadata,
    })
    .select("id, filename, sha256, byte_size, mime_type, processing_status")
    .single();

  if (error) {
    // Do not leave an orphaned object behind if the row could not be written.
    await supabase.storage.from(bucket).remove([storagePath]);
    return NextResponse.json({ error: "The artifact could not be registered." }, { status: 500 });
  }

  await supabase.from("audit_events").insert({
    case_id: caseId,
    actor_id: user.id,
    action: "artifact.uploaded",
    detail: { artifactId: data.id, sha256 },
  });

  return NextResponse.json({ artifact: data }, { status: 201 });
}
