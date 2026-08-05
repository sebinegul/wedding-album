import { NextResponse } from "next/server";
import { addGuest, getAlbum } from "@/lib/store";
import { guestSchema } from "@/lib/validation";
import { emitToAlbum } from "@/lib/events";

type Params = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Params) {
  const { id } = await params;
  const album = getAlbum(id);
  if (!album) {
    return NextResponse.json({ error: "Album not found" }, { status: 404 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = guestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid name" },
      { status: 400 },
    );
  }

  const guest = addGuest(id, parsed.data.name);
  emitToAlbum(id, "guest:joined", { guest });
  return NextResponse.json({ guest });
}
