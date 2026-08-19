import { describe, expect, it } from "vitest";
import { sha256Bytes, sha256Text, shortHash, isSha256 } from "@/lib/integrity/hash";
import { merkleRoot, merkleProof, verifyMerkleProof, EMPTY_MERKLE_ROOT } from "@/lib/integrity/merkle";
import { buildManifest, verifyManifest, checkFingerprint, sortManifestEntries } from "@/lib/integrity/manifest";

const artifact = (id: string, sha256: string, filename: string, byteSize = 1000) => ({
  id,
  filename,
  sha256,
  byteSize,
  mimeType: "image/png",
});

const h = (n: number) => n.toString(16).padStart(64, "0");

describe("sha256", () => {
  it("matches the published digest of the empty string", async () => {
    expect(await sha256Text("")).toBe("e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855");
  });

  it("matches the published digest of 'abc'", async () => {
    expect(await sha256Text("abc")).toBe("ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");
  });

  it("produces the same hash for the same bytes", async () => {
    const bytes = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]);
    expect(await sha256Bytes(bytes)).toBe(await sha256Bytes(new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8])));
  });

  it("produces a different hash when one byte changes", async () => {
    const original = new Uint8Array(256).fill(7);
    const modified = new Uint8Array(256).fill(7);
    modified[128] = 8;
    expect(await sha256Bytes(original)).not.toBe(await sha256Bytes(modified));
  });

  it("recognises and shortens valid digests", async () => {
    const digest = await sha256Text("proofline");
    expect(isSha256(digest)).toBe(true);
    expect(isSha256("not-a-hash")).toBe(false);
    expect(shortHash(digest)).toBe(`${digest.slice(0, 6)}…${digest.slice(-6)}`);
  });
});

describe("merkle tree", () => {
  it("returns a fixed empty root for no leaves", async () => {
    expect(await merkleRoot([])).toBe(EMPTY_MERKLE_ROOT);
  });

  it("is deterministic across runs", async () => {
    const leaves = ["a", "b", "c", "d", "e"];
    expect(await merkleRoot(leaves)).toBe(await merkleRoot([...leaves]));
  });

  it("changes when any leaf changes", async () => {
    expect(await merkleRoot(["a", "b", "c"])).not.toBe(await merkleRoot(["a", "b", "c!"]));
  });

  it("is order-sensitive, which is why manifests sort before hashing", async () => {
    expect(await merkleRoot(["a", "b"])).not.toBe(await merkleRoot(["b", "a"]));
  });

  it("separates leaf and node domains so a leaf cannot masquerade as a node", async () => {
    // With no domain separation, root(["a"]) could collide with an internal node value.
    const single = await merkleRoot(["a"]);
    const pair = await merkleRoot(["a", "a"]);
    expect(single).not.toBe(pair);
  });

  it("verifies inclusion proofs for every leaf, including odd counts", async () => {
    const leaves = ["one", "two", "three", "four", "five", "six", "seven"];
    const root = await merkleRoot(leaves);
    for (let i = 0; i < leaves.length; i += 1) {
      const proof = await merkleProof(leaves, i);
      expect(await verifyMerkleProof(leaves[i]!, proof, root)).toBe(true);
    }
  });

  it("rejects a proof for a leaf that is not in the tree", async () => {
    const leaves = ["one", "two", "three", "four"];
    const root = await merkleRoot(leaves);
    const proof = await merkleProof(leaves, 2);
    expect(await verifyMerkleProof("three-modified", proof, root)).toBe(false);
  });
});

describe("manifest", () => {
  const base = {
    caseId: "case-1",
    caseRef: "PL-TEST",
    createdAt: "2026-01-01T00:00:00.000Z",
  };

  it("normalises artifact order before hashing", async () => {
    const a = artifact("a1", h(3), "z.png");
    const b = artifact("a2", h(1), "m.png");
    const c = artifact("a3", h(2), "a.png");
    const first = await buildManifest({ ...base, artifacts: [a, b, c] });
    const second = await buildManifest({ ...base, artifacts: [c, a, b] });
    expect(first.merkleRoot).toBe(second.merkleRoot);
    expect(first.artifacts.map((x) => x.id)).toEqual(["a2", "a3", "a1"]);
  });

  it("sorts stably when hashes collide on filename", () => {
    const sorted = sortManifestEntries([artifact("b", h(1), "same.png"), artifact("a", h(1), "same.png")]);
    expect(sorted.map((x) => x.id)).toEqual(["a", "b"]);
  });

  it("verifies a manifest it produced", async () => {
    const manifest = await buildManifest({ ...base, artifacts: [artifact("a1", h(9), "r.png")] });
    const result = await verifyManifest(manifest);
    expect(result.valid).toBe(true);
  });

  it("rejects a manifest whose root does not match its entries", async () => {
    const manifest = await buildManifest({ ...base, artifacts: [artifact("a1", h(9), "r.png")] });
    const tampered = { ...manifest, artifacts: [{ ...manifest.artifacts[0]!, byteSize: 999999 }] };
    const result = await verifyManifest(tampered);
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.reason).toMatch(/Merkle root/);
  });

  it("rejects input that is not a manifest at all", async () => {
    const result = await verifyManifest({ hello: "world" });
    expect(result.valid).toBe(false);
  });

  it("refuses to build a manifest from an artifact with no fingerprint", async () => {
    await expect(
      buildManifest({ ...base, artifacts: [{ ...artifact("a1", h(1), "r.png"), sha256: "nope" }] }),
    ).rejects.toThrow(/SHA-256/);
  });

  it("reports a match for a registered fingerprint", async () => {
    const digest = await sha256Text("receipt bytes");
    const manifest = await buildManifest({ ...base, artifacts: [artifact("a1", digest, "receipt-original.png")] });
    const result = await checkFingerprint(digest, "receipt-original.png", manifest);
    expect(result.status).toBe("match");
    if (result.status === "match") expect(result.entry.filename).toBe("receipt-original.png");
  });

  it("reports a mismatch for altered bytes and names the file it expected", async () => {
    const original = await sha256Text("receipt bytes");
    const modified = await sha256Text("receipt bytes (altered)");
    const manifest = await buildManifest({ ...base, artifacts: [artifact("a1", original, "receipt-original.png")] });
    const result = await checkFingerprint(modified, "receipt-original.png", manifest);
    expect(result.status).toBe("mismatch");
    if (result.status === "mismatch") expect(result.nearest?.sha256).toBe(original);
  });
});
