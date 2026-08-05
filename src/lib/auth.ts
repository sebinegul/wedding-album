import type { GuestIdentity } from "./types";

/**
 * Guest and owner identity helpers. Identities live in localStorage on the
 * client and travel with upload/delete requests. No passwords: an album is
 * open to anyone with the code, by design (README: guest-first access).
 */

const guestKey = (albumId: string) => `wa:guest:${albumId}`;
const ownerKey = (albumId: string) => `wa:owner:${albumId}`;

export function getGuestIdentity(albumId: string): GuestIdentity | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(guestKey(albumId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as GuestIdentity;
    if (parsed && typeof parsed.id === "string" && typeof parsed.name === "string") {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}

export function setGuestIdentity(albumId: string, identity: GuestIdentity): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(guestKey(albumId), JSON.stringify(identity));
}

export function getOwnerId(albumId: string): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(ownerKey(albumId));
}

export function setOwnerId(albumId: string, ownerId: string): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(ownerKey(albumId), ownerId);
}
