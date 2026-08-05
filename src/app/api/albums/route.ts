import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { createAlbumSchema } from "@/lib/validation";
import { createAlbum, listAlbumsByIds } from "@/lib/store";

const ID_RE = /^[A-Za-z0-9]{4,12}$/;
const MAX_IDS = 50;

/**
 * Constant-time string comparison so a timing side channel cannot be used
 * to probe the admin code character by character.
 */
function safeEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ba.length !== bb.length) return false;
  return timingSafeEqual(ba, bb);
}

/**
 * Album creation is admin-only. The gate is the ADMIN_CODE env var: when it
 * is set, every POST must include the matching code (checked here, on the
 * server). When it is NOT set (local dev without the var), creation stays
 * open so the app remains usable before env wiring.
 */
function requireAdminCode(body: { adminCode?: string }): string | null {
  const expected = process.env.ADMIN_CODE;
  if (!expected) return null; // open mode (no ADMIN_CODE configured)
  if (!body.adminCode || !safeEqual(body.adminCode, expected)) {
    return "An admin code is required to create an album";
  }
  return null;
}

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

  const denied = requireAdminCode(parsed.data);
  if (denied) {
    return NextResponse.json({ error: denied }, { status: 403 });
  }

  const album = await createAlbum(parsed.data);
  return NextResponse.json({ album }, { status: 201 });
}
