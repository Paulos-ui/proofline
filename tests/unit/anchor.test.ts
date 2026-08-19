import { describe, expect, it } from "vitest";
import { assertMemoIsSafe, base58Decode, buildMemo, explorerUrl, MEMO_PREFIX } from "@/lib/solana/anchor";

const root = "a".repeat(64);

describe("anchor memo", () => {
  it("carries only the version prefix and the Merkle root", () => {
    expect(buildMemo(root)).toBe(`${MEMO_PREFIX}${root}`);
  });

  it("refuses to build a memo from something that is not a root", () => {
    expect(() => buildMemo("not-a-root")).toThrow(/Merkle root/);
  });

  it("rejects a memo carrying anything beyond the root", () => {
    expect(() => assertMemoIsSafe(`${MEMO_PREFIX}${root} dana.okafor@student.example`)).toThrow(/bare Merkle root/);
    expect(() => assertMemoIsSafe(`case PL-84F2 ${root}`)).toThrow(/prefix/);
  });

  it("accepts a well-formed memo", () => {
    expect(() => assertMemoIsSafe(buildMemo(root))).not.toThrow();
  });

  it("points devnet signatures at the right explorer cluster", () => {
    expect(explorerUrl("sig123", "devnet")).toContain("cluster=devnet");
    expect(explorerUrl("sig123", "mainnet-beta")).not.toContain("cluster=");
  });
});

describe("base58", () => {
  it("decodes a known value", () => {
    // "1" is the base58 encoding of a single zero byte.
    expect(Array.from(base58Decode("1"))).toEqual([0]);
  });

  it("rejects characters outside the alphabet", () => {
    expect(() => base58Decode("0OIl")).toThrow(/base58/);
  });
});
