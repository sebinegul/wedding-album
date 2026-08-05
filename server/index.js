/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * Standalone Socket.io server for realtime album updates.
 *
 * Run with: npm run ws   (default port 3001, override with WS_PORT)
 *
 * The Next.js API routes emit events to this server (src/lib/events.ts),
 * which relays them to every guest connected to the album room. The browser
 * client connects here via NEXT_PUBLIC_WS_URL (src/hooks/useRealtime.ts).
 */
const { createServer } = require("http");
const { Server } = require("socket.io");

const PORT = Number(process.env.WS_PORT) || 3001;

const io = new Server(createServer(), {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

const roomFor = (albumId) => `album:${albumId}`;

async function broadcastStats(albumId) {
  try {
    const sockets = await io.in(roomFor(albumId)).fetchSockets();
    io.to(roomFor(albumId)).emit("room:stats", {
      albumId,
      online: sockets.length,
    });
  } catch {
    // room may have emptied mid-count
  }
}

io.on("connection", (socket) => {
  socket.on("album:join", (albumId) => {
    if (typeof albumId !== "string" || !albumId) return;
    socket.join(roomFor(albumId));
    broadcastStats(albumId);
  });

  socket.on("album:leave", (albumId) => {
    if (typeof albumId !== "string" || !albumId) return;
    socket.leave(roomFor(albumId));
    broadcastStats(albumId);
  });

  // Relay events published by the API server to everyone in the room.
  for (const event of ["media:new", "media:deleted", "guest:joined"]) {
    socket.on(event, (payload) => {
      const albumId = payload && payload.albumId;
      if (typeof albumId !== "string" || !albumId) return;
      io.to(roomFor(albumId)).emit(event, payload);
    });
  }

  let joinedRooms = [];
  socket.on("disconnecting", () => {
    joinedRooms = [...socket.rooms]
      .filter((r) => r.startsWith("album:"))
      .map((r) => r.slice("album:".length));
  });

  socket.on("disconnect", () => {
    for (const albumId of joinedRooms) broadcastStats(albumId);
  });
});

io.listen(PORT);
console.log(`[wedding-album] realtime server listening on ws://localhost:${PORT}`);
