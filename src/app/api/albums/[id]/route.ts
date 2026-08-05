import { NextResponse } from "next/server";
import { deleteAlbum, getAlbumDetail } from "@/lib/store";
import { deleteAlbumUploads } from "@/lib/storage";
import { deleteAlbumSchema } from "@/lib/validation";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  const { id } = await params;
  const detail = await getAlbumDetail(id);
  if (!detail) {
    return NextResponse.json({ error: "Album not found" }, { status: 404 });
  }
  return NextResponse.json(detail);
}

export async function DELETE(request: Request, { params }: Params) {
  const { id } = await params;
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = deleteAlbumSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Owner verification required" }, { status: 401 });
  }

  const removed = await deleteAlbum(id, parsed.data.ownerId);
  if (!removed) {
    return NextResponse.json({ error: "Album not found or not the owner" }, { status: 404 });
  }
  await deleteAlbumUploads(id);
  return NextResponse.json({ ok: true });
}
