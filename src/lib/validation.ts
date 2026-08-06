import { z } from "zod";

export const createAlbumSchema = z.object({
  title: z.string().trim().min(2, "Album title is required").max(80),
  couple: z.string().trim().min(2, "Couple names are required").max(80),
  ownerName: z.string().trim().min(2, "Your name is required").max(60),
  adminCode: z.string().trim().min(4).max(64).optional(),
});

export const guestSchema = z.object({
  name: z.string().trim().min(1, "Please enter your name").max(60),
});

export const deleteAlbumSchema = z.object({
  ownerId: z.string().min(4),
});

/**
 * Client-detected image dimensions, keyed by file name.
 * Sent alongside the multipart upload so the gallery can use
 * next/image without server-side image decoding.
 */
export const dimsEntrySchema = z.object({
  name: z.string(),
  width: z.number().int().positive().max(12000),
  height: z.number().int().positive().max(12000),
});

export const dimsSchema = z.array(dimsEntrySchema).max(50).optional();

/**
 * Admin/owner ZIP download. mediaIds must belong to the album; the server
 * re-checks ownership per id and skips anything unknown.
 */
export const downloadSchema = z.object({
  mediaIds: z.array(z.string().min(1).max(64)).min(1).max(1000),
  adminCode: z.string().max(64).optional(),
  ownerId: z.string().min(4).max(64).optional(),
});
