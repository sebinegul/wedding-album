import { Readable } from "node:stream";
import { Zip, ZipPassThrough } from "fflate";
import { getAlbum, getMedia } from "@/lib/store";
import { getUploadStream } from "@/lib/storage";
import { isAdminCode } from "@/lib/admin";
import { downloadSchema } from "@/lib/validation";
import type { MediaItem } from "@/lib/types";

type Params = { params: Promise<{ id: string }> };

/**
 * POST /api/albums/[id]/download
 *
 * Streams the selected media of an album back as a ZIP archive. Only the
 * album owner (ownerId) or an admin (ADMIN_CODE) may download. Files are
 * added stored (not re-compressed): photos and videos are already
 * compressed, so deflating them would burn CPU for no size win. The archive
 * is streamed chunk by chunk, so large albums never sit in memory whole.
 */
export async function POST(request: Request, { params }: Params) {
  const { id } = await params;
  const album = await getAlbum(id);
  if (!album) {
    return NextResponseJson({ error: "Album not found" }, 404);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponseJson({ error: "Invalid JSON body" }, 400);
  }

  const parsed = downloadSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponseJson({ error: "Select at least one photo or video" }, 400);
  }
  const { mediaIds, adminCode, ownerId } = parsed.data;

  const isOwner = album.ownerId === ownerId;
  const isAdmin = isAdminCode(adminCode);
  if (!isOwner && !isAdmin) {
    return NextResponseJson({ error: "Admin code required to download" }, 403);
  }

  // Resolve the requested items; drop ids that are not in this album.
  const found = (
    await Promise.all(mediaIds.map((mediaId) => getMedia(id, mediaId)))
  ).filter((m): m is MediaItem => m !== null);

  // ZIP entry names are the original file names; de-duplicate collisions
  // (multiple guests can upload a file with the same name).
  const used = new Map<string, number>();
  const entries = found.map((item) => {
    const base = item.originalName || item.fileName;
    const count = used.get(base) ?? 0;
    used.set(base, count + 1);
    const name =
      count === 0
        ? base
        : base.replace(/(\.[^.]*)?$/, ` (${count + 1})$1`);
    return { item, name };
  });

  const filename = `${slugify(album.title)}-${album.id}.zip`;

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const zip = new Zip((err, chunk, final) => {
        if (err) {
          controller.error(err);
          return;
        }
        if (chunk) controller.enqueue(chunk);
        if (final) controller.close();
      });

      (async () => {
        for (const { item, name } of entries) {
          const foundStream = await getUploadStream(id, item.fileName);
          if (!foundStream) continue; // file missing on disk; skip silently
          const buffer = await streamToBuffer(foundStream.stream);
          // add() first: it registers the entry's stream handler, then push
          // the file data through it (fflate errors otherwise).
          const entry = new ZipPassThrough(name);
          zip.add(entry);
          entry.push(new Uint8Array(buffer), true);
        }
        zip.end();
      })().catch((err) => controller.error(err));
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${filename}"; filename*=UTF-8''${encodeURIComponent(filename)}`,
      "Cache-Control": "no-store",
    },
  });
}

function NextResponseJson(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function slugify(text: string): string {
  const slug = text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || "album";
}

function streamToBuffer(stream: Readable): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    stream.on("data", (c: Buffer) => chunks.push(c));
    stream.on("end", () => resolve(Buffer.concat(chunks)));
    stream.on("error", reject);
  });
}
