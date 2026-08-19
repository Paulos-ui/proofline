/** Short human reference for a case, e.g. PL-84F2. Collisions are handled by the caller. */
export function generateCaseRef(): string {
  const alphabet = "0123456789ABCDEF";
  const bytes = new Uint8Array(2);
  globalThis.crypto.getRandomValues(bytes);
  const suffix = [...bytes].map((b) => `${alphabet[b >> 4]}${alphabet[b & 15]}`).join("");
  return `PL-${suffix}`;
}
