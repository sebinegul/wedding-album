import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import type { Album, AlbumDetail, Guest, MediaItem } from "./types";

/**
 * File-backed JSON datastore.
 *
 * Zero-configuration persistence that works anywhere the process can write
 * to disk. The store surface is deliberately small so it can be swapped for
 * Prisma + Neon (see docs/architecture.md) without touching callers.
 */

type DbShape = {
  albums: Album[];
  guests: Guest[];
  media: MediaItem[];
};

const DATA_DIR = path.join(process.cwd(), "data");
const DB_FILE = path.join(DATA_DIR, "db.json");

const EMPTY_DB: DbShape = { albums: [], guests: [], media: [] };

function readDb(): DbShape {
  try {
    const raw = fs.readFileSync(DB_FILE, "utf-8");
    const parsed = JSON.parse(raw) as Partial<DbShape>;
    return {
      albums: Array.isArray(parsed.albums) ? parsed.albums : [],
      guests: Array.isArray(parsed.guests) ? parsed.guests : [],
      media: Array.isArray(parsed.media) ? parsed.media : [],
    };
  } catch {
    return EMPTY_DB;
  }
}

function writeDb(db: DbShape): void {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  const tmp = `${DB_FILE}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(db, null, 2), "utf-8");
  fs.renameSync(tmp, DB_FILE);
}

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";

export function genId(length = 8): string {
  const bytes = crypto.randomBytes(length);
  let id = "";
  for (let i = 0; i < length; i++) {
    id += ALPHABET[bytes[i] % ALPHABET.length];
  }
  return id;
}

export function createAlbum(input: {
  title: string;
  couple: string;
  ownerName: string;
}): Album {
  const db = readDb();
  const album: Album = {
    id: genId(),
    title: input.title,
    couple: input.couple,
    ownerName: input.ownerName,
    ownerId: genId(12),
    createdAt: new Date().toISOString(),
  };
  db.albums.push(album);
  writeDb(db);
  return album;
}

export function getAlbum(id: string): Album | null {
  return readDb().albums.find((a) => a.id === id) ?? null;
}

export function listAlbums(limit = 12): Album[] {
  return readDb()
    .albums.slice()
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, limit);
}

export function getAlbumDetail(id: string): AlbumDetail | null {
  const db = readDb();
  const album = db.albums.find((a) => a.id === id);
  if (!album) return null;
  const media = db.media
    .filter((m) => m.albumId === id)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const guests = db.guests.filter((g) => g.albumId === id);
  return { album, media, guests };
}

export function addGuest(albumId: string, name: string): Guest {
  const db = readDb();
  const existing = db.guests.find(
    (g) => g.albumId === albumId && g.name.toLowerCase() === name.toLowerCase(),
  );
  if (existing) return existing;
  const guest: Guest = {
    id: genId(12),
    albumId,
    name,
    createdAt: new Date().toISOString(),
  };
  db.guests.push(guest);
  writeDb(db);
  return guest;
}

export function addMedia(
  albumId: string,
  input: {
    url: string;
    fileName: string;
    originalName: string;
    kind: MediaItem["kind"];
    mimeType: string;
    size: number;
    width?: number;
    height?: number;
    uploadedBy: string;
    uploadedByName: string;
  },
): MediaItem {
  const db = readDb();
  const media: MediaItem = {
    id: genId(12),
    albumId,
    createdAt: new Date().toISOString(),
    ...input,
  };
  db.media.push(media);
  writeDb(db);
  return media;
}

export function getMedia(albumId: string, mediaId: string): MediaItem | null {
  return readDb().media.find((m) => m.albumId === albumId && m.id === mediaId) ?? null;
}

export function deleteMedia(albumId: string, mediaId: string): MediaItem | null {
  const db = readDb();
  const index = db.media.findIndex((m) => m.albumId === albumId && m.id === mediaId);
  if (index === -1) return null;
  const [removed] = db.media.splice(index, 1);
  writeDb(db);
  return removed;
}

export function deleteAlbum(id: string, ownerId: string): Album | null {
  const db = readDb();
  const index = db.albums.findIndex((a) => a.id === id);
  if (index === -1) return null;
  const album = db.albums[index];
  if (album.ownerId !== ownerId) return null;
  db.albums.splice(index, 1);
  db.media = db.media.filter((m) => m.albumId !== id);
  db.guests = db.guests.filter((g) => g.albumId !== id);
  writeDb(db);
  return album;
}
