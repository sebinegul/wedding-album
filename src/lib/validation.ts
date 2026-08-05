import { z } from "zod";

export const createAlbumSchema = z.object({
  title: z.string().trim().min(2, "Album title is required").max(80),
  couple: z.string().trim().min(2, "Couple names are required").max(80),
  ownerName: z.string().trim().min(2, "Your name is required").max(60),
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
