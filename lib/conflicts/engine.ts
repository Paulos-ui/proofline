import type { Claim, Conflict, ConflictClassification, EventSource } from "@/lib/schemas/case";
import { nameSimilarity, normalizeName } from "@/lib/entities/resolve";

/**
 * Potential inconsistency detection.
 *
 * The engine is deterministic and explainable by design. It pairs claims that talk
 * about the same subject, then compares them along one dimension at a time. A model
 * may later be asked to write a clearer explanation, but it cannot invent the finding
 * and it cannot upgrade a classification.
 *
 * Nothing here concludes that anyone lied. The strongest available output is
 * "potentially inconsistent", which means two sources describe the same thing
 * differently and a person should look at both.
 */

/**
 * Status vocabularies, grouped by what they describe. Buckets are only comparable
 * within a group: "payment settled" and "parcel dispatched" are different subjects,
 * not a disagreement.
 */
const STATUS_GROUPS: Record<string, Record<string, string[]>> = {
  payment: {
    settled: ["completed", "complete", "cleared", "clears", "successful", "success", "paid", "settled", "confirmed", "received", "gone through"],
    pending: ["pending", "processing", "on hold", "in review", "review queue", "awaiting", "unconfirmed", "not received", "not released", "incomplete"],
    failed: ["failed", "declined", "rejected", "reversed", "cancelled", "canceled", "refunded", "chargeback"],
  },
  dispatch: {
    dispatched: ["shipped", "dispatched", "posted", "went out", "sent out", "collected", "with the courier", "handed over"],
    "not-dispatched": ["not yet collected", "label created", "awaiting collection", "will ship", "will drop", "not shipped", "boxed up", "ready to send"],
    delivered: ["delivered", "arrived", "signed for"],
  },
};

export type StatusReading = { group: string; bucket: string; term: string };

export function statusBucket(text: string): StatusReading | null {
  const haystack = ` ${normalizeName(text)} `;
  let best: StatusReading | null = null;
  for (const [group, buckets] of Object.entries(STATUS_GROUPS)) {
    for (const [bucket, terms] of Object.entries(buckets)) {
      for (const term of terms) {
        if (haystack.includes(` ${term} `) || haystack.includes(` ${term}`)) {
          // Longer phrases are more specific, so they win ("not yet collected" over "collected").
          if (!best || term.length > best.term.length) best = { group, bucket, term };
        }
      }
    }
  }
  return best;
}

/** Do two claims plausibly describe the same thing? Cheap gate before comparison. */
export function claimsShareSubject(a: Claim, b: Claim): number {
  const subjectA = a.normalized.subject ?? a.text;
  const subjectB = b.normalized.subject ?? b.text;
  const subjectScore = nameSimilarity(subjectA, subjectB);
  const objectScore =
    a.normalized.object && b.normalized.object ? nameSimilarity(a.normalized.object, b.normalized.object) : 0;
  const textScore = nameSimilarity(a.text, b.text);
  return Math.max(subjectScore, objectScore * 0.9, textScore * 0.7);
}

export type ConflictCandidate = {
  a: Claim;
  b: Claim;
  subjectScore: number;
  dimension: Conflict["dimension"];
};

export const SUBJECT_THRESHOLD = 0.5;

export function generateCandidates(claims: Claim[]): ConflictCandidate[] {
  const candidates: ConflictCandidate[] = [];
  for (let i = 0; i < claims.length; i += 1) {
    for (let j = i + 1; j < claims.length; j += 1) {
      const a = claims[i]!;
      const b = claims[j]!;
      const subjectScore = claimsShareSubject(a, b);
      if (subjectScore < SUBJECT_THRESHOLD) continue;
      // Two claims from the exact same locator cannot disagree with each other.
      const sameSource =
        a.sources.length === 1 &&
        b.sources.length === 1 &&
        a.sources[0]!.artifactId === b.sources[0]!.artifactId &&
        a.sources[0]!.excerpt === b.sources[0]!.excerpt;
      if (sameSource) continue;

      const statusA = statusBucket(a.normalized.object ?? a.text);
      const statusB = statusBucket(b.normalized.object ?? b.text);
      let dimension: Conflict["dimension"] = "other";
      if (statusA && statusB && statusA.group === statusB.group) dimension = "status";
      else if (a.normalized.predicate && b.normalized.predicate && a.normalized.predicate !== b.normalized.predicate) {
        dimension = "other";
      }
      candidates.push({ a, b, subjectScore, dimension });
    }
  }
  return candidates;
}

export type ClassifiedConflict = {
  classification: ConflictClassification;
  dimension: Conflict["dimension"];
  explanation: string;
  confidence: number;
};

/**
 * Compares one candidate pair. Returns `compatible` when the claims agree, which the
 * UI does not surface as a finding but which is kept so the analysis is auditable.
 */
export function classifyCandidate(candidate: ConflictCandidate): ClassifiedConflict {
  const { a, b, subjectScore } = candidate;
  const statusA = statusBucket(a.normalized.object ?? a.text);
  const statusB = statusBucket(b.normalized.object ?? b.text);

  if (statusA && statusB && statusA.group === statusB.group) {
    if (statusA.bucket === statusB.bucket) {
      return {
        classification: "compatible",
        dimension: "status",
        explanation: "Both sources describe the same status.",
        confidence: Math.min(0.9, subjectScore),
      };
    }
    const evidenceStrength = Math.min(a.confidence, b.confidence);
    return {
      classification: evidenceStrength < 0.4 ? "unresolved" : "potentially-inconsistent",
      dimension: "status",
      explanation: buildStatusExplanation(a, b, statusA.bucket, statusB.bucket),
      confidence: Number((subjectScore * 0.5 + evidenceStrength * 0.5).toFixed(2)),
    };
  }

  const amountA = extractAmount(a);
  const amountB = extractAmount(b);
  if (amountA !== null && amountB !== null && amountA !== amountB) {
    return {
      classification: "potentially-inconsistent",
      dimension: "amount",
      explanation: `One source states an amount of ${amountA}, while another states ${amountB} for what appears to be the same transaction. Both sources are shown side by side for review.`,
      confidence: Number((subjectScore * 0.6 + Math.min(a.confidence, b.confidence) * 0.4).toFixed(2)),
    };
  }

  if (subjectScore >= 0.8) {
    return {
      classification: "compatible",
      dimension: "other",
      explanation: "The two statements describe the same thing without a detectable difference.",
      confidence: Number(subjectScore.toFixed(2)),
    };
  }

  return {
    classification: "insufficient-evidence",
    dimension: "other",
    explanation:
      "These statements may refer to the same subject, but the available evidence does not establish enough detail to compare them.",
    confidence: Number((subjectScore * 0.5).toFixed(2)),
  };
}

function buildStatusExplanation(a: Claim, b: Claim, statusA: string, statusB: string): string {
  const speakerA = a.speakerOrSource ?? "One source";
  const speakerB = b.speakerOrSource ?? "another source";
  const phrase: Record<string, string> = {
    settled: "as completed",
    pending: "as still pending",
    failed: "as failed or reversed",
    dispatched: "as already sent",
    "not-dispatched": "as not yet sent",
    delivered: "as delivered",
  };
  return `${speakerA} describes this ${phrase[statusA] ?? "one way"}, while ${speakerB} describes it ${
    phrase[statusB] ?? "differently"
  }. Proofline has not established which is correct — open both sources to compare them.`;
}

const AMOUNT_PATTERN = /(?:[$£€₦]|\b(?:usd|eur|gbp|ngn)\s*)\s?([\d,]+(?:\.\d{1,2})?)/i;

export function extractAmount(claim: Claim): string | null {
  const haystack = `${claim.normalized.object ?? ""} ${claim.text}`;
  const match = AMOUNT_PATTERN.exec(haystack);
  return match ? match[0].trim() : null;
}

export function detectConflicts(caseId: string, claims: Claim[]): Conflict[] {
  const candidates = generateCandidates(claims);
  const conflicts: Conflict[] = [];
  candidates.forEach((candidate, index) => {
    const classified = classifyCandidate(candidate);
    const supportingSources: EventSource[] = [...candidate.a.sources, ...candidate.b.sources];
    conflicts.push({
      id: `cf-${index + 1}`,
      caseId,
      classification: classified.classification,
      explanation: classified.explanation,
      confidence: classified.confidence,
      claimAId: candidate.a.id,
      claimBId: candidate.b.id,
      dimension: classified.dimension,
      supportingSources,
    });
  });
  return conflicts.sort((x, y) => rank(x.classification) - rank(y.classification) || y.confidence - x.confidence);
}

function rank(classification: ConflictClassification): number {
  switch (classification) {
    case "potentially-inconsistent":
      return 0;
    case "unresolved":
      return 1;
    case "insufficient-evidence":
      return 2;
    case "compatible":
      return 3;
  }
}

export const CLASSIFICATION_LABELS: Record<ConflictClassification, string> = {
  "potentially-inconsistent": "Potential inconsistency",
  unresolved: "Unresolved difference",
  "insufficient-evidence": "Insufficient evidence",
  compatible: "Compatible",
};
