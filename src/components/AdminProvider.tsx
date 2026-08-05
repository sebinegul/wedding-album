"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";

/**
 * Session-wide admin state.
 *
 * The admin code is the single global app credential (create albums, delete
 * any photo). It is deliberately memory-only: it never touches localStorage,
 * and it lives here so the couple unlocks once per tab session instead of
 * once per album page. Typing into a code field never unlocks anything -
 * only a 200 from /api/admin/verify does. The server re-validates the code
 * on every privileged request regardless of this flag.
 */
type AdminContextValue = {
  isAdmin: boolean;
  adminCode: string | null;
  /** POSTs the code to /api/admin/verify; returns true only on success. */
  unlock: (code: string) => Promise<boolean>;
  lock: () => void;
};

const AdminContext = createContext<AdminContextValue | null>(null);

export function AdminProvider({ children }: { children: React.ReactNode }) {
  const [adminCode, setAdminCode] = useState<string | null>(null);

  const unlock = useCallback(async (code: string) => {
    const res = await fetch("/api/admin/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ adminCode: code }),
    });
    if (!res.ok) return false;
    setAdminCode(code);
    return true;
  }, []);

  const lock = useCallback(() => setAdminCode(null), []);

  const value = useMemo(
    () => ({ isAdmin: adminCode !== null, adminCode, unlock, lock }),
    [adminCode, unlock, lock],
  );

  return <AdminContext.Provider value={value}>{children}</AdminContext.Provider>;
}

export function useAdmin(): AdminContextValue {
  const ctx = useContext(AdminContext);
  if (!ctx) throw new Error("useAdmin must be used within AdminProvider");
  return ctx;
}
