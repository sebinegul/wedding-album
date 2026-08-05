/* eslint-disable @typescript-eslint/no-require-imports */
/* End-to-end smoke test against the running app (next start :3000, ws :3001). */
const { io } = require("socket.io-client");

const BASE = process.env.BASE_URL || "http://localhost:3000";
const WS = process.env.WS_URL || "ws://localhost:3001";

// 1x1 red PNG
const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64",
);

function ok(name, cond, extra = "") {
  console.log(`${cond ? "PASS" : "FAIL"}  ${name}${extra ? "  " + extra : ""}`);
  if (!cond) process.exitCode = 1;
}

function connectAlbumRoom(albumId, events) {
  return new Promise((resolve, reject) => {
    const sock = io(WS, { transports: ["websocket"], timeout: 3000 });
    sock.on("connect", () => sock.emit("album:join", albumId));
    sock.on("connect_error", (err) => {
      sock.close();
      reject(err);
    });
    sock.on("media:new", (p) => events.push(["media:new", p.media?.id]));
    sock.on("media:deleted", (p) => events.push(["media:deleted", p.mediaId]));
    sock.on("guest:joined", (p) => events.push(["guest:joined", p.guest?.name]));
    sock.on("room:stats", (p) => events.push(["room:stats", p.online]));
    // Keep the socket open for the whole test; close() is called by the returned fn.
    setTimeout(() => resolve(() => sock.close()), 800);
  });
}

async function main() {
  // 1. Create album
  const createRes = await fetch(`${BASE}/api/albums`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title: "Smoke Test Day", couple: "Aarav & Meera", ownerName: "Aarav" }),
  });
  const created = await createRes.json();
  ok("create album", (createRes.status === 200 || createRes.status === 201) && created.album?.id, `id=${created.album?.id} status=${createRes.status}`);
  const { id, ownerId } = created.album;

  // 2. Listen on the album room BEFORE any events fire
  const events = [];
  const closeRoom = await connectAlbumRoom(id, events);

  // 3. Join guest -> expect guest:joined
  const guestRes = await fetch(`${BASE}/api/albums/${id}/guests`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: "Priya" }),
  });
  const guest = await guestRes.json();
  ok("join guest", guestRes.status === 200 && guest.guest?.id, `guest=${guest.guest?.name}`);
  await new Promise((r) => setTimeout(r, 300));
  ok("realtime guest:joined", events.some(([e]) => e === "guest:joined"));

  // 4. Upload a photo -> expect media:new
  const form = new FormData();
  form.append("files", new Blob([PNG], { type: "image/png" }), "test.png");
  form.append("guestName", "Priya");
  form.append("dims", JSON.stringify([{ name: "test.png", width: 1, height: 1 }]));
  const upRes = await fetch(`${BASE}/api/albums/${id}/media`, { method: "POST", body: form });
  const up = await upRes.json();
  ok("upload media", upRes.status === 200 && up.media?.length === 1, `file=${up.media?.[0]?.fileName}`);
  await new Promise((r) => setTimeout(r, 300));
  ok("realtime media:new", events.some(([e]) => e === "media:new"));

  // 5. Media served as static file
  const fileRes = await fetch(`${BASE}${up.media[0].url}`);
  ok("media served", fileRes.status === 200 && fileRes.headers.get("content-type")?.includes("image/png"));

  // 6. Album detail lists media + guest
  const detailRes = await fetch(`${BASE}/api/albums/${id}`);
  const detail = await detailRes.json();
  ok("album detail", detailRes.status === 200 && detail.media.length === 1 && detail.guests.length === 1);

  // 7. Delete media as the uploader
  const delRes = await fetch(`${BASE}/api/albums/${id}/media/${up.media[0].id}`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ guestId: guest.guest.id }),
  });
  ok("delete media", delRes.status === 200);

  // 8. File gone from disk
  const gone = await fetch(`${BASE}${up.media[0].url}`);
  ok("media file removed", gone.status === 404);

  // 9. Delete album as owner
  const delAlbumRes = await fetch(`${BASE}/api/albums/${id}`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ownerId }),
  });
  ok("delete album", delAlbumRes.status === 200);

  // 10. Detail now 404
  const after = await fetch(`${BASE}/api/albums/${id}`);
  ok("album gone", after.status === 404);

  closeRoom();

  console.log(process.exitCode ? "SMOKE TEST FAILED" : "SMOKE TEST PASSED");
}

main().then(() => process.exit(process.exitCode || 0)).catch((e) => {
  console.error("SMOKE TEST ERROR:", e.message);
  process.exit(1);
});
