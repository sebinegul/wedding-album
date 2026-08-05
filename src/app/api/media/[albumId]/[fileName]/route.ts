import { NextResponse } from "next/server";
import { Readable } from "node:stream";
import { getAlbum, getMediaByFileName } from "@/lib/store";
import { getUploadStream, mimeForFileName } from "@/lib/storage";

type Params = { params: Promise<{ albumId: string; fileName: string }> };

/**
 * Streams an uploaded file back to the browser. Uploads live outside public/
 * (local disk or an S3-compatible bucket), so this route is the single
 * serving point for both drivers. Files are immutable once written, so cache
 * forever.
 */
export async function GET(_request: Request, { params }: Params) {
  const { albumId, fileName } = await params;

  if (!(await getAlbum(albumId))) {
    return NextResponse.json({ error: "Album not found" }, { status: 404 });
  }
  if (!(await getMediaByFileName(albumId, fileName))) {
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }

  const found = await getUploadStream(albumId, fileName);
  if (!found) {
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }

  const headers: Record<string, string> = {
    "Content-Type": mimeForFileName(fileName),
    "Cache-Control": "public, max-age=31536000, immutable",
    "X-Content-Type-Options": "nosniff",
  };
  if (found.size !== undefined) {
    headers["Content-Length"] = String(found.size);
  }

  return new NextResponse(Readable.toWeb(found.stream) as ReadableStream, {
    headers,
  });
}
