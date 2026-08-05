import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { MongoClient, type Db, type Collection } from "mongodb";
import type { Album, AlbumDetail, Guest, MediaItem } from "./types";

/**
 * Datastore with two interchangeable backends, selected by environment:
 *
 *  - MONGODB_URI set  -> MongoDB Atlas (or any MongoDB server). The app
 *    connects lazily on first use and indexes itself on first connect.
 *  - MONGODB_URI unset -> zero-config file-backed JSON store (data/db.json)
 *    that works anywhere the process can write to disk.
 *
 * Every exported function is async so callers never care which backend is
 * active. Documents in MongoDB mirror the JSON store shape exactly: a plain
 * `id` string (no reliance on Mongo _id), ISO `createdAt` strings, and the
 * same sorting semantics, so the two backends behave identically.
 */

type DbShape = {
  albums: Album[];
  guests: Guest[];
  media: MediaItem[];
};

const DATA_DIR = path.join(process.cwd(), "data");
const DB_FILE = path.join(DATA_DIR, "db.json");

const EMPTY_DB: DbShape = { albums: [], guests: [], media: [] };

const MONGODB_URI = process.env.MONGODB_URI?.trim();
const USE_MONGO = Boolean(MONGODB_URI);

// ---------------------------------------------------------------------------
// MongoDB backend
// ---------------------------------------------------------------------------

const PROJECT = { projection: { _id: 0 } } as const;

let mongoDb: Db | null = null;
let mongoInit: Promise<Db> | null = null;

async function ensureIndexes(db: Db): Promise<void> {
  await db.collection("albums").createIndex({ id: 1 }, { unique: true });
  await db.collection("guests").createIndex({ id: 1 }, { unique: true });
  await db.collection("guests").createIndex({ albumId: 1 });
  await db.collection("media").createIndex({ id: 1 }, { unique: true });
  await db.collection("media").createIndex({ albumId: 1 });
  await db.collection("media").createIndex({ fileName: 1 });
}

async function mongo(): Promise<Db> {
  if (mongoDb) return mongoDb;
  if (!MONGODB_URI) {
    throw new Error("MONGODB_URI is not set; cannot use the MongoDB backend");
  }
  if (!mongoInit) {
    mongoInit = (async () => {
      const dbName =
        new URL(MONGODB_URI).pathname.replace(/^\//, "").replace(/\/.*$/, "") ||
        "wedding-album";
      const client = new MongoClient(MONGODB_URI, {
        serverSelectionTimeoutMS: 5000,
      });
      await client.connect();
      const db = client.db(dbName);
      mongoDb = db;
      await ensureIndexes(db);
      return db;
    })().catch((err) => {
      mongoInit = null;
      throw err;
    });
  }
  return mongoInit;
}

function albums(db: Db): Collection {
  return db.collection("albums");
}
function guests(db: Db): Collection {
  return db.collection("guests");
}
function media(db: Db): Collection {
  return db.collection("media");
}

// ---------------------------------------------------------------------------
// JSON file backend
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";

export function genId(length = 8): string {
  const bytes = crypto.randomBytes(length);
  let id = "";
  for (let i = 0; i < length; i++) {
    id += ALPHABET[bytes[i] % ALPHABET.length];
  }
  return id;
}

// ---------------------------------------------------------------------------
// Store API (async, backend-agnostic)
// ---------------------------------------------------------------------------

export async function createAlbum(input: {
  title: string;
  couple: string;
  ownerName: string;
}): Promise<Album> {
  const album: Album = {
    id: genId(),
    title: input.title,
    couple: input.couple,
    ownerName: input.ownerName,
    ownerId: genId(12),
    createdAt: new Date().toISOString(),
  };
  if (USE_MONGO) {
    await albums(await mongo()).insertOne(album);
  } else {
    const db = readDb();
    db.albums.push(album);
    writeDb(db);
  }
  return album;
}

export async function getAlbum(id: string): Promise<Album | null> {
  if (USE_MONGO) {
    const doc = await albums(await mongo()).findOne({ id }, PROJECT);
    return (doc as unknown as Album | null) ?? null;
  }
  return readDb().albums.find((a) => a.id === id) ?? null;
}

export async function listAlbums(limit = 12): Promise<Album[]> {
  if (USE_MONGO) {
    const docs = await albums(await mongo())
      .find({}, PROJECT)
      .sort({ createdAt: -1 })
      .limit(limit)
      .toArray();
    return docs as unknown as Album[];
  }
  return readDb()
    .albums.slice()
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, limit);
}

/**
 * Returns exactly the albums whose ids are passed in, newest first.
 * Used by the "Your albums" rail: the client proves knowledge of an id
 * (it was created/joined by this browser), and the server never lists
 * albums it was not asked about. Empty input returns an empty list.
 */
export async function listAlbumsByIds(ids: string[]): Promise<Album[]> {
  if (ids.length === 0) return [];
  if (USE_MONGO) {
    const docs = await albums(await mongo())
      .find({ id: { $in: ids } }, PROJECT)
      .sort({ createdAt: -1 })
      .toArray();
    return docs as unknown as Album[];
  }
  return readDb()
    .albums
    .filter((a) => ids.includes(a.id))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function getAlbumDetail(id: string): Promise<AlbumDetail | null> {
  if (USE_MONGO) {
    const db = await mongo();
    const album = (await albums(db).findOne({ id }, PROJECT)) as unknown as Album | null;
    if (!album) return null;
    const mediaItems = (await media(db)
      .find({ albumId: id }, PROJECT)
      .sort({ createdAt: -1 })
      .toArray()) as unknown as MediaItem[];
    const guestList = (await guests(db)
      .find({ albumId: id }, PROJECT)
      .toArray()) as unknown as Guest[];
    return { album, media: mediaItems, guests: guestList };
  }
  const db = readDb();
  const album = db.albums.find((a) => a.id === id);
  if (!album) return null;
  const mediaItems = db.media
    .filter((m) => m.albumId === id)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const guestList = db.guests.filter((g) => g.albumId === id);
  return { album, media: mediaItems, guests: guestList };
}

export async function addGuest(albumId: string, name: string): Promise<Guest> {
  if (USE_MONGO) {
    const db = await mongo();
    const existing = (await guests(db)
      .find({ albumId }, PROJECT)
      .toArray()) as unknown as Guest[];
    const match = existing.find(
      (g) => g.name.toLowerCase() === name.toLowerCase(),
    );
    if (match) return match;
    const guest: Guest = {
      id: genId(12),
      albumId,
      name,
      createdAt: new Date().toISOString(),
    };
    await guests(db).insertOne(guest);
    return guest;
  }
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

export async function addMedia(
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
): Promise<MediaItem> {
  const item: MediaItem = {
    id: genId(12),
    albumId,
    createdAt: new Date().toISOString(),
    ...input,
  };
  if (USE_MONGO) {
    await media(await mongo()).insertOne(item);
  } else {
    const db = readDb();
    db.media.push(item);
    writeDb(db);
  }
  return item;
}

export async function getMedia(
  albumId: string,
  mediaId: string,
): Promise<MediaItem | null> {
  if (USE_MONGO) {
    const doc = await media(await mongo()).findOne(
      { albumId, id: mediaId },
      PROJECT,
    );
    return (doc as unknown as MediaItem | null) ?? null;
  }
  return readDb().media.find((m) => m.albumId === albumId && m.id === mediaId) ?? null;
}

export async function getMediaByFileName(
  albumId: string,
  fileName: string,
): Promise<MediaItem | null> {
  if (USE_MONGO) {
    const doc = await media(await mongo()).findOne(
      { albumId, fileName },
      PROJECT,
    );
    return (doc as unknown as MediaItem | null) ?? null;
  }
  return readDb().media.find((m) => m.albumId === albumId && m.fileName === fileName) ?? null;
}

export async function deleteMedia(
  albumId: string,
  mediaId: string,
): Promise<MediaItem | null> {
  if (USE_MONGO) {
    const db = await mongo();
    const removed = await media(db).findOneAndDelete({ albumId, id: mediaId });
    return (removed as unknown as MediaItem | null) ?? null;
  }
  const db = readDb();
  const index = db.media.findIndex((m) => m.albumId === albumId && m.id === mediaId);
  if (index === -1) return null;
  const [removed] = db.media.splice(index, 1);
  writeDb(db);
  return removed;
}

export async function deleteAlbum(
  id: string,
  ownerId: string,
): Promise<Album | null> {
  if (USE_MONGO) {
    const db = await mongo();
    const removed = await albums(db).findOneAndDelete({ id, ownerId });
    if (!removed) return null;
    await media(db).deleteMany({ albumId: id });
    await guests(db).deleteMany({ albumId: id });
    return (removed as unknown as Album | null) ?? null;
  }
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
