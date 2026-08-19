import type { SupabaseClient } from "@supabase/supabase-js";
import { CaseBundleSchema, type CaseBundle } from "@/lib/schemas/case";
import { supabaseConfig } from "@/lib/supabase/config";

/**
 * Assembles a case into the same bundle shape the demo uses, so the workspace does
 * not care where its data came from.
 */
export async function loadCaseBundle(supabase: SupabaseClient, caseId: string): Promise<CaseBundle | null> {
  const { data: caseRow } = await supabase.from("cases").select("*").eq("id", caseId).maybeSingle();
  if (!caseRow) return null;

  const [artifacts, entities, mentions, events, eventSources, claims, claimSources, relationships, conflicts, redactions, manifests] =
    await Promise.all([
      supabase.from("artifacts").select("*").eq("case_id", caseId).order("created_at"),
      supabase.from("entities").select("*").eq("case_id", caseId),
      supabase.from("entity_mentions").select("*"),
      supabase.from("events").select("*").eq("case_id", caseId),
      supabase.from("event_sources").select("*"),
      supabase.from("claims").select("*").eq("case_id", caseId),
      supabase.from("claim_sources").select("*"),
      supabase.from("relationships").select("*").eq("case_id", caseId),
      supabase.from("conflicts").select("*").eq("case_id", caseId),
      supabase.from("redaction_suggestions").select("*"),
      supabase.from("manifests").select("*").eq("case_id", caseId).order("created_at", { ascending: false }).limit(1),
    ]);

  const artifactRows = artifacts.data ?? [];
  const artifactIds = new Set(artifactRows.map((a) => a.id));

  // Signed URLs are minted per request and expire quickly.
  const { bucket, signedUrlSeconds } = supabaseConfig();
  const previews = new Map<string, string>();
  await Promise.all(
    artifactRows.map(async (artifact) => {
      const { data } = await supabase.storage.from(bucket).createSignedUrl(artifact.storage_path, signedUrlSeconds);
      if (data?.signedUrl) previews.set(artifact.id, data.signedUrl);
    }),
  );

  const bundle = {
    case: {
      id: caseRow.id,
      ref: caseRow.ref,
      ownerId: caseRow.owner_id,
      title: caseRow.title,
      description: caseRow.description,
      status: caseRow.status,
      incidentTimezone: caseRow.incident_timezone,
      isSynthetic: false,
      createdAt: caseRow.created_at,
      updatedAt: caseRow.updated_at,
      lastProcessedAt: caseRow.last_processed_at,
    },
    artifacts: artifactRows.map((artifact) => ({
      id: artifact.id,
      caseId: artifact.case_id,
      filename: artifact.filename,
      mimeType: artifact.mime_type,
      byteSize: Number(artifact.byte_size),
      storagePath: artifact.storage_path,
      sha256: artifact.sha256,
      processingStatus: artifact.processing_status,
      kind: artifact.kind,
      summary: artifact.summary,
      dimensions: artifact.metadata?.dimensions ?? null,
      transcript: artifact.metadata?.transcript ?? null,
      textContent: artifact.metadata?.textContent ?? null,
      previewPath: previews.get(artifact.id) ?? null,
      failureReason: artifact.failure_reason,
      createdAt: artifact.created_at,
    })),
    entities: (entities.data ?? []).map((entity) => ({
      id: entity.id,
      caseId: entity.case_id,
      type: entity.type,
      canonicalName: entity.canonical_name,
      aliases: entity.aliases ?? [],
      confidence: entity.confidence,
      resolution: entity.resolution,
      mentions: (mentions.data ?? [])
        .filter((m) => m.entity_id === entity.id)
        .map((m) => ({
          id: m.id,
          entityId: m.entity_id,
          artifactId: m.artifact_id,
          locator: m.locator,
          surfaceText: m.surface_text,
          confidence: m.confidence,
        })),
    })),
    events: (events.data ?? []).map((event) => ({
      id: event.id,
      caseId: event.case_id,
      title: event.title,
      description: event.description,
      occurredAt: event.occurred_at,
      occurredAtEnd: event.occurred_at_end,
      timePrecision: event.time_precision,
      confidence: event.confidence,
      entityIds: event.entity_ids ?? [],
      needsReview: event.needs_review,
      sources: (eventSources.data ?? [])
        .filter((s) => s.event_id === event.id)
        .map((s) => ({ artifactId: s.artifact_id, locator: s.locator, excerpt: s.excerpt })),
    })),
    claims: (claims.data ?? []).map((claim) => ({
      id: claim.id,
      caseId: claim.case_id,
      eventId: claim.event_id,
      text: claim.text,
      speakerOrSource: claim.speaker_or_source,
      normalized: {
        subject: claim.normalized_data?.subject ?? null,
        predicate: claim.normalized_data?.predicate ?? null,
        object: claim.normalized_data?.object ?? null,
      },
      confidence: claim.confidence,
      sources: (claimSources.data ?? [])
        .filter((s) => s.claim_id === claim.id)
        .map((s) => ({ artifactId: s.artifact_id, locator: s.locator, excerpt: s.excerpt })),
    })),
    relationships: (relationships.data ?? []).map((relationship) => ({
      id: relationship.id,
      caseId: relationship.case_id,
      sourceEntityId: relationship.source_entity_id,
      targetEntityId: relationship.target_entity_id,
      type: relationship.type,
      label: relationship.label ?? undefined,
      confidence: relationship.confidence,
      supportingSources: relationship.supporting_sources ?? [],
    })),
    conflicts: (conflicts.data ?? []).map((conflict) => ({
      id: conflict.id,
      caseId: conflict.case_id,
      classification: conflict.classification,
      explanation: conflict.explanation,
      confidence: conflict.confidence,
      claimAId: conflict.claim_a_id,
      claimBId: conflict.claim_b_id,
      dimension: conflict.dimension,
      supportingSources: conflict.supporting_sources ?? [],
    })),
    redactions: (redactions.data ?? [])
      .filter((r) => artifactIds.has(r.artifact_id))
      .map((r) => ({
        id: r.id,
        artifactId: r.artifact_id,
        category: r.category,
        locator: r.locator,
        preview: r.preview,
        confidence: r.confidence,
        detector: r.detector,
        decision: r.decision,
      })),
    manifest: manifests.data?.[0]?.manifest ?? null,
    anchor:
      caseRow.anchor_signature && caseRow.merkle_root
        ? {
            network: "solana",
            cluster: caseRow.anchor_network ?? "devnet",
            signature: caseRow.anchor_signature,
            merkleRoot: caseRow.merkle_root,
            anchoredAt: caseRow.anchored_at,
            explorerUrl: `https://explorer.solana.com/tx/${caseRow.anchor_signature}?cluster=${caseRow.anchor_network ?? "devnet"}`,
            memo: `proofline:v1:${caseRow.merkle_root}`,
          }
        : null,
  };

  return CaseBundleSchema.parse(bundle);
}
