import fs from "node:fs";
import path from "node:path";

/**
 * Local filesystem storage for uploaded media.
 *
 * Files land in public/uploads/<albumId>/ so Next.js serves them as static
 * assets. Swap this module for UploadThing/S3 when deploying to a serverless
 * host (see docs/architecture.md); the store layer is independent.
 */

const UPLOADS_DIR = path.join(process.cwd(), "public", "uploads");

export const MAX_IMAGE_SIZE = 25 * 1024 * 1024; // 25 MB
export const MAX_VIDEO_SIZE = 200 * 1024 * 1024; // 200 MB

const IMAGE_MIMES = new Set(["image/jpeg", "image/png", "image/gif", "image/webp", "image/heic"]);
const VIDEO_MIMES = new Set(["video/mp4", "video/quicktime", "video/webm"]);

export function isSupportedImage(mime: string): boolean {
  return IMAGE_MIMES.has(mime);
}

export function isSupportedVideo(mime: string): boolean {
  return VIDEO_MIMES.has(mime);
}

export function isSupportedType(mime: string): boolean {
  return isSupportedImage(mime) || isSupportedVideo(mime);
}

function sanitizeFileName(name: string): string {
  const base = name.replace(/\.[^/.]+$/, ""); // strip extension, we re-add it
  const clean = base.replace(/[^a-zA-Z0-9._-]/g, "-").replace(/-+/g, "-");
  return (clean || "upload").slice(0, 48);
}

function extensionFor(mime: string, originalName: string): string {
  const fromName = path.extname(originalName).toLowerCase();
  if (/^\.(jpe?g|png|gif|webp|heic|mp4|mov|webm)$/.test(fromName)) return fromName;
  const map: Record<string, string> = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/gif": ".gif",
    "image/webp": ".webp",
    "image/heic": ".heic",
    "video/mp4": ".mp4",
    "video/quicktime": ".mov",
    "video/webm": ".webm",
  };
  return map[mime] ?? ".bin";
}

export function saveUpload(
  albumId: string,
  mediaId: string,
  originalName: string,
  mime: string,
  data: Buffer,
): { fileName: string; url: string } {
  const dir = path.join(UPLOADS_DIR, albumId);
  fs.mkdirSync(dir, { recursive: true });
  const fileName = `${mediaId}-${sanitizeFileName(originalName)}${extensionFor(mime, originalName)}`;
  fs.writeFileSync(path.join(dir, fileName), data);
  return { fileName, url: `/uploads/${albumId}/${fileName}` };
}

export function deleteUpload(albumId: string, fileName: string): void {
  const filePath = path.join(UPLOADS_DIR, albumId, fileName);
  fs.rmSync(filePath, { force: true });
}

export function deleteAlbumUploads(albumId: string): void {
  fs.rmSync(path.join(UPLOADS_DIR, albumId), { recursive: true, force: true });
}
