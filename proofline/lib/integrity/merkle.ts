import { sha256Text, type Hex } from "./hash";

/**
 * Merkle tree over artifact fingerprints.
 *
 * Domain separation follows RFC 6962: leaves are hashed with a 0x00 prefix and
 * internal nodes with 0x01, so a leaf value can never be presented as an internal
 * node. An odd node at any level is promoted unchanged rather than duplicated,
 * which avoids the duplicate-leaf ambiguity that affects naive implementations.
 */

const LEAF_PREFIX = "00:";
const NODE_PREFIX = "01:";

export async function hashLeaf(value: string): Promise<Hex> {
  return sha256Text(LEAF_PREFIX + value);
}

export async function hashNode(left: Hex, right: Hex): Promise<Hex> {
  return sha256Text(NODE_PREFIX + left + right);
}

export const EMPTY_MERKLE_ROOT = "0".repeat(64);

export async function merkleRoot(leafValues: string[]): Promise<Hex> {
  if (leafValues.length === 0) return EMPTY_MERKLE_ROOT;
  let level = await Promise.all(leafValues.map(hashLeaf));
  while (level.length > 1) {
    const next: Hex[] = [];
    for (let i = 0; i < level.length; i += 2) {
      const left = level[i]!;
      const right = level[i + 1];
      next.push(right === undefined ? left : await hashNode(left, right));
    }
    level = next;
  }
  return level[0]!;
}

export type ProofStep = { sibling: Hex; position: "left" | "right" };

/** Inclusion proof for the leaf at `index`, verifiable without the other leaves. */
export async function merkleProof(leafValues: string[], index: number): Promise<ProofStep[]> {
  if (index < 0 || index >= leafValues.length) throw new RangeError("leaf index out of range");
  let level = await Promise.all(leafValues.map(hashLeaf));
  let position = index;
  const proof: ProofStep[] = [];
  while (level.length > 1) {
    const next: Hex[] = [];
    for (let i = 0; i < level.length; i += 2) {
      const left = level[i]!;
      const right = level[i + 1];
      if (right === undefined) {
        if (i === position) position = next.length;
        next.push(left);
        continue;
      }
      if (i === position) proof.push({ sibling: right, position: "right" });
      else if (i + 1 === position) proof.push({ sibling: left, position: "left" });
      if (i === position || i + 1 === position) position = next.length;
      next.push(await hashNode(left, right));
    }
    level = next;
  }
  return proof;
}

export async function verifyMerkleProof(leafValue: string, proof: ProofStep[], root: Hex): Promise<boolean> {
  let current = await hashLeaf(leafValue);
  for (const step of proof) {
    current = step.position === "right" ? await hashNode(current, step.sibling) : await hashNode(step.sibling, current);
  }
  return current === root;
}
