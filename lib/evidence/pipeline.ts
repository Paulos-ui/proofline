import type { SupabaseClient } from "@supabase/supabase-js";
import type { ArtifactAnalysis } from "@/lib/schemas/extraction";
import type { Claim, EventSource } from "@/lib/schemas/case";
import { resolveEntities, type ResolutionCandidate } from "@/lib/entities/resolve";
import { detectConflicts } from "@/lib/conflicts/engine";
import { detectSensitiveText, hitsToSuggestions } from "@/lib/privacy/patterns";

/**
 * Turns per-artifact analyses into the case-level model.
 *
 * The model works one artifact at a time and never sees the whole case, which keeps
 * it from inventing cross-artifact conclusions. Everything that spans artifacts —
 * identity resolution, chronology, disagreement — is computed here, deterministically.
 */

export type AnalyzedArtifact = {
  artifactId: string;
  filename: string;
  mimeType: string;
  analysis: ArtifactAnalysis;
  textContent?: string | null;
};

export type CaseComputation = {
  entities: ReturnType<typeof resolveEntities>["entities"];
  possibleMatches: ReturnType<typeof resolveEntities>["possibleMatches"];
  events: Array<{
    localId: string;
    title: string;
    description: string;
    occurredAt: string | null;
    occurredAtEnd: string | null;
    timePrecision: ArtifactAnalysis["events"][number]["timePrecision"];
    confidence: number;
    entityIds: string[];
    needsReview: boolean;
    sources: EventSource[];
  }>;
  claims: Claim[];
  conflicts: ReturnType<typeof detectConflicts>;
  redactions: ReturnType<typeof hitsToSuggestions>;
};

const REVIEW_CONFIDENCE = 0.6;

export function computeCase(caseId: string, analyzed: AnalyzedArtifact[]): CaseComputation {
  // --- entities -------------------------------------------------------------
  const candidates: ResolutionCandidate[] = [];
  let mentionCounter = 0;
  for (const artifact of analyzed) {
    for (const entity of artifact.analysis.entities) {
      mentionCounter += 1;
      candidates.push({
        temporaryId: `${artifact.artifactId}:${entity.temporaryId}`,
        type: entity.type,
        displayName: entity.displayName,
        normalizedName: entity.normalizedName,
        confidence: entity.confidence,
        mention: {
          id: `mention-${mentionCounter}`,
          entityId: "",
          artifactId: artifact.artifactId,
          locator: entity.sourceLocator,
          surfaceText: entity.displayName,
          confidence: entity.confidence,
        },
      });
    }
  }
  const { entities, possibleMatches } = resolveEntities(caseId, candidates);
  for (const entity of entities) for (const mention of entity.mentions) mention.entityId = entity.id;

  /** Maps an artifact-scoped temporaryId onto the entity that absorbed it. */
  const entityIdFor = (artifactId: string, temporaryId: string): string | null => {
    const candidate = candidates.find((c) => c.temporaryId === `${artifactId}:${temporaryId}`);
    if (!candidate) return null;
    const owner = entities.find((entity) => entity.mentions.some((m) => m.id === candidate.mention.id));
    return owner?.id ?? null;
  };

  // --- events ---------------------------------------------------------------
  const events: CaseComputation["events"] = [];
  analyzed.forEach((artifact, artifactIndex) => {
    artifact.analysis.events.forEach((event, index) => {
      const occurredAt = event.timePrecision === "unknown" ? null : normaliseTimestamp(event.occurredAt);
      events.push({
        localId: `ev-${artifactIndex + 1}-${index + 1}`,
        title: event.title,
        description: event.description,
        occurredAt,
        occurredAtEnd: occurredAt ? normaliseTimestamp(event.occurredAtEnd) : null,
        // A timestamp we could not parse is an unknown time, not a guess.
        timePrecision: occurredAt ? event.timePrecision : "unknown",
        confidence: event.confidence,
        entityIds: event.entityRefs
          .map((ref) => entityIdFor(artifact.artifactId, ref))
          .filter((id): id is string => Boolean(id)),
        needsReview: event.confidence < REVIEW_CONFIDENCE || occurredAt === null,
        sources: event.sourceLocators.map((locator) => ({
          artifactId: artifact.artifactId,
          locator,
          excerpt: locator.excerpt ?? "",
        })),
      });
    });
  });

  // --- claims ---------------------------------------------------------------
  const claims: Claim[] = [];
  analyzed.forEach((artifact, artifactIndex) => {
    artifact.analysis.claims.forEach((claim, index) => {
      claims.push({
        id: `cl-${artifactIndex + 1}-${index + 1}`,
        caseId,
        eventId: null,
        text: claim.text,
        speakerOrSource: claim.speakerOrSource,
        normalized: {
          subject: claim.normalizedSubject,
          predicate: claim.normalizedPredicate,
          object: claim.normalizedObject,
        },
        confidence: claim.confidence,
        sources: claim.sourceLocators.map((locator) => ({
          artifactId: artifact.artifactId,
          locator,
          excerpt: locator.excerpt ?? "",
        })),
      });
    });
  });

  const conflicts = detectConflicts(caseId, claims);

  // --- privacy --------------------------------------------------------------
  const redactions: CaseComputation["redactions"] = [];
  for (const artifact of analyzed) {
    // Deterministic first.
    if (artifact.textContent) {
      const hits = detectSensitiveText(artifact.textContent);
      redactions.push(
        ...hitsToSuggestions(artifact.artifactId, hits, (hit) => ({
          artifactId: artifact.artifactId,
          type: "text-range",
          startOffset: hit.start,
          endOffset: hit.end,
          excerpt: artifact.textContent!.slice(Math.max(0, hit.start - 24), hit.end + 24).trim(),
        })),
      );
    }
    // Then the model's candidates, which can reach places patterns cannot (image regions).
    artifact.analysis.sensitiveDataCandidates.forEach((candidate, index) => {
      redactions.push({
        id: `rs-model-${artifact.artifactId}-${index}`,
        artifactId: artifact.artifactId,
        category: candidate.category,
        locator: candidate.sourceLocator,
        preview: candidate.preview,
        confidence: candidate.confidence,
        detector: "model",
        decision: "pending",
      });
    });
  }

  return { entities, possibleMatches, events, claims, conflicts, redactions };
}

/** Accepts only timestamps that actually parse; anything else becomes unknown. */
function normaliseTimestamp(value: string | null): string | null {
  if (!value) return null;
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? null : new Date(parsed).toISOString();
}

export type PersistenceClient = SupabaseClient;

/** Rebuilds every derived table for a case from the artifact analyses. */
export async function persistComputation(
  supabase: PersistenceClient,
  caseId: string,
  computation: CaseComputation,
): Promise<void> {
  // Derived rows are replaced wholesale so a re-run never leaves orphans behind.
  await supabase.from("conflicts").delete().eq("case_id", caseId);
  await supabase.from("claims").delete().eq("case_id", caseId);
  await supabase.from("events").delete().eq("case_id", caseId);
  await supabase.from("relationships").delete().eq("case_id", caseId);
  await supabase.from("entities").delete().eq("case_id", caseId);

  const entityIdMap = new Map<string, string>();
  for (const entity of computation.entities) {
    const { data, error } = await supabase
      .from("entities")
      .insert({
        case_id: caseId,
        type: entity.type,
        canonical_name: entity.canonicalName,
        aliases: entity.aliases,
        confidence: entity.confidence,
        resolution: entity.resolution,
      })
      .select("id")
      .single();
    if (error) throw new Error(`Could not save entity ${entity.canonicalName}: ${error.message}`);
    entityIdMap.set(entity.id, data.id);

    for (const mention of entity.mentions) {
      await supabase.from("entity_mentions").insert({
        entity_id: data.id,
        artifact_id: mention.artifactId,
        locator: mention.locator,
        surface_text: mention.surfaceText,
        confidence: mention.confidence,
      });
    }
  }

  for (const match of computation.possibleMatches) {
    const source = entityIdMap.get(match.entityAId);
    const target = entityIdMap.get(match.entityBId);
    if (!source || !target) continue;
    await supabase.from("relationships").insert({
      case_id: caseId,
      source_entity_id: source,
      target_entity_id: target,
      type: "same-as",
      label: `Possible match — ${Math.round(match.similarity * 100)}%`,
      confidence: match.similarity,
    });
  }

  for (const event of computation.events) {
    const { data, error } = await supabase
      .from("events")
      .insert({
        case_id: caseId,
        title: event.title,
        description: event.description,
        occurred_at: event.occurredAt,
        occurred_at_end: event.occurredAtEnd,
        time_precision: event.timePrecision,
        confidence: event.confidence,
        entity_ids: event.entityIds.map((id) => entityIdMap.get(id)).filter(Boolean),
        needs_review: event.needsReview,
      })
      .select("id")
      .single();
    if (error) throw new Error(`Could not save event "${event.title}": ${error.message}`);
    for (const source of event.sources) {
      await supabase.from("event_sources").insert({
        event_id: data.id,
        artifact_id: source.artifactId,
        locator: source.locator,
        excerpt: source.excerpt,
      });
    }
  }

  const claimIdMap = new Map<string, string>();
  for (const claim of computation.claims) {
    const { data, error } = await supabase
      .from("claims")
      .insert({
        case_id: caseId,
        text: claim.text,
        speaker_or_source: claim.speakerOrSource,
        normalized_data: claim.normalized,
        confidence: claim.confidence,
      })
      .select("id")
      .single();
    if (error) throw new Error(`Could not save claim: ${error.message}`);
    claimIdMap.set(claim.id, data.id);
    for (const source of claim.sources) {
      await supabase.from("claim_sources").insert({
        claim_id: data.id,
        artifact_id: source.artifactId,
        locator: source.locator,
        excerpt: source.excerpt,
      });
    }
  }

  for (const conflict of computation.conflicts) {
    const claimA = claimIdMap.get(conflict.claimAId);
    const claimB = conflict.claimBId ? claimIdMap.get(conflict.claimBId) : null;
    if (!claimA) continue;
    await supabase.from("conflicts").insert({
      case_id: caseId,
      classification: conflict.classification,
      explanation: conflict.explanation,
      confidence: conflict.confidence,
      claim_a_id: claimA,
      claim_b_id: claimB,
      dimension: conflict.dimension,
      supporting_sources: conflict.supportingSources,
    });
  }

  for (const redaction of computation.redactions) {
    await supabase.from("redaction_suggestions").insert({
      artifact_id: redaction.artifactId,
      category: redaction.category,
      locator: redaction.locator,
      preview: redaction.preview,
      confidence: redaction.confidence,
      detector: redaction.detector,
      decision: redaction.decision,
    });
  }
}
