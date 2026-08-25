import { describe, expect, it } from "vitest";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { getDemoCase } from "@/lib/demo";
import { sha256Bytes } from "@/lib/integrity/hash";
import { buildManifest, checkFingerprint, verifyManifest } from "@/lib/integrity/manifest";
import { buildTimeline } from "@/lib/timeline/engine";
import { detectConflicts } from "@/lib/conflicts/engine";
import { caseSummary } from "@/lib/utils/case-derived";

const ARTIFACT_DIR = path.resolve(process.cwd(), "public", "demo", "artifacts");
const bundle = getDemoCase();

describe("demo case shape", () => {
  it("parses against the same schema a live case uses", () => {
    expect(bundle.case.isSynthetic).toBe(true);
    expect(bundle.artifacts.length).toBeGreaterThan(0);
  });

  it("grounds every event and claim in at least one source", () => {
    for (const event of bundle.events) expect(event.sources.length).toBeGreaterThan(0);
    for (const claim of bundle.claims) expect(claim.sources.length).toBeGreaterThan(0);
  });

  it("only ever points at artifacts that exist in the case", () => {
    const ids = new Set(bundle.artifacts.map((a) => a.id));
    const locators = [
      ...bundle.events.flatMap((e) => e.sources),
      ...bundle.claims.flatMap((c) => c.sources),
      ...bundle.entities.flatMap((e) => e.mentions.map((m) => ({ artifactId: m.artifactId }))),
      ...bundle.redactions.map((r) => ({ artifactId: r.artifactId })),
    ];
    for (const locator of locators) expect(ids.has(locator.artifactId)).toBe(true);
  });

  it("never asserts a language or conclusion the product forbids", () => {
    const prose = [
      ...bundle.conflicts.map((c) => c.explanation),
      ...bundle.events.map((e) => `${e.title} ${e.description}`),
    ].join(" ");
    expect(prose).not.toMatch(/\b(lied|fraud|guilty|forged|fake|authentic)\b/i);
  });
});

describe("demo fingerprints are real", () => {
  it("matches the hash of every file on disk", async () => {
    for (const artifact of bundle.artifacts) {
      const bytes = await readFile(path.join(ARTIFACT_DIR, artifact.filename));
      expect(await sha256Bytes(new Uint8Array(bytes))).toBe(artifact.sha256);
      expect(bytes.byteLength).toBe(artifact.byteSize);
    }
  });

  it("has a manifest whose root recomputes from its entries", async () => {
    const result = await verifyManifest(bundle.manifest);
    expect(result.valid).toBe(true);
  });

  it("rebuilds the identical root from the artifacts", async () => {
    const rebuilt = await buildManifest({
      caseId: bundle.case.id,
      caseRef: bundle.case.ref,
      artifacts: bundle.artifacts,
      createdAt: bundle.manifest!.createdAt,
    });
    expect(rebuilt.merkleRoot).toBe(bundle.manifest!.merkleRoot);
  });

  it("recognises the original receipt and rejects the modified copy", async () => {
    const original = await readFile(path.join(ARTIFACT_DIR, "receipt-original.png"));
    const modified = await readFile(path.join(ARTIFACT_DIR, "receipt-modified.png"));

    const originalHash = await sha256Bytes(new Uint8Array(original));
    const modifiedHash = await sha256Bytes(new Uint8Array(modified));
    expect(originalHash).not.toBe(modifiedHash);

    const match = await checkFingerprint(originalHash, "receipt-original.png", bundle.manifest);
    expect(match.status).toBe("match");

    const mismatch = await checkFingerprint(modifiedHash, "receipt-original.png", bundle.manifest);
    expect(mismatch.status).toBe("mismatch");
    if (mismatch.status === "mismatch") expect(mismatch.nearest?.sha256).toBe(originalHash);
  });

  it("does not register the modified copy anywhere in the manifest", async () => {
    const modified = await readFile(path.join(ARTIFACT_DIR, "receipt-modified.png"));
    const hash = await sha256Bytes(new Uint8Array(modified));
    expect(bundle.manifest!.artifacts.some((a) => a.sha256 === hash)).toBe(false);
  });
});

describe("demo findings are produced by the shipped engines", () => {
  it("reproduces the stored conflicts by rerunning the detector", () => {
    const rerun = detectConflicts(bundle.case.id, bundle.claims);
    const stored = bundle.conflicts.map((c) => `${c.claimAId}|${c.claimBId}|${c.classification}`).sort();
    const fresh = rerun.map((c) => `${c.claimAId}|${c.claimBId}|${c.classification}`).sort();
    expect(fresh).toEqual(stored);
  });

  it("contains the payment status inconsistency the demo is built around", () => {
    const finding = bundle.conflicts.find(
      (c) => c.classification === "potentially-inconsistent" && c.dimension === "status" && c.claimAId === "cl-01",
    );
    expect(finding).toBeDefined();
    expect(finding!.explanation).toMatch(/not established which is correct/i);
  });

  it("keeps at least one event out of the chronology because no time was established", () => {
    const timeline = buildTimeline(bundle.events, bundle.case.incidentTimezone);
    expect(timeline.unresolved.length).toBeGreaterThan(0);
    for (const event of timeline.unresolved) expect(event.occurredAt).toBeNull();
  });

  it("orders the dated events correctly", () => {
    const timeline = buildTimeline(bundle.events, bundle.case.incidentTimezone);
    const times = timeline.dated.map((e) => Date.parse(e.occurredAt!));
    expect(times).toEqual([...times].sort((a, b) => a - b));
  });

  it("surfaces sensitive values for review", () => {
    const summary = caseSummary(bundle);
    expect(summary.redactionCount).toBeGreaterThan(0);
    expect(bundle.redactions.some((r) => r.detector === "pattern")).toBe(true);
  });

  it("proposes identity matches without merging them", () => {
    const possible = bundle.entities.filter((e) => e.resolution === "possible-match");
    expect(possible.length).toBeGreaterThan(0);
  });
});
