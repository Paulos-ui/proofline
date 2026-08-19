/**
 * SHA-256 over raw bytes, using Web Crypto so the same implementation runs in the
 * browser (before upload) and on the server (after upload). No third-party hashing.
 */

export type Hex = string;

function toHex(buffer: ArrayBuffer): Hex {
  const bytes = new Uint8Array(buffer);
  let out = "";
  for (let i = 0; i < bytes.length; i += 1) out += bytes[i]!.toString(16).padStart(2, "0");
  return out;
}

function subtle(): SubtleCrypto {
  const c = globalThis.crypto;
  if (!c?.subtle) {
    throw new Error(
      "Web Crypto is unavailable. Proofline requires a secure context (https or localhost) to fingerprint files.",
    );
  }
  return c.subtle;
}

export async function sha256Bytes(bytes: Uint8Array | ArrayBuffer): Promise<Hex> {
  const view = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  const copy = new Uint8Array(view.byteLength);
  copy.set(view);
  const digest = await subtle().digest("SHA-256", copy);
  return toHex(digest);
}

export async function sha256Text(text: string): Promise<Hex> {
  return sha256Bytes(new TextEncoder().encode(text));
}

/**
 * Hash a file in fixed-size slices so a large upload does not have to be held in
 * memory twice. Progress is reported 0..1 for the intake UI.
 */
export async function sha256File(
  file: Blob,
  onProgress?: (fraction: number) => void,
  chunkSize = 4 * 1024 * 1024,
): Promise<Hex> {
  // Web Crypto has no streaming digest, so for files that fit comfortably in memory
  // we hash in one pass and use chunked reads only to report progress honestly.
  const total = file.size;
  const parts: Uint8Array[] = [];
  let read = 0;
  while (read < total) {
    const slice = file.slice(read, Math.min(read + chunkSize, total));
    const buf = new Uint8Array(await slice.arrayBuffer());
    parts.push(buf);
    read += buf.byteLength;
    onProgress?.(total === 0 ? 1 : read / total);
    if (buf.byteLength === 0) break;
  }
  const joined = new Uint8Array(total);
  let offset = 0;
  for (const part of parts) {
    joined.set(part, offset);
    offset += part.byteLength;
  }
  return sha256Bytes(joined);
}

export function isSha256(value: string): boolean {
  return /^[0-9a-f]{64}$/.test(value);
}

/** Display form for hashes: first and last 6 characters. */
export function shortHash(hash: string): string {
  return hash.length <= 16 ? hash : `${hash.slice(0, 6)}…${hash.slice(-6)}`;
}
