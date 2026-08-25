import { describe, expect, it } from "vitest";
import { safeFilename, serverValidate, sniffMimeType, storagePathFor, validateUpload } from "@/lib/evidence/validate";

const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]);
const pdf = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31]);

describe("client validation", () => {
  it("accepts a png", () => {
    expect(validateUpload({ name: "shot.png", type: "image/png", size: 1000 })).toEqual({ ok: true, mimeType: "image/png" });
  });

  it("accepts an .eml the browser reported as plain text", () => {
    const result = validateUpload({ name: "mail.eml", type: "text/plain", size: 500 });
    expect(result).toEqual({ ok: true, mimeType: "message/rfc822" });
  });

  it("rejects an unsupported format", () => {
    expect(validateUpload({ name: "archive.zip", type: "application/zip", size: 100 }).ok).toBe(false);
  });

  it("rejects an empty file", () => {
    expect(validateUpload({ name: "a.png", type: "image/png", size: 0 }).ok).toBe(false);
  });

  it("rejects a file over the size limit", () => {
    const result = validateUpload({ name: "a.png", type: "image/png", size: 40 * 1024 * 1024 });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toMatch(/limit/);
  });
});

describe("server validation", () => {
  it("identifies formats by their signature", () => {
    expect(sniffMimeType(png)).toBe("image/png");
    expect(sniffMimeType(pdf)).toBe("application/pdf");
    expect(sniffMimeType(new TextEncoder().encode("hello"))).toBeNull();
  });

  it("rejects a file whose contents disagree with its declared type", () => {
    const result = serverValidate("image/png", pdf);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toMatch(/application\/pdf/);
  });

  it("rejects a binary disguised as text", () => {
    expect(serverValidate("text/plain", png).ok).toBe(false);
  });

  it("accepts genuine text", () => {
    expect(serverValidate("text/plain", new TextEncoder().encode("a support transcript")).ok).toBe(true);
  });
});

describe("storage paths", () => {
  it("builds paths from ids, never from the filename", () => {
    expect(storagePathFor("user-1", "case-1", "artifact-1")).toBe("user-1/case-1/artifact-1");
  });

  it("strips traversal attempts from display names", () => {
    const cleaned = safeFilename("../../etc/passwd");
    expect(cleaned).not.toContain("/");
    expect(cleaned).not.toContain("..");
    expect(cleaned).toBe("._._etc_passwd");
  });

  it("never returns an empty display name", () => {
    expect(safeFilename("///")).toBe("___");
    expect(safeFilename("")).toBe("artifact");
  });
});
