import type { EntityType } from "@/lib/schemas/extraction";
import type { Entity, EntityMention } from "@/lib/schemas/case";

/**
 * Entity resolution is deliberately conservative. Two mentions are merged only when
 * a deterministic key matches (identical email, phone, handle, normalised name).
 * Everything weaker is surfaced as a "possible match" for the user to decide, because
 * silently merging two people is a worse failure than showing two rows.
 */

export function normalizeName(raw: string): string {
  return raw
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9@+._-\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function normalizeEmail(raw: string): string {
  const value = raw.trim().toLowerCase();
  const [local = "", domain = ""] = value.split("@");
  if (!domain) return value;
  // Dots and +tags are not significant on the major providers.
  const cleanedLocal = domain === "gmail.com" ? local.replace(/\./g, "").split("+")[0]! : local.split("+")[0]!;
  return `${cleanedLocal}@${domain}`;
}

export function normalizePhone(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  return digits.length > 10 ? digits.slice(-10) : digits;
}

export function normalizeHandle(raw: string): string {
  return raw.trim().toLowerCase().replace(/^@/, "");
}

/** The value two entities must share exactly to be merged without asking. */
export function deterministicKey(type: EntityType, value: string): string | null {
  switch (type) {
    case "email":
      return `email:${normalizeEmail(value)}`;
    case "phone":
      return `phone:${normalizePhone(value)}`;
    case "account":
      return `account:${normalizeHandle(value)}`;
    case "transaction":
      return `txn:${value.trim().toLowerCase()}`;
    default:
      return null;
  }
}

/**
 * Tokens used for comparison. For an address-like value only the local part is
 * considered, so "dana.okafor@student.example" and "Dana Okafor" can be related
 * without treating the domain as part of the name.
 */
export function nameTokens(value: string): string[] {
  const normalized = normalizeName(value);
  const base = normalized.includes("@") ? normalized.split("@")[0]! : normalized;
  return base.split(/[^a-z0-9]+/).filter(Boolean);
}

/** Token-set similarity. Cheap, explainable, and good enough to *propose* a match. */
export function nameSimilarity(a: string, b: string): number {
  const left = new Set(nameTokens(a));
  const right = new Set(nameTokens(b));
  if (left.size === 0 || right.size === 0) return 0;
  let shared = 0;
  for (const token of left) if (right.has(token)) shared += 1;
  const jaccard = shared / (left.size + right.size - shared);
  // "Alex" vs "Alex M." — a full prefix containment is meaningful on short names.
  const [shortSet, longSet] = left.size <= right.size ? [left, right] : [right, left];
  let contained = 0;
  for (const token of shortSet) {
    for (const other of longSet) {
      if (other === token || (token.length >= 3 && other.startsWith(token))) {
        contained += 1;
        break;
      }
    }
  }
  const containment = contained / shortSet.size;
  return Math.max(jaccard, containment * 0.85);
}

export type ResolutionCandidate = {
  temporaryId: string;
  type: EntityType;
  displayName: string;
  normalizedName: string;
  confidence: number;
  mention: EntityMention;
};

export type ResolutionResult = {
  entities: Entity[];
  /** Pairs the product should present as "possible match" rather than merging. */
  possibleMatches: Array<{ entityAId: string; entityBId: string; similarity: number; reason: string }>;
};

const IDENTITY_TYPES = new Set<EntityType>(["person", "organization", "account", "email", "phone"]);

export const POSSIBLE_MATCH_THRESHOLD = 0.55;
export const CONFIDENT_NAME_THRESHOLD = 0.999;

export function resolveEntities(caseId: string, candidates: ResolutionCandidate[]): ResolutionResult {
  const byKey = new Map<string, Entity>();
  const entities: Entity[] = [];

  for (const candidate of candidates) {
    const key =
      deterministicKey(candidate.type, candidate.displayName) ??
      `${candidate.type}:${candidate.normalizedName || normalizeName(candidate.displayName)}`;

    const existing = byKey.get(key);
    if (existing) {
      existing.mentions.push(candidate.mention);
      if (!existing.aliases.includes(candidate.displayName) && existing.canonicalName !== candidate.displayName) {
        existing.aliases.push(candidate.displayName);
      }
      // Confidence rises with corroboration but never reaches certainty.
      existing.confidence = Math.min(0.98, Math.max(existing.confidence, candidate.confidence) + 0.04);
      existing.resolution = "confirmed";
      continue;
    }

    const entity: Entity = {
      id: `ent-${entities.length + 1}-${key.replace(/[^a-z0-9]+/gi, "").slice(0, 12)}`,
      caseId,
      type: candidate.type,
      canonicalName: candidate.displayName,
      aliases: [],
      confidence: candidate.confidence,
      resolution: "unresolved",
      mentions: [candidate.mention],
    };
    byKey.set(key, entity);
    entities.push(entity);
  }

  const possibleMatches: ResolutionResult["possibleMatches"] = [];
  for (let i = 0; i < entities.length; i += 1) {
    for (let j = i + 1; j < entities.length; j += 1) {
      const a = entities[i]!;
      const b = entities[j]!;
      // Only identity-bearing types are compared across type boundaries: a person and
      // an email address can be the same party, a person and a product cannot.
      const sameType = a.type === b.type;
      const bothIdentity = IDENTITY_TYPES.has(a.type) && IDENTITY_TYPES.has(b.type);
      if (!sameType && !bothIdentity) continue;
      const raw = Math.max(
        nameSimilarity(a.canonicalName, b.canonicalName),
        ...a.aliases.map((alias) => nameSimilarity(alias, b.canonicalName)),
        ...b.aliases.map((alias) => nameSimilarity(a.canonicalName, alias)),
      );
      // A cross-type match is weaker evidence than a same-type one, and is damped so
      // the interface never implies certainty Proofline does not have.
      const similarity = sameType ? raw : raw * 0.9;
      if (similarity >= POSSIBLE_MATCH_THRESHOLD) {
        possibleMatches.push({
          entityAId: a.id,
          entityBId: b.id,
          similarity,
          reason:
            a.type === b.type
              ? `Names overlap (${Math.round(similarity * 100)}% token match). Proofline did not merge these automatically.`
              : `A ${a.type} and a ${b.type} share the same naming tokens. They may be the same party — confirm before treating them as one.`,
        });
        a.resolution = a.resolution === "confirmed" ? "confirmed" : "possible-match";
        b.resolution = b.resolution === "confirmed" ? "confirmed" : "possible-match";
      }
    }
  }

  return { entities, possibleMatches };
}
