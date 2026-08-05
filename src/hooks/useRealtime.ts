"use client";

import { useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";
import type { Guest, MediaItem, RealtimeStatus } from "@/lib/types";

export const WS_URL = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:3001";

type Handlers = {
  onNewMedia?: (media: MediaItem) => void;
  onMediaDeleted?: (mediaId: string) => void;
  onGuestJoined?: (guest: Guest) => void;
};

/**
 * Subscribes to the album room on the Socket.io server.
 * When the WS server is unreachable the hook reports "offline"; callers
 * fall back to polling so the app keeps working without realtime.
 */
export function useRealtime(albumId: string, handlers: Handlers) {
  const [status, setStatus] = useState<RealtimeStatus>("connecting");
  const [online, setOnline] = useState<number | null>(null);
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;

  useEffect(() => {
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
        handlersRef.current.onNewMedia?.(payload.media);
      }
    });
    socket.on("media:deleted", (payload: { albumId: string; mediaId: string }) => {
      if (payload.albumId === albumId) {
        handlersRef.current.onMediaDeleted?.(payload.mediaId);
      }
    });
    socket.on("guest:joined", (payload: { albumId: string; guest: Guest }) => {
      if (payload.albumId === albumId) {
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

  return { status, online };
}
