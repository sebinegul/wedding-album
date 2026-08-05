import { NextResponse } from "next/server";
import { createAlbumSchema } from "@/lib/validation";
import { createAlbum, listAlbums } from "@/lib/store";

export async function GET() {
  const albums = listAlbums(12);
  return NextResponse.json({ albums });
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = createAlbumSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 },
    );
  }

  const album = createAlbum(parsed.data);
  return NextResponse.json({ album }, { status: 201 });
}
