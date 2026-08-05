import { timingSafeEqual } from "node:crypto";

/**
 * Admin capability check. The ADMIN_CODE env var is the single admin
 * credential for the whole app: creating albums and deleting any photo.
 * Comparison is constant-time so a timing side channel cannot be used to
 * probe the code character by character. When ADMIN_CODE is unset (local
 * dev before env wiring) admin actions stay open; see requireAdminCode in
 * the albums route for creation, and the media delete route for removals.
 */
export function isAdminCode(code: string | undefined | null): boolean {
  const expected = process.env.ADMIN_CODE;
  if (!expected || !code) return false;
  const a = Buffer.from(expected);
  const b = Buffer.from(code);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}
