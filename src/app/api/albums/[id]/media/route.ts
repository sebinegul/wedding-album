import { NextResponse } from "next/server";
import {
  addGuest,
  addMedia,
  getAlbum,
  getMedia,
  deleteMedia,
} from "@/lib/store";
import {
  deleteUpload,
  isSupportedType,
  MAX_IMAGE_SIZE,
  MAX_VIDEO_SIZE,
  saveUpload,
} from "@/lib/storage";
import { dimsSchema } from "@/lib/validation";
import { emitToAlbum } from "@/lib/events";

type Params = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Params) {
  const { id } = await params;
  const album = await getAlbum(id);
  if (!album) {
    return NextResponse.json({ error: "Album not found" }, { status: 404 });
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "Expected multipart form data" }, { status: 400 });
  }

  const guestName = String(formData.get("guestName") ?? "").trim();
  if (!guestName) {
    return NextResponse.json({ error: "Your name is required to upload" }, { status: 400 });
  }

  const rawDims = formData.get("dims");
  const dimsResult = dimsSchema.safeParse(
    rawDims ? JSON.parse(String(rawDims)) : undefined,
  );
  const dimsByName = new Map<string, { width: number; height: number }>();
  if (rawDims && dimsResult.success) {
    for (const entry of dimsResult.data ?? []) {
      dimsByName.set(entry.name, entry);
    }
  }

  const files = formData.getAll("files").filter((f): f is File => f instanceof File);
  if (files.length === 0) {
    return NextResponse.json({ error: "No files selected" }, { status: 400 });
  }

  const guest = await addGuest(id, guestName);
  const uploaded: Awaited<ReturnType<typeof addMedia>>[] = [];
  const errors: string[] = [];

  for (const file of files) {
    if (!isSupportedType(file.type)) {
      errors.push(`${file.name}: unsupported file type`);
      continue;
    }
    const isImage = file.type.startsWith("image/");
    const limit = isImage ? MAX_IMAGE_SIZE : MAX_VIDEO_SIZE;
    if (file.size > limit) {
      errors.push(
        `${file.name}: exceeds ${Math.round(limit / (1024 * 1024))} MB limit`,
      );
      continue;
    }
    if (file.size === 0) {
      errors.push(`${file.name}: file is empty`);
      continue;
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const { fileName, url } = await saveUpload(id, `up-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, file.name, file.type, buffer);

    const dims = dimsByName.get(file.name);
    const media = await addMedia(id, {
      url,
      fileName,
      originalName: file.name,
      kind: isImage ? "image" : "video",
      mimeType: file.type,
      size: file.size,
      width: dims?.width,
      height: dims?.height,
      uploadedBy: guest.id,
      uploadedByName: guest.name,
    });
    uploaded.push(media);
    emitToAlbum(id, "media:new", { media });
  }

  return NextResponse.json({
    media: uploaded,
    errors,
    message:
      errors.length === 0
        ? `${uploaded.length} file(s) added to the album`
        : `${uploaded.length} uploaded, ${errors.length} skipped`,
  });
}

export async function DELETE(request: Request, { params }: Params) {
  const { id } = await params;
  const album = await getAlbum(id);
  if (!album) {
    return NextResponse.json({ error: "Album not found" }, { status: 404 });
  }

  const { searchParams } = new URL(request.url);
  const mediaId = searchParams.get("mediaId");
  if (!mediaId) {
    return NextResponse.json({ error: "mediaId is required" }, { status: 400 });
  }

  const media = await getMedia(id, mediaId);
  if (!media) {
    return NextResponse.json({ error: "Media not found" }, { status: 404 });
  }

  const ownerId = searchParams.get("ownerId");
  const guestId = searchParams.get("guestId");
  const isOwner = album.ownerId === ownerId;
  const isUploader = media.uploadedBy === guestId;
  if (!isOwner && !isUploader) {
    return NextResponse.json(
      { error: "Only the album owner or the uploader can remove this" },
      { status: 403 },
    );
  }

  const removed = await deleteMedia(id, mediaId);
  if (removed) {
    await deleteUpload(id, removed.fileName);
    emitToAlbum(id, "media:deleted", { mediaId });
  }
  return NextResponse.json({ ok: true });
}
