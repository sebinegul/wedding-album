import { readFile } from "node:fs/promises";
import path from "node:path";
import { PDFDocument, PDFFont, PDFPage, rgb, type RGB } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import QRCode from "qrcode";
import type { Album } from "@/lib/types";

/**
 * Print-ready album templates (A6 table card + A4 poster).
 *
 * True vector PDFs at print specs: 3 mm bleed, crop marks, exact trim sizes
 * (A6 105x148 mm, A4 210x297 mm). Every element is drawn with vector
 * primitives, so the QR code and type stay sharp at any print resolution.
 * Fonts are vendored under src/lib/print/fonts (SIL OFL, from Google Fonts).
 */

export type PrintFormat = "a6" | "a4";
export const PRINT_FORMATS = ["a6", "a4"] as const;

export const PRINT_LABELS: Record<PrintFormat, string> = {
  a6: "A6 table card",
  a4: "A4 poster",
};

const PT_PER_MM = 2.8346456693;
const BLEED_MM = 3;
const TRIM: Record<PrintFormat, { wMm: number; hMm: number }> = {
  a6: { wMm: 105, hMm: 148 },
  a4: { wMm: 210, hMm: 297 },
};
const SCALE: Record<PrintFormat, number> = { a6: 1, a4: 2 };

// Brand palette, mirrored from the app (stone + rose).
const PAPER: RGB = rgb(0.98, 0.98, 0.976); // stone-50 #fafaf9
const INK: RGB = rgb(0.11, 0.098, 0.09); // stone-900 #1c1917
const ACCENT: RGB = rgb(0.882, 0.114, 0.282); // rose-600 #e11d48
const MUTED: RGB = rgb(0.471, 0.443, 0.424); // stone-500 #78716c
const FAINT: RGB = rgb(0.659, 0.635, 0.619); // stone-400 #a8a29e
const WHITE: RGB = rgb(1, 1, 1);

const FONT_DIR = path.join(process.cwd(), "src/lib/print/fonts");
const FONT_FILES = {
  script: "GreatVibes-Regular.ttf",
  body: "Inter-Regular.ttf",
  label: "Inter-SemiBold.ttf",
} as const;

const fontCache = new Map<string, Promise<Uint8Array>>();
function loadFont(name: string): Promise<Uint8Array> {
  let p = fontCache.get(name);
  if (!p) {
    p = readFile(path.join(FONT_DIR, name)).then((b) => new Uint8Array(b));
    fontCache.set(name, p);
  }
  return p;
}

const mm = (v: number) => v * PT_PER_MM;

/** Approximate ascent fraction per font for baseline placement. */
const ASCENT = { script: 0.82, body: 0.79, label: 0.79 };

function textWidth(font: PDFFont, text: string, size: number, tracking = 0) {
  if (tracking === 0) return font.widthOfTextAtSize(text, size);
  let w = 0;
  for (const ch of text) w += font.widthOfTextAtSize(ch, size);
  return w + tracking * (text.length - 1);
}

/** Draw uppercase text with letterspacing, centered on cx. */
function drawTrackedCentered(
  page: PDFPage,
  font: PDFFont,
  text: string,
  size: number,
  tracking: number,
  color: RGB,
  cx: number,
  baselineY: number,
) {
  const w = textWidth(font, text, size, tracking);
  let x = cx - w / 2;
  for (const ch of text) {
    page.drawText(ch, { x, y: baselineY, size, font, color });
    x += font.widthOfTextAtSize(ch, size) + tracking;
  }
}

function wrapText(font: PDFFont, text: string, size: number, maxWidth: number): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (font.widthOfTextAtSize(candidate, size) > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = candidate;
    }
  }
  if (line) lines.push(line);
  return lines;
}

/** Draw the QR code as vector modules (crisp at any DPI). */
function drawQr(
  page: PDFPage,
  url: string,
  box: { x: number; y: number; size: number },
  color: RGB,
) {
  const qr = QRCode.create(url, { errorCorrectionLevel: "M" });
  const n = qr.modules.size;
  const cell = box.size / n;
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      if (qr.modules.data[r * n + c] === 1) {
        page.drawRectangle({
          x: box.x + c * cell,
          // pdf-lib y is bottom-up; row r is measured from the box top
          y: box.y + box.size - (r + 1) * cell,
          width: cell + 0.05, // nudge to close hairline gaps between modules
          height: cell + 0.05,
          color,
        });
      }
    }
  }
}

function drawCropMarks(page: PDFPage, trim: { x: number; y: number; w: number; h: number }) {
  const { x, y, w, h } = trim; // y is the TOP edge (bottom-up coords)
  const L = 8;
  const style = { thickness: 0.5, color: FAINT };
  // top corners
  page.drawLine({ start: { x, y }, end: { x, y: y + L }, ...style });
  page.drawLine({ start: { x, y }, end: { x: x + L, y }, ...style });
  page.drawLine({ start: { x: x + w, y }, end: { x: x + w, y: y + L }, ...style });
  page.drawLine({ start: { x: x + w, y }, end: { x: x + w - L, y }, ...style });
  // bottom corners
  const by = y - h;
  page.drawLine({ start: { x, y: by }, end: { x, y: by - L }, ...style });
  page.drawLine({ start: { x, y: by }, end: { x: x + L, y: by }, ...style });
  page.drawLine({ start: { x: x + w, y: by }, end: { x: x + w, y: by - L }, ...style });
  page.drawLine({ start: { x: x + w, y: by }, end: { x: x + w - L, y: by }, ...style });
}

/** SVG path for a rounded rectangle (y-down coordinates, origin at top-left). */
function roundedRectPath(w: number, h: number, r: number): string {
  const rad = Math.min(r, w / 2, h / 2);
  return [
    `M ${rad} 0`,
    `H ${w - rad}`,
    `Q ${w} 0 ${w} ${rad}`,
    `V ${h - rad}`,
    `Q ${w} ${h} ${w - rad} ${h}`,
    `H ${rad}`,
    `Q 0 ${h} 0 ${h - rad}`,
    `V ${rad}`,
    `Q 0 0 ${rad} 0`,
    "Z",
  ].join(" ");
}

export async function buildAlbumPrintPdf({
  album,
  joinUrl,
  format,
}: {
  album: Album;
  joinUrl: string;
  format: PrintFormat;
}): Promise<Uint8Array> {
  const s = SCALE[format];
  const { wMm, hMm } = TRIM[format];

  const doc = await PDFDocument.create();
  // Custom TTF embedding (and subsetting) requires pdf-lib's fontkit companion.
  doc.registerFontkit(fontkit);
  const [script, body, label] = await Promise.all([
    doc.embedFont(await loadFont(FONT_FILES.script), { subset: true }),
    doc.embedFont(await loadFont(FONT_FILES.body), { subset: true }),
    doc.embedFont(await loadFont(FONT_FILES.label), { subset: true }),
  ]);

  const trimW = mm(wMm);
  const trimH = mm(hMm);
  const bleed = mm(BLEED_MM);
  const pageW = trimW + bleed * 2;
  const pageH = trimH + bleed * 2;

  const page = doc.addPage([pageW, pageH]);
  page.drawRectangle({ x: 0, y: 0, width: pageW, height: pageH, color: PAPER });

  const trim = { x: bleed, y: pageH - bleed, w: trimW, h: trimH };

  // Inner hairline frame (rose, subtle).
  const frameInset = mm(12 * s);
  page.drawRectangle({
    x: trim.x + frameInset,
    y: trim.y - frameInset - (trimH - frameInset * 2),
    width: trimW - frameInset * 2,
    height: trimH - frameInset * 2,
    borderColor: ACCENT,
    borderWidth: 0.6,
    opacity: 0.35,
  });

  const cx = trim.x + trimW / 2; // horizontal center of trim
  const top = (m: number) => trim.y - mm(m * s); // y of a point m mm below trim top

  // Kicker
  const kickerSize = 7 * s;
  drawTrackedCentered(
    page,
    label,
    "SCAN TO ADD YOUR PHOTOS",
    kickerSize,
    1.4 * s,
    ACCENT,
    cx,
    top(21) - kickerSize * ASCENT.label,
  );

  // Couple names in Great Vibes, auto-fit to the card width.
  let namesSize = 40 * s;
  const namesMaxWidth = mm(88 * s);
  while (
    namesSize > 14 * s &&
    textWidth(script, album.couple, namesSize) > namesMaxWidth
  ) {
    namesSize -= 0.5 * s;
  }
  const namesBaseline = top(30) - namesSize * ASCENT.script;
  page.drawText(album.couple, {
    x: cx - textWidth(script, album.couple, namesSize) / 2,
    y: namesBaseline,
    size: namesSize,
    font: script,
    color: INK,
  });

  // Rose rule under the names
  const ruleWidth = mm(30 * s);
  const ruleY = top(46) - mm(0.75 * s);
  page.drawLine({
    start: { x: cx - ruleWidth / 2, y: ruleY },
    end: { x: cx + ruleWidth / 2, y: ruleY },
    thickness: 1.1 * s,
    color: ACCENT,
  });

  // QR code in a white rounded box
  const qrSize = mm(56 * s);
  const boxPad = mm(6 * s);
  const boxTop = top(54);
  const boxW = qrSize + boxPad * 2;
  const boxH = qrSize + boxPad * 2;
  page.drawSvgPath(roundedRectPath(boxW, boxH, mm(3 * s)), {
    x: cx - boxW / 2,
    y: boxTop - boxH,
    color: WHITE,
    borderColor: rgb(0.902, 0.894, 0.878), // stone-200
    borderWidth: 0.8,
  });
  drawQr(page, joinUrl, { x: cx - qrSize / 2, y: boxTop - qrSize, size: qrSize }, INK);

  // Instruction (max 2 lines, wrapped)
  const instrSize = 8.5 * s;
  const instrLineH = 12 * s;
  const instrMaxWidth = mm(82 * s);
  const instrLines = wrapText(body, "Scan with your phone camera to open our album, then add your photos and videos.", instrSize, instrMaxWidth).slice(0, 2);
  let instrBaseline = top(54 + 56 + 8) - instrSize * ASCENT.body;
  for (const line of instrLines) {
    page.drawText(line, {
      x: cx - textWidth(body, line, instrSize) / 2,
      y: instrBaseline,
      size: instrSize,
      font: body,
      color: MUTED,
    });
    instrBaseline -= instrLineH;
  }

  // Footer: album title, letterspaced caps
  const footerSize = 6.5 * s;
  drawTrackedCentered(
    page,
    label,
    album.title.toUpperCase(),
    footerSize,
    1.1 * s,
    FAINT,
    cx,
    top(141) - footerSize * ASCENT.label,
  );

  drawCropMarks(page, trim);

  return doc.save();
}
