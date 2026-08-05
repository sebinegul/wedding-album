import fs from "node:fs";
import path from "node:path";
import type { Readable } from "node:stream";
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  ListObjectsV2Command,
  DeleteObjectsCommand,
} from "@aws-sdk/client-s3";

/**
 * Media storage with two interchangeable drivers, selected by environment:
 *
 *  - STORAGE_DRIVER=s3 (or S3_BUCKET set) -> any S3-compatible bucket:
 *    Cloudflare R2, Backblaze B2, AWS S3, MinIO. Objects are stored under
 *    <albumId>/<fileName> and streamed back through GET /api/media.
 *  - Default -> local disk under data/uploads/<albumId>/ (outside public/,
 *    so uploads never enter the build). Works in dev and `next start`.
 *
 * Files are immutable once written, so the serving route caches forever.
 */

const UPLOADS_DIR = path.join(process.cwd(), "data", "uploads");

/** Vercel serverless functions run on a read-only filesystem (process.env.VERCEL === "1"). */
const IS_VERCEL = process.env.VERCEL === "1";

const DRIVER =
  (process.env.STORAGE_DRIVER ?? (process.env.S3_BUCKET ? "s3" : "local")).toLowerCase() ===
  "s3"
    ? "s3"
    : "local";

export const storageDriver: "local" | "s3" = DRIVER;

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

function localPath(albumId: string, fileName: string): string {
  return path.join(UPLOADS_DIR, albumId, fileName);
}

// ---------------------------------------------------------------------------
// S3-compatible driver (Cloudflare R2 / Backblaze B2 / AWS S3 / MinIO)
// ---------------------------------------------------------------------------

let s3: S3Client | null = null;

function s3Client(): S3Client {
  if (!s3) {
    if (!process.env.S3_ACCESS_KEY_ID || !process.env.S3_SECRET_ACCESS_KEY || !process.env.S3_BUCKET) {
      throw new Error(
        "S3 storage requires S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY and S3_BUCKET",
      );
    }
    s3 = new S3Client({
      region: process.env.S3_REGION || "auto",
      endpoint: process.env.S3_ENDPOINT || undefined,
      credentials: {
        accessKeyId: process.env.S3_ACCESS_KEY_ID,
        secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
      },
    });
  }
  return s3;
}

const BUCKET = process.env.S3_BUCKET ?? "";

function s3Key(albumId: string, fileName: string): string {
  return `${albumId}/${fileName}`;
}

async function s3DeleteAlbum(albumId: string): Promise<void> {
  const client = s3Client();
  let token: string | undefined;
  do {
    const listed = await client.send(
      new ListObjectsV2Command({
        Bucket: BUCKET,
        Prefix: `${albumId}/`,
        ContinuationToken: token,
      }),
    );
    const keys = (listed.Contents ?? [])
      .map((o) => o.Key)
      .filter((k): k is string => Boolean(k));
    if (keys.length > 0) {
      await client.send(
        new DeleteObjectsCommand({
          Bucket: BUCKET,
          Delete: { Objects: keys.map((Key) => ({ Key })) },
        }),
      );
    }
    token = listed.IsTruncated ? listed.NextContinuationToken : undefined;
  } while (token);
}

// ---------------------------------------------------------------------------
// Storage API (async, driver-agnostic)
// ---------------------------------------------------------------------------

export async function saveUpload(
  albumId: string,
  mediaId: string,
  originalName: string,
  mime: string,
  data: Buffer,
): Promise<{ fileName: string; url: string }> {
  const fileName = `${mediaId}-${sanitizeFileName(originalName)}${extensionFor(mime, originalName)}`;
  if (DRIVER === "s3") {
    await s3Client().send(
      new PutObjectCommand({
        Bucket: BUCKET,
        Key: s3Key(albumId, fileName),
        Body: data,
        ContentType: mime,
      }),
    );
  } else {
    if (IS_VERCEL) {
      throw new Error(
        "Media storage is not configured for this deployment. Add S3_BUCKET, S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY and S3_ENDPOINT (for R2) as Vercel environment variables (or set STORAGE_DRIVER=s3).",
      );
    }
    const dir = path.join(UPLOADS_DIR, albumId);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(localPath(albumId, fileName), data);
  }
  return { fileName, url: `/api/media/${albumId}/${fileName}` };
}

export async function deleteUpload(albumId: string, fileName: string): Promise<void> {
  if (DRIVER === "s3") {
    try {
      await s3Client().send(
        new DeleteObjectCommand({ Bucket: BUCKET, Key: s3Key(albumId, fileName) }),
      );
    } catch {
      // delete is idempotent; missing objects are not an error
    }
  } else {
    fs.rmSync(localPath(albumId, fileName), { force: true });
  }
}

export async function deleteAlbumUploads(albumId: string): Promise<void> {
  if (DRIVER === "s3") {
    await s3DeleteAlbum(albumId);
  } else {
    fs.rmSync(path.join(UPLOADS_DIR, albumId), { recursive: true, force: true });
  }
}

export async function getUploadStream(
  albumId: string,
  fileName: string,
): Promise<{ stream: Readable; size?: number } | null> {
  if (DRIVER === "s3") {
    try {
      const res = await s3Client().send(
        new GetObjectCommand({ Bucket: BUCKET, Key: s3Key(albumId, fileName) }),
      );
      if (!res.Body) return null;
      return {
        stream: res.Body as Readable,
        size: res.ContentLength ?? undefined,
      };
    } catch {
      return null;
    }
  }
  const filePath = localPath(albumId, fileName);
  if (!fs.existsSync(filePath)) return null;
  return {
    stream: fs.createReadStream(filePath),
    size: fs.statSync(filePath).size,
  };
}

const MIME_BY_EXT: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".heic": "image/heic",
  ".mp4": "video/mp4",
  ".mov": "video/quicktime",
  ".webm": "video/webm",
};

export function mimeForFileName(fileName: string): string {
  return MIME_BY_EXT[path.extname(fileName).toLowerCase()] ?? "application/octet-stream";
}
