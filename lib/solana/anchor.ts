import { AnchorSchema, type Anchor } from "@/lib/schemas/case";

/**
 * Optional public integrity anchor.
 *
 * What goes on chain is a single memo containing the Proofline version and the
 * Merkle root — no names, no filenames, no case metadata, nothing derived from
 * evidence content. The root is a hash of hashes, so it reveals nothing about the
 * files while still committing to them.
 *
 * An anchor establishes that a commitment existed by a certain point in a public
 * transaction history. It does not establish that the underlying content was
 * truthful. The rest of Proofline works identically with anchoring disabled.
 */

export const MEMO_PREFIX = "proofline:v1:";

export function isAnchorEnabled(): boolean {
  return process.env.ENABLE_SOLANA_ANCHOR === "true";
}

export function anchorConfig() {
  return {
    cluster: process.env.SOLANA_CLUSTER ?? "devnet",
    rpcUrl: process.env.SOLANA_RPC_URL ?? "https://api.devnet.solana.com",
    /**
     * Server-held signer. Whoever operates this deployment controls the key and pays
     * the fee; this is custodial by design so that ordinary users never need a wallet.
     * Treat it as a low-value operational key, not a treasury.
     */
    privateKey: process.env.SOLANA_ANCHOR_PRIVATE_KEY ?? "",
  };
}

export function buildMemo(merkleRoot: string): string {
  if (!/^[0-9a-f]{64}$/.test(merkleRoot)) throw new Error("An anchor needs a valid Merkle root.");
  return `${MEMO_PREFIX}${merkleRoot}`;
}

/** Guards against anything but a hash reaching the chain. */
export function assertMemoIsSafe(memo: string): void {
  if (!memo.startsWith(MEMO_PREFIX)) throw new Error("Memo does not carry the Proofline prefix.");
  const payload = memo.slice(MEMO_PREFIX.length);
  if (!/^[0-9a-f]{64}$/.test(payload)) {
    throw new Error("Memo payload is not a bare Merkle root. Nothing else may be anchored.");
  }
}

export function explorerUrl(signature: string, cluster: string): string {
  return `https://explorer.solana.com/tx/${signature}${cluster === "mainnet-beta" ? "" : `?cluster=${cluster}`}`;
}

/**
 * Submits the memo. The Solana packages are imported dynamically so a deployment with
 * anchoring disabled never loads them, and a missing optional dependency degrades to
 * a clear message instead of a build failure.
 */
export async function anchorMerkleRoot(merkleRoot: string): Promise<Anchor> {
  if (!isAnchorEnabled()) throw new Error("Public anchoring is disabled on this deployment.");
  const config = anchorConfig();
  if (!config.privateKey) throw new Error("No anchor signer is configured (SOLANA_ANCHOR_PRIVATE_KEY).");

  const memo = buildMemo(merkleRoot);
  assertMemoIsSafe(memo);

  let kit: typeof import("@solana/kit");
  let memoProgram: typeof import("@solana-program/memo");
  try {
    kit = await import("@solana/kit");
    memoProgram = await import("@solana-program/memo");
  } catch {
    throw new Error("Solana packages are not installed. Run npm install @solana/kit @solana-program/memo.");
  }

  const signer = await kit.createKeyPairSignerFromBytes(decodeSecretKey(config.privateKey));
  const rpc = kit.createSolanaRpc(config.rpcUrl);
  const rpcSubscriptions = kit.createSolanaRpcSubscriptions(config.rpcUrl.replace(/^http/, "ws"));

  const { value: latestBlockhash } = await rpc.getLatestBlockhash().send();
  const instruction = memoProgram.getAddMemoInstruction({ memo, signers: [signer] });

  const message = kit.pipe(
    kit.createTransactionMessage({ version: 0 }),
    (m) => kit.setTransactionMessageFeePayerSigner(signer, m),
    (m) => kit.setTransactionMessageLifetimeUsingBlockhash(latestBlockhash, m),
    (m) => kit.appendTransactionMessageInstructions([instruction], m),
  );

  const signed = await kit.signTransactionMessageWithSigners(message);
  const sendAndConfirm = kit.sendAndConfirmTransactionFactory({ rpc, rpcSubscriptions });
  // The message was built with a blockhash lifetime; narrow the union for the sender.
  kit.assertIsTransactionWithBlockhashLifetime(signed);
  await sendAndConfirm(signed, { commitment: "confirmed" });
  const signature = kit.getSignatureFromTransaction(signed);

  return AnchorSchema.parse({
    network: "solana",
    cluster: config.cluster,
    signature,
    merkleRoot,
    anchoredAt: new Date().toISOString(),
    explorerUrl: explorerUrl(signature, config.cluster),
    memo,
  });
}

/** Accepts either a JSON byte array (solana-keygen output) or base58. */
function decodeSecretKey(value: string): Uint8Array {
  const trimmed = value.trim();
  if (trimmed.startsWith("[")) return Uint8Array.from(JSON.parse(trimmed) as number[]);
  return base58Decode(trimmed);
}

const BASE58 = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";

export function base58Decode(value: string): Uint8Array {
  const bytes: number[] = [];
  for (const char of value) {
    const index = BASE58.indexOf(char);
    if (index < 0) throw new Error("The anchor key is not valid base58.");
    let carry = index;
    for (let i = 0; i < bytes.length; i += 1) {
      carry += bytes[i]! * 58;
      bytes[i] = carry & 0xff;
      carry >>= 8;
    }
    while (carry > 0) {
      bytes.push(carry & 0xff);
      carry >>= 8;
    }
  }
  for (const char of value) {
    if (char !== BASE58[0]) break;
    bytes.push(0);
  }
  return Uint8Array.from(bytes.reverse());
}
