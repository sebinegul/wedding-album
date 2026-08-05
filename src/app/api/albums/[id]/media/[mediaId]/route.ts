import { NextResponse } from "next/server";
import { deleteMedia, getAlbum, getMedia } from "@/lib/store";
import { deleteUpload } from "@/lib/storage";
import { emitToAlbum } from "@/lib/events";

type Params = Promise<{ id: string; mediaId: string }>;

/**
 * Remove one media item. Only the album owner or the guest who uploaded it
 * may delete it. The file is removed from disk together with the record.
 */
export async function DELETE(request: Request, { params }: { params: Params }) {
  const { id, mediaId } = await params;
  const album = await getAlbum(id);
  if (!album) {
    return NextResponse.json({ error: "Album not found" }, { status: 404 });
  }

  const item = await getMedia(id, mediaId);
  if (!item) {
    return NextResponse.json({ error: "Media not found" }, { status: 404 });
  }

  const body = (await request.json().catch(() => ({}))) as {
    guestId?: string;
    ownerId?: string;
  };
  const allowed =
    (body.ownerId && body.ownerId === album.ownerId) ||
    (body.guestId && body.guestId === item.uploadedBy);
  if (!allowed) {
    return NextResponse.json({ error: "You can only remove your own uploads" }, { status: 403 });
  }

  await deleteUpload(id, item.fileName);
  await deleteMedia(id, mediaId);
  emitToAlbum(id, "media:deleted", { mediaId });

  return NextResponse.json({ ok: true });
}
