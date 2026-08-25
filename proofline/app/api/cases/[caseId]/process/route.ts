import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";
import { getAnalyzer, getTranscriber, isAnalysisConfigured, isTranscriptionConfigured, AnalysisRejectedError } from "@/lib/ai";
import { computeCase, persistComputation, type AnalyzedArtifact } from "@/lib/evidence/pipeline";
import { buildManifest } from "@/lib/integrity/manifest";
import { segmentsToLocatableText } from "@/lib/ai/transcription";
import { supabaseConfig } from "@/lib/supabase/config";

export const maxDuration = 300;

/**
 * Analyses every artifact that has not been extracted yet, then recomputes the
 * case-level model and the manifest.
 *
 * One artifact failing does not fail the batch: it is marked failed with a reason and
 * the rest of the case is still processed.
 */
export async function POST(_request: Request, context: { params: Promise<{ caseId: string }> }) {
  const { caseId } = await context.params;
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in to process a case." }, { status: 401 });

  if (!isAnalysisConfigured()) {
    return NextResponse.json(
      { error: "No analysis provider is configured. Add ANTHROPIC_API_KEY to run extraction." },
      { status: 503 },
    );
  }

  const { data: caseRow } = await supabase.from("cases").select("id, ref").eq("id", caseId).maybeSingle();
  if (!caseRow) return NextResponse.json({ error: "That case does not exist, or is not yours." }, { status: 404 });

  const { data: artifacts } = await supabase.from("artifacts").select("*").eq("case_id", caseId);
  if (!artifacts || artifacts.length === 0) {
    return NextResponse.json({ error: "There is nothing to process yet." }, { status: 400 });
  }

  await supabase.from("cases").update({ status: "processing" }).eq("id", caseId);

  const { bucket } = supabaseConfig();
  const analyzer = getAnalyzer();
  const analyzed: AnalyzedArtifact[] = [];
  const failures: Array<{ filename: string; reason: string }> = [];

  for (const artifact of artifacts) {
    try {
      await supabase.from("artifacts").update({ processing_status: "analyzing" }).eq("id", artifact.id);

      const { data: download, error: downloadError } = await supabase.storage.from(bucket).download(artifact.storage_path);
      if (downloadError || !download) throw new Error("The stored file could not be read.");
      const bytes = new Uint8Array(await download.arrayBuffer());

      let text: string | undefined;
      let transcript: string | null = null;

      if (artifact.mime_type.startsWith("audio/")) {
        if (!isTranscriptionConfigured()) {
          // Audio is not silently treated as analysed when nothing can transcribe it.
          throw new Error(
            "No transcription service is configured, so this audio was not analysed. Set TRANSCRIPTION_PROVIDER and TRANSCRIPTION_API_KEY.",
          );
        }
        const result = await getTranscriber().transcribe({
          data: Buffer.from(bytes).toString("base64"),
          mimeType: artifact.mime_type,
          filename: artifact.filename,
        });
        transcript = result.text;
        text = segmentsToLocatableText(result.segments);
      } else if (artifact.mime_type === "text/plain" || artifact.mime_type === "message/rfc822") {
        text = new TextDecoder().decode(bytes);
      }

      const result = await analyzer.analyze({
        artifactId: artifact.id,
        filename: artifact.filename,
        mimeType: artifact.mime_type,
        ...(text ? { text } : { data: Buffer.from(bytes).toString("base64") }),
        dimensions: artifact.metadata?.dimensions ?? null,
      });

      analyzed.push({
        artifactId: artifact.id,
        filename: artifact.filename,
        mimeType: artifact.mime_type,
        analysis: result.analysis,
        textContent: text ?? artifact.metadata?.textContent ?? null,
      });

      await supabase
        .from("artifacts")
        .update({
          processing_status: "extracted",
          kind: result.analysis.artifactType,
          summary: result.analysis.artifactSummary,
          failure_reason: null,
          metadata: {
            ...(artifact.metadata ?? {}),
            ...(transcript ? { transcript } : {}),
            ...(text ? { textContent: text.slice(0, 200_000) } : {}),
            provider: result.provider,
            model: result.model,
            detectedLanguage: result.analysis.detectedLanguage,
            uncertainties: result.analysis.uncertainties,
          },
        })
        .eq("id", artifact.id);
    } catch (error) {
      const reason =
        error instanceof AnalysisRejectedError || error instanceof Error
          ? error.message
          : "This artifact could not be analysed.";
      failures.push({ filename: artifact.filename, reason });
      await supabase
        .from("artifacts")
        .update({ processing_status: "failed", failure_reason: reason })
        .eq("id", artifact.id);
    }
  }

  const computation = computeCase(caseId, analyzed);
  await persistComputation(supabase, caseId, computation);

  const manifest = await buildManifest({
    caseId,
    caseRef: caseRow.ref,
    artifacts: artifacts.map((artifact) => ({
      id: artifact.id,
      filename: artifact.filename,
      sha256: artifact.sha256,
      byteSize: Number(artifact.byte_size),
      mimeType: artifact.mime_type,
    })),
    createdAt: new Date().toISOString(),
  });

  await supabase.from("manifests").insert({ case_id: caseId, manifest, merkle_root: manifest.merkleRoot });
  await supabase
    .from("cases")
    .update({
      status: "ready",
      merkle_root: manifest.merkleRoot,
      last_processed_at: new Date().toISOString(),
    })
    .eq("id", caseId);

  await supabase.from("audit_events").insert({
    case_id: caseId,
    actor_id: user.id,
    action: "case.processed",
    detail: { analysed: analyzed.length, failed: failures.length, merkleRoot: manifest.merkleRoot },
  });

  return NextResponse.json({
    analysed: analyzed.length,
    failed: failures,
    events: computation.events.length,
    claims: computation.claims.length,
    conflicts: computation.conflicts.filter((c) => c.classification !== "compatible").length,
    merkleRoot: manifest.merkleRoot,
  });
}
