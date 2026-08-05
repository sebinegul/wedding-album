import { NextResponse } from "next/server";
import { createAlbumSchema } from "@/lib/validation";
import { createAlbum, listAlbumsByIds } from "@/lib/store";
import { isAdminCode } from "@/lib/admin";

const ID_RE = /^[A-Za-z0-9]{4,12}$/;
const MAX_IDS = 50;

/**
 * Albums are private-by-id: the server never lists albums it was not
 * explicitly asked about. Callers pass ?ids=a,b,c (album ids they already
 * know from creating or joining an album) and get exactly those back.
 * No ids param means an empty list, never a public directory.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const idsParam = searchParams.get("ids");
  const ids = idsParam
    ? [
        ...new Set(
          idsParam
            .split(",")
            .map((s) => s.trim())
            .filter((s) => ID_RE.test(s)),
        ),
      ].slice(0, MAX_IDS)
    : [];
  const albums = await listAlbumsByIds(ids);
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

  if (!isAdminCode(parsed.data.adminCode)) {
    return NextResponse.json(
      { error: "An admin code is required to create an album" },
      { status: 403 },
    );
  }

  const album = await createAlbum(parsed.data);
  return NextResponse.json({ album }, { status: 201 });
}
