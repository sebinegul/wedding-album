"use client";

import { useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";
import type { Guest, MediaItem, RealtimeStatus } from "@/lib/types";

/**
 * The socket.io relay URL. NEXT_PUBLIC_WS_URL is inlined at build time; when
 * it is unset (no relay deployed), realtime is "disabled" and the hook falls
 * back to polling the album detail endpoint so new uploads still appear.
 */
export const WS_URL = process.env.NEXT_PUBLIC_WS_URL || "";
const WS_ENABLED = Boolean(process.env.NEXT_PUBLIC_WS_URL);
const POLL_MS = 15000;

type Handlers = {
  onNewMedia?: (media: MediaItem) => void;
  onMediaDeleted?: (mediaId: string) => void;
  onGuestJoined?: (guest: Guest) => void;
};

/**
 * Subscribes to the album room on the Socket.io server. When the relay is
 * not configured ("disabled") or unreachable ("offline"), the hook polls
 * the album API every 15s and replays the same handler callbacks, so the
 * app keeps updating without realtime.
 */
export function useRealtime(albumId: string, handlers: Handlers) {
  const [status, setStatus] = useState<RealtimeStatus>(
    WS_ENABLED ? "connecting" : "disabled",
  );
  const [online, setOnline] = useState<number | null>(null);
  const handlersRef = useRef(handlers);
  const knownIdsRef = useRef<Set<string> | null>(null);
  const knownGuestIdsRef = useRef<Set<string> | null>(null);

  useEffect(() => {
    handlersRef.current = handlers;
  });

  // Socket.io subscription (only when a relay is configured).
  useEffect(() => {
    if (!WS_ENABLED) return;
    const socket = io(WS_URL, {
      transports: ["websocket"],
      reconnectionAttempts: 2,
      reconnectionDelay: 800,
      timeout: 2000,
    });

    socket.on("connect", () => {
      setStatus("live");
      socket.emit("album:join", albumId);
    });
    socket.on("disconnect", () => setStatus("offline"));
    socket.on("connect_error", () => setStatus("offline"));

    socket.on("media:new", (payload: { albumId: string; media: MediaItem }) => {
      if (payload.albumId === albumId) {
        knownIdsRef.current?.add(payload.media.id);
        handlersRef.current.onNewMedia?.(payload.media);
      }
    });
    socket.on("media:deleted", (payload: { albumId: string; mediaId: string }) => {
      if (payload.albumId === albumId) {
        knownIdsRef.current?.delete(payload.mediaId);
        handlersRef.current.onMediaDeleted?.(payload.mediaId);
      }
    });
    socket.on("guest:joined", (payload: { albumId: string; guest: Guest }) => {
      if (payload.albumId === albumId) {
        knownGuestIdsRef.current?.add(payload.guest.id);
        handlersRef.current.onGuestJoined?.(payload.guest);
      }
    });
    socket.on("room:stats", (payload: { albumId: string; online: number }) => {
      if (payload.albumId === albumId) setOnline(payload.online);
    });

    return () => {
      socket.emit("album:leave", albumId);
      socket.disconnect();
    };
  }, [albumId]);

  // Polling fallback: runs when the relay is disabled or dropped. The first
  // poll snapshots the album; later polls replay only the differences.
  useEffect(() => {
    if (WS_ENABLED && status !== "offline") return;

    const poll = async () => {
      try {
        const res = await fetch(`/api/albums/${albumId}`);
        if (!res.ok) return;
        const data = (await res.json()) as {
          media: MediaItem[];
          guests: Guest[];
        };
        const media = Array.isArray(data.media) ? data.media : [];
        const guestList = Array.isArray(data.guests) ? data.guests : [];

        if (!knownIdsRef.current) {
          knownIdsRef.current = new Set(media.map((m) => m.id));
          knownGuestIdsRef.current = new Set(guestList.map((g) => g.id));
          return; // baseline snapshot, no replay
        }

        const known = knownIdsRef.current;
        for (const item of media) {
          if (!known.has(item.id)) {
            known.add(item.id);
            handlersRef.current.onNewMedia?.(item);
          }
        }
        for (const id of [...known]) {
          if (!media.some((m) => m.id === id)) {
            known.delete(id);
            handlersRef.current.onMediaDeleted?.(id);
          }
        }

        const knownGuests = knownGuestIdsRef.current;
        if (!knownGuests) return;
        for (const guest of guestList) {
          if (!knownGuests.has(guest.id)) {
            knownGuests.add(guest.id);
            handlersRef.current.onGuestJoined?.(guest);
          }
        }
      } catch {
        // transient network error; try again next tick
      }
    };

    const timer = setInterval(poll, POLL_MS);
    return () => clearInterval(timer);
  }, [albumId, status]);

  return { status, online };
}
