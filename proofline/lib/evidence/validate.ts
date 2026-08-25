/**
 * Upload validation. Runs in the browser for fast feedback and again on the server,
 * because a client-side check is a convenience, not a control.
 */

export const MAX_FILE_BYTES = 25 * 1024 * 1024;
export const MAX_BATCH_FILES = 40;

export const ACCEPTED_TYPES: Record<string, { extensions: string[]; label: string }> = {
  "image/png": { extensions: [".png"], label: "PNG image" },
  "image/jpeg": { extensions: [".jpg", ".jpeg"], label: "JPEG image" },
  "image/webp": { extensions: [".webp"], label: "WebP image" },
  "application/pdf": { extensions: [".pdf"], label: "PDF" },
  "text/plain": { extensions: [".txt", ".md", ".log"], label: "Text file" },
  "message/rfc822": { extensions: [".eml"], label: "Email" },
  "audio/wav": { extensions: [".wav"], label: "Audio" },
  "audio/mpeg": { extensions: [".mp3"], label: "Audio" },
  "audio/mp4": { extensions: [".m4a", ".mp4"], label: "Audio" },
  "audio/webm": { extensions: [".webm"], label: "Audio" },
  "audio/ogg": { extensions: [".ogg", ".oga"], label: "Audio" },
};

export const ACCEPT_ATTRIBUTE = Object.entries(ACCEPTED_TYPES)
  .flatMap(([mime, { extensions }]) => [mime, ...extensions])
  .join(",");

export type ValidationFailure = { ok: false; reason: string };
export type ValidationSuccess = { ok: true; mimeType: string };

/** Extension and declared type must agree; browsers get this wrong often enough to matter. */
export function validateUpload(file: { name: string; type: string; size: number }): ValidationSuccess | ValidationFailure {
  if (file.size === 0) return { ok: false, reason: "The file is empty." };
  if (file.size > MAX_FILE_BYTES) {
    return { ok: false, reason: `Larger than the ${Math.round(MAX_FILE_BYTES / 1024 / 1024)} MB limit.` };
  }

  const lower = file.name.toLowerCase();
  const extension = lower.slice(lower.lastIndexOf("."));
  const declared = file.type === "image/jpg" ? "image/jpeg" : file.type;

  if (declared && ACCEPTED_TYPES[declared]) {
    const entry = ACCEPTED_TYPES[declared];
    if (entry.extensions.includes(extension)) return { ok: true, mimeType: declared };
    // .eml files are frequently reported as text/plain; trust the extension in that case.
    const byExtension = Object.entries(ACCEPTED_TYPES).find(([, value]) => value.extensions.includes(extension));
    if (byExtension) return { ok: true, mimeType: byExtension[0] };
    return { ok: false, reason: `${extension || "This file"} does not match its reported type (${declared}).` };
  }

  const byExtension = Object.entries(ACCEPTED_TYPES).find(([, value]) => value.extensions.includes(extension));
  if (byExtension) return { ok: true, mimeType: byExtension[0] };

  return { ok: false, reason: `${extension || file.type || "This format"} is not supported yet.` };
}

/** Magic-byte check on the server; a renamed executable should not reach storage. */
export function sniffMimeType(bytes: Uint8Array): string | null {
  const starts = (signature: number[], offset = 0) =>
    signature.every((byte, index) => bytes[offset + index] === byte);

  if (starts([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return "image/png";
  if (starts([0xff, 0xd8, 0xff])) return "image/jpeg";
  if (starts([0x52, 0x49, 0x46, 0x46]) && starts([0x57, 0x45, 0x42, 0x50], 8)) return "image/webp";
  if (starts([0x52, 0x49, 0x46, 0x46]) && starts([0x57, 0x41, 0x56, 0x45], 8)) return "audio/wav";
  if (starts([0x25, 0x50, 0x44, 0x46])) return "application/pdf";
  if (starts([0x49, 0x44, 0x33]) || (bytes[0] === 0xff && ((bytes[1] ?? 0) & 0xe0) === 0xe0)) return "audio/mpeg";
  if (starts([0x4f, 0x67, 0x67, 0x53])) return "audio/ogg";
  if (starts([0x1a, 0x45, 0xdf, 0xa3])) return "audio/webm";
  if (starts([0x66, 0x74, 0x79, 0x70], 4)) return "audio/mp4";
  return null; // text formats have no signature
}

const TEXT_TYPES = new Set(["text/plain", "message/rfc822"]);

export function serverValidate(
  declaredMime: string,
  bytes: Uint8Array,
): ValidationSuccess | ValidationFailure {
  if (!ACCEPTED_TYPES[declaredMime]) return { ok: false, reason: `${declaredMime} is not an accepted type.` };
  if (bytes.byteLength > MAX_FILE_BYTES) return { ok: false, reason: "The file exceeds the size limit." };

  const sniffed = sniffMimeType(bytes);
  if (TEXT_TYPES.has(declaredMime)) {
    if (sniffed) return { ok: false, reason: `This file claims to be text but its contents look like ${sniffed}.` };
    return { ok: true, mimeType: declaredMime };
  }
  if (!sniffed) return { ok: false, reason: "The file's contents do not match any supported format." };
  if (sniffed !== declaredMime && !(sniffed === "audio/mp4" && declaredMime === "audio/mp4")) {
    return { ok: false, reason: `This file was sent as ${declaredMime} but its contents are ${sniffed}.` };
  }
  return { ok: true, mimeType: declaredMime };
}

/** Storage keys are built by us, never taken from the filename. */
export function storagePathFor(userId: string, caseId: string, artifactId: string): string {
  return `${userId}/${caseId}/${artifactId}`;
}

export function safeFilename(name: string): string {
  return name.replace(/[/\\]/g, "_").replace(/\.{2,}/g, ".").slice(0, 200) || "artifact";
}
