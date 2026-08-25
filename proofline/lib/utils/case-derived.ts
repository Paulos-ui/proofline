import type { CaseBundle, Conflict, TimelineEvent } from "@/lib/schemas/case";

/** Values shown in the case header and dashboard, derived rather than stored. */
export function caseSummary(bundle: CaseBundle) {
  const surfacedConflicts = bundle.conflicts.filter((c) => c.classification !== "compatible");
  const openRedactions = bundle.redactions.filter((r) => r.decision === "pending");
  const needsReview = bundle.events.filter((e) => e.needsReview);
  const failed = bundle.artifacts.filter((a) => a.processingStatus === "failed");

  return {
    artifactCount: bundle.artifacts.length,
    eventCount: bundle.events.length,
    entityCount: bundle.entities.length,
    claimCount: bundle.claims.length,
    conflictCount: surfacedConflicts.length,
    inconsistencyCount: bundle.conflicts.filter((c) => c.classification === "potentially-inconsistent").length,
    redactionCount: openRedactions.length,
    reviewCount: needsReview.length,
    failedCount: failed.length,
    undatedCount: bundle.events.filter((e) => e.timePrecision === "unknown").length,
    hasManifest: bundle.manifest !== null,
    merkleRoot: bundle.manifest?.merkleRoot ?? null,
    anchored: bundle.anchor !== null,
  };
}

export function eventsForArtifact(bundle: CaseBundle, artifactId: string): TimelineEvent[] {
  return bundle.events.filter((event) => event.sources.some((source) => source.artifactId === artifactId));
}

export function conflictsForClaim(bundle: CaseBundle, claimId: string): Conflict[] {
  return bundle.conflicts.filter(
    (conflict) =>
      conflict.classification !== "compatible" && (conflict.claimAId === claimId || conflict.claimBId === claimId),
  );
}

export function claimById(bundle: CaseBundle, claimId: string) {
  return bundle.claims.find((claim) => claim.id === claimId) ?? null;
}

export function artifactById(bundle: CaseBundle, artifactId: string) {
  return bundle.artifacts.find((artifact) => artifact.id === artifactId) ?? null;
}

export function entityById(bundle: CaseBundle, entityId: string) {
  return bundle.entities.find((entity) => entity.id === entityId) ?? null;
}
