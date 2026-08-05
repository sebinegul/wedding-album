import { io, type Socket } from "socket.io-client";

/**
 * Server-side realtime emitter.
 *
 * The Next.js API routes emit events to the standalone Socket.io server
 * (server/index.js), which fans them out to every guest browser connected
 * to the album room. If the WS server is not running, emits are dropped
 * silently; the UI degrades to polling (see useRealtime).
 */

export const WS_URL =
  process.env.WS_URL ?? process.env.NEXT_PUBLIC_WS_URL ?? "ws://localhost:3001";

let socket: Socket | null = null;

function getSocket(): Socket | null {
  if (socket && socket.connected) return socket;
  try {
    socket = io(WS_URL, {
      transports: ["websocket"],
      reconnectionAttempts: 2,
      reconnectionDelay: 500,
      timeout: 1500,
    });
  } catch {
    return null;
  }
  return socket;
}

export function emitToAlbum(albumId: string, event: string, payload: unknown): void {
  try {
    const s = getSocket();
    if (!s) return;
    s.emit(event, { albumId, ...(payload as object) });
  } catch {
    // WS server not reachable; clients will pick up changes via polling.
  }
}
