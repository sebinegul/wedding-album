import { NextResponse } from "next/server";
import { isAdminCode } from "@/lib/admin";

/**
 * Admin code verification for the album view's "Admin mode" unlock.
 * Checks the code without any side effects; the media delete route
 * re-validates the code on every actual delete.
 */
export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as {
    adminCode?: unknown;
  };
  const code = typeof body.adminCode === "string" ? body.adminCode : "";
  if (!isAdminCode(code)) {
    return NextResponse.json({ error: "Invalid admin code" }, { status: 403 });
  }
  return NextResponse.json({ ok: true });
}
