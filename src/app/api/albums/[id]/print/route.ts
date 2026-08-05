import { NextResponse } from "next/server";
import { getAlbum } from "@/lib/store";
import {
  buildAlbumPrintPdf,
  PRINT_FORMATS,
  type PrintFormat,
} from "@/lib/print/templates";

type Params = { params: Promise<{ id: string }> };

/**
 * Print-ready PDF download: A6 table card or A4 poster with the album QR
 * code. The QR points at the public /join/<id> page, matching the on-screen
 * share code. Vector PDF with bleed and crop marks, safe for a print shop.
 */
export async function GET(request: Request, { params }: Params) {
  const { id } = await params;
  const album = await getAlbum(id);
  if (!album) {
    return NextResponse.json({ error: "Album not found" }, { status: 404 });
  }

  const { searchParams } = new URL(request.url);
  const format: PrintFormat = searchParams.get("format") === "a4" ? "a4" : "a6";
  if (!PRINT_FORMATS.includes(format)) {
    return NextResponse.json({ error: "Unknown print format" }, { status: 400 });
  }

  const origin = new URL(request.url).origin;
  const joinUrl = `${origin}/join/${id}`;

  const pdf = await buildAlbumPrintPdf({ album, joinUrl, format });
  const bytes = new Uint8Array(pdf); // fresh ArrayBuffer-backed copy for Blob

  return new NextResponse(new Blob([bytes]), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="wedding-album-${format}.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}
