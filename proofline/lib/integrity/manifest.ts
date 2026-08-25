import { ManifestSchema, type Artifact, type Manifest, type ManifestEntry } from "@/lib/schemas/case";
import { merkleRoot } from "./merkle";
import { isSha256 } from "./hash";

/**
 * The manifest is the case's evidence set reduced to fingerprints. It contains no
 * evidence content — only identifiers, sizes, types and hashes — so it can be shared
 * or anchored without exposing anything private.
 */

/** Deterministic order: by sha256, then filename, then id. Independent of upload order. */
export function sortManifestEntries(entries: ManifestEntry[]): ManifestEntry[] {
  return [...entries].sort(
    (a, b) => a.sha256.localeCompare(b.sha256) || a.filename.localeCompare(b.filename) || a.id.localeCompare(b.id),
  );
}

export function toManifestEntries(artifacts: Pick<Artifact, "id" | "filename" | "sha256" | "byteSize" | "mimeType">[]) {
  return sortManifestEntries(
    artifacts.map((a) => ({
      id: a.id,
      filename: a.filename,
      sha256: a.sha256,
      byteSize: a.byteSize,
      mimeType: a.mimeType,
    })),
  );
}

/** The exact string committed to the tree for one artifact. Order of fields is fixed. */
export function manifestLeafValue(entry: ManifestEntry): string {
  return [entry.sha256, entry.byteSize, entry.mimeType, entry.filename].join("|");
}

export async function buildManifest(input: {
  caseId: string;
  caseRef: string;
  artifacts: Pick<Artifact, "id" | "filename" | "sha256" | "byteSize" | "mimeType">[];
  createdAt: string;
}): Promise<Manifest> {
  const artifacts = toManifestEntries(input.artifacts);
  for (const entry of artifacts) {
    if (!isSha256(entry.sha256)) throw new Error(`Artifact ${entry.id} has no valid SHA-256 fingerprint.`);
  }
  const root = await merkleRoot(artifacts.map(manifestLeafValue));
  return ManifestSchema.parse({
    version: "1",
    caseId: input.caseId,
    caseRef: input.caseRef,
    createdAt: input.createdAt,
    artifacts,
    merkleRoot: root,
  });
}

/** Recomputes the root from the manifest body and compares it to the stored root. */
export async function verifyManifest(manifest: unknown): Promise<
  { valid: true; manifest: Manifest } | { valid: false; reason: string }
> {
  const parsed = ManifestSchema.safeParse(manifest);
  if (!parsed.success) {
    return { valid: false, reason: "This file is not a Proofline manifest, or it is missing required fields." };
  }
  const sorted = sortManifestEntries(parsed.data.artifacts);
  const recomputed = await merkleRoot(sorted.map(manifestLeafValue));
  if (recomputed !== parsed.data.merkleRoot) {
    return { valid: false, reason: "The manifest's entries do not produce its stated Merkle root." };
  }
  return { valid: true, manifest: { ...parsed.data, artifacts: sorted } };
}

export type FingerprintResult =
  | { status: "match"; entry: ManifestEntry; manifest: Manifest }
  | { status: "mismatch"; hash: string; manifest: Manifest; nearest?: ManifestEntry }
  | { status: "manifest-invalid"; reason: string };

/**
 * Compares a locally computed hash against a manifest.
 *
 * A match proves only that the submitted bytes are identical to the bytes that were
 * fingerprinted. It says nothing about whether the original content was truthful.
 */
export async function checkFingerprint(
  hash: string,
  filename: string,
  manifestInput: unknown,
): Promise<FingerprintResult> {
  const verified = await verifyManifest(manifestInput);
  if (!verified.valid) return { status: "manifest-invalid", reason: verified.reason };
  const { manifest } = verified;
  const entry = manifest.artifacts.find((a) => a.sha256 === hash);
  if (entry) return { status: "match", entry, manifest };
  const nearest = manifest.artifacts.find((a) => a.filename === filename);
  return { status: "mismatch", hash, manifest, ...(nearest ? { nearest } : {}) };
}
