"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Images } from "@phosphor-icons/react";
import type { Album } from "@/lib/types";
import { timeAgo } from "@/lib/utils";

const ID_RE = /^[A-Za-z0-9]{4,12}$/;

/**
 * "Your albums" rail. Albums are private-by-id: this component collects the
 * album ids this browser created or joined (wa:owner:* / wa:guest:* entries
 * in localStorage) and asks the server for exactly those. Anonymous visitors
 * see an empty rail with a hint, never a public directory of events.
 */
function albumIdsFromStorage(): string[] {
  const ids = new Set<string>();
  for (let i = 0; i < window.localStorage.length; i++) {
    const key = window.localStorage.key(i);
    if (!key) continue;
    const match = key.match(/^wa:(owner|guest):([A-Za-z0-9]+)$/);
    if (match && ID_RE.test(match[2])) ids.add(match[2]);
  }
  return [...ids];
}

export function YourAlbums() {
  const [albums, setAlbums] = useState<Album[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    const ids = albumIdsFromStorage();
    const load =
      ids.length === 0
        ? Promise.resolve([] as Album[])
        : fetch(`/api/albums?ids=${encodeURIComponent(ids.join(","))}`)
            .then((r) => (r.ok ? r.json() : null))
            .then((data) =>
              Array.isArray(data?.albums) ? (data.albums as Album[]) : [],
            );
    load
      .then((list) => {
        if (!cancelled) setAlbums(list);
      })
      .catch(() => {
        if (!cancelled) setAlbums([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="rounded-2xl border border-stone-200/80 bg-white p-6 shadow-sm shadow-stone-900/5 dark:border-stone-800 dark:bg-stone-900">
      <h2 className="mb-4 flex items-center gap-2 font-display text-xl font-semibold text-stone-900 dark:text-stone-100">
        <Images size={18} className="text-rose-600 dark:text-rose-400" />
        Your albums
      </h2>
      {albums === null ? (
        <p className="text-sm text-stone-500 dark:text-stone-400">
          Loading…
        </p>
      ) : albums.length === 0 ? (
        <p className="text-sm leading-relaxed text-stone-500 dark:text-stone-400">
          Albums you create or join with a code will show up here, so you can
          hop back in anytime.
        </p>
      ) : (
        <ul className="divide-y divide-stone-100 dark:divide-stone-800">
          {albums.map((album) => (
            <li key={album.id}>
              <Link
                href={`/album/${album.id}`}
                className="group -mx-2 flex items-center justify-between gap-3 rounded-lg px-2 py-3 transition-colors hover:bg-stone-50 dark:hover:bg-stone-800/60"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium text-stone-800 group-hover:text-rose-700 dark:text-stone-200 dark:group-hover:text-rose-400">
                    {album.title}
                  </p>
                  <p className="truncate text-sm text-stone-500 dark:text-stone-400">
                    {album.couple}
                  </p>
                </div>
                <span className="shrink-0 text-xs text-stone-400 dark:text-stone-500">
                  {timeAgo(album.createdAt)}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
