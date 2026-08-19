/**
 * Builds the demo case bundle.
 *
 * Fingerprints, the Merkle root, entity resolution, conflict detection and
 * sensitive-text detection are all computed here by the same modules the live
 * product uses. Nothing in the output is hand-written except the seeded analysis in
 * fixtures/demo-case/source.ts, which stands in for the model's response.
 */
import { readFile, writeFile, stat } from "node:fs/promises";
import path from "node:path";
import { sha256Bytes } from "../lib/integrity/hash";
import { buildManifest } from "../lib/integrity/manifest";
import { resolveEntities, type ResolutionCandidate } from "../lib/entities/resolve";
import { detectConflicts } from "../lib/conflicts/engine";
import { detectSensitiveText, hitsToSuggestions } from "../lib/privacy/patterns";
import { CaseBundleSchema, type Artifact, type CaseBundle, type Claim, type Conflict, type RedactionSuggestion, type Relationship, type TimelineEvent } from "../lib/schemas/case";
import {
  DEMO_ARTIFACTS,
  DEMO_CASE,
  DEMO_CLAIMS,
  DEMO_ENTITY_CANDIDATES,
  DEMO_EVENTS,
  DEMO_IMAGE_REDACTIONS,
  DEMO_RELATIONSHIPS,
} from "../fixtures/demo-case/source";

const ROOT = path.resolve(import.meta.dirname, "..");
const ARTIFACT_DIR = path.join(ROOT, "public", "demo", "artifacts");
const OUT_DIR = path.join(ROOT, "fixtures", "demo-case");

async function main() {
  // 1. Real bytes -> real fingerprints.
  const artifacts: Artifact[] = [];
  const textContents = new Map<string, string>();

  for (const definition of DEMO_ARTIFACTS) {
    const filePath = path.join(ARTIFACT_DIR, definition.filename);
    const bytes = await readFile(filePath);
    const info = await stat(filePath);
    const sha256 = await sha256Bytes(new Uint8Array(bytes));

    let transcript: string | null = null;
    if (definition.transcriptFile) {
      transcript = await readFile(path.join(ARTIFACT_DIR, definition.transcriptFile), "utf8");
    }
    let textContent: string | null = null;
    if (definition.isText) {
      textContent = bytes.toString("utf8");
      textContents.set(definition.id, textContent);
    }

    artifacts.push({
      id: definition.id,
      caseId: DEMO_CASE.id,
      filename: definition.filename,
      mimeType: definition.mimeType,
      byteSize: info.size,
      storagePath: `/demo/artifacts/${definition.filename}`,
      sha256,
      processingStatus: "extracted",
      kind: definition.kind,
      summary: definition.summary,
      dimensions: definition.dimensions ?? null,
      transcript,
      textContent,
      previewPath: `/demo/artifacts/${definition.filename}`,
      failureReason: null,
      createdAt: DEMO_CASE.createdAt,
    });
  }

  // 2. Entity resolution runs for real over the seeded mentions.
  const candidates: ResolutionCandidate[] = DEMO_ENTITY_CANDIDATES.map((candidate, index) => ({
    temporaryId: candidate.temporaryId,
    type: candidate.type,
    displayName: candidate.displayName,
    normalizedName: candidate.displayName.toLowerCase(),
    confidence: candidate.confidence,
    mention: {
      id: `mention-${index + 1}`,
      entityId: "",
      artifactId: candidate.locator.artifactId,
      locator: candidate.locator,
      surfaceText: candidate.surfaceText,
      confidence: candidate.confidence,
    },
  }));
  const { entities, possibleMatches } = resolveEntities(DEMO_CASE.id, candidates);
  for (const entity of entities) for (const mention of entity.mentions) mention.entityId = entity.id;

  // Map each seeded temporaryId to the entity that absorbed it.
  const tempToEntity = new Map<string, string>();
  for (const candidate of DEMO_ENTITY_CANDIDATES) {
    const owner = entities.find((entity) =>
      entity.mentions.some(
        (m) => m.surfaceText === candidate.surfaceText && m.artifactId === candidate.locator.artifactId,
      ),
    );
    if (owner) tempToEntity.set(candidate.temporaryId, owner.id);
  }

  const events: TimelineEvent[] = DEMO_EVENTS.map((event) => ({
    id: event.id,
    caseId: DEMO_CASE.id,
    title: event.title,
    description: event.description,
    occurredAt: event.occurredAt,
    occurredAtEnd: null,
    timePrecision: event.timePrecision,
    confidence: event.confidence,
    entityIds: event.entityRefs.map((ref) => tempToEntity.get(ref)).filter((id): id is string => Boolean(id)),
    sources: event.sources.map((source) => ({
      artifactId: source.locator.artifactId,
      locator: source.locator,
      excerpt: source.excerpt,
    })),
    needsReview: event.needsReview ?? false,
  }));

  const claims: Claim[] = DEMO_CLAIMS.map((claim) => ({
    id: claim.id,
    caseId: DEMO_CASE.id,
    eventId: claim.eventId,
    text: claim.text,
    speakerOrSource: claim.speakerOrSource,
    normalized: { subject: claim.subject, predicate: claim.predicate, object: claim.object },
    confidence: claim.confidence,
    sources: claim.sources.map((source) => ({
      artifactId: source.locator.artifactId,
      locator: source.locator,
      excerpt: source.excerpt,
    })),
  }));

  // 3. Conflicts are produced by the shipped engine, not written by hand.
  const conflicts: Conflict[] = detectConflicts(DEMO_CASE.id, claims);

  const relationships: Relationship[] = DEMO_RELATIONSHIPS.flatMap((relationship, index) => {
    const sourceEntityId = tempToEntity.get(relationship.source);
    const targetEntityId = tempToEntity.get(relationship.target);
    if (!sourceEntityId || !targetEntityId || sourceEntityId === targetEntityId) return [];
    return [
      {
        id: `rel-${index + 1}`,
        caseId: DEMO_CASE.id,
        sourceEntityId,
        targetEntityId,
        type: relationship.type,
        label: relationship.label,
        confidence: relationship.confidence,
        supportingSources: [],
      },
    ];
  });

  // Possible matches surface in the graph as unmerged identity links.
  possibleMatches.forEach((match, index) => {
    relationships.push({
      id: `rel-possible-${index + 1}`,
      caseId: DEMO_CASE.id,
      sourceEntityId: match.entityAId,
      targetEntityId: match.entityBId,
      type: "same-as",
      label: `Possible match — ${Math.round(match.similarity * 100)}%`,
      confidence: Number(match.similarity.toFixed(2)),
      supportingSources: [],
    });
  });

  // 4. Sensitive data: real pattern detection over real text artifacts.
  const redactions: RedactionSuggestion[] = [];
  for (const [artifactId, content] of textContents) {
    const hits = detectSensitiveText(content);
    redactions.push(
      ...hitsToSuggestions(artifactId, hits, (hit) => ({
        artifactId,
        type: "text-range",
        startOffset: hit.start,
        endOffset: hit.end,
        excerpt: content.slice(Math.max(0, hit.start - 24), hit.end + 24).replace(/\s+/g, " ").trim(),
      })),
    );
  }
  DEMO_IMAGE_REDACTIONS.forEach((redaction, index) => {
    redactions.push({
      id: `rs-img-${index + 1}`,
      artifactId: redaction.artifactId,
      category: redaction.category,
      locator: { artifactId: redaction.artifactId, type: "image-region", bbox: redaction.bbox },
      preview: redaction.preview,
      confidence: redaction.confidence,
      detector: "model",
      decision: "pending",
    });
  });

  // 5. Manifest over the real fingerprints.
  const manifest = await buildManifest({
    caseId: DEMO_CASE.id,
    caseRef: DEMO_CASE.ref,
    artifacts,
    createdAt: DEMO_CASE.lastProcessedAt,
  });

  const bundle: CaseBundle = CaseBundleSchema.parse({
    case: {
      id: DEMO_CASE.id,
      ref: DEMO_CASE.ref,
      ownerId: null,
      title: DEMO_CASE.title,
      description: DEMO_CASE.description,
      status: "ready",
      incidentTimezone: DEMO_CASE.incidentTimezone,
      isSynthetic: true,
      createdAt: DEMO_CASE.createdAt,
      updatedAt: DEMO_CASE.lastProcessedAt,
      lastProcessedAt: DEMO_CASE.lastProcessedAt,
    },
    artifacts,
    entities,
    events,
    claims,
    relationships,
    conflicts,
    redactions,
    manifest,
    anchor: null,
  });

  await writeFile(path.join(OUT_DIR, "bundle.json"), `${JSON.stringify(bundle, null, 2)}\n`);
  await writeFile(path.join(OUT_DIR, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);
  await writeFile(
    path.join(ROOT, "public", "demo", "manifest.json"),
    `${JSON.stringify(manifest, null, 2)}\n`,
  );

  const surfaced = conflicts.filter((c) => c.classification !== "compatible");
  console.log(`artifacts        ${artifacts.length}`);
  console.log(`entities         ${entities.length} (${possibleMatches.length} possible matches)`);
  console.log(`events           ${events.length} (${events.filter((e) => e.timePrecision === "unknown").length} without an established time)`);
  console.log(`claims           ${claims.length}`);
  console.log(`conflicts        ${conflicts.length} total, ${surfaced.length} surfaced`);
  for (const conflict of surfaced) console.log(`   ${conflict.classification.padEnd(24)} ${conflict.claimAId} ↔ ${conflict.claimBId} (${conflict.dimension})`);
  console.log(`redactions       ${redactions.length}`);
  console.log(`merkle root      ${manifest.merkleRoot}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
