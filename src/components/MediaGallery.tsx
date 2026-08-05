"use client";

import { useMemo } from "react";
import { motion, useReducedMotion } from "motion/react";
import Image from "next/image";
import { Images, Play, User } from "@phosphor-icons/react";
import type { MediaItem } from "@/lib/types";
import { cn, formatDate, timeAgo } from "@/lib/utils";

export type GalleryView = "grid" | "timeline" | "carousel";

function MediaThumb({
  item,
  onClick,
  className,
  priority = false,
}: {
  item: MediaItem;
  onClick: () => void;
  className?: string;
  priority?: boolean;
}) {
  const hasDims = Boolean(item.width && item.height);
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`Open ${item.originalName}`}
      className={cn(
        "group relative block w-full cursor-zoom-in overflow-hidden rounded-xl bg-stone-200 dark:bg-stone-800",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-500",
        className,
      )}
    >
      {item.kind === "video" ? (
        <div className="relative aspect-video w-full">
          {hasDims ? (
            <Image
              src={item.url}
              alt={item.originalName}
              width={item.width}
              height={item.height}
              priority={priority}
              className="h-full w-full object-cover transition-transform duration-300 ease-out group-hover:scale-[1.04]"
            />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={item.url}
              alt={item.originalName}
              className="h-full w-full object-cover transition-transform duration-300 ease-out group-hover:scale-[1.04]"
            />
          )}
          <span className="absolute inset-0 flex items-center justify-center bg-stone-950/25">
            <span className="flex size-11 items-center justify-center rounded-full bg-white/90 text-stone-900 shadow-lg backdrop-blur transition-transform duration-200 ease-out group-hover:scale-110">
              <Play size={18} weight="fill" className="ml-0.5" />
            </span>
          </span>
        </div>
      ) : hasDims ? (
        <Image
          src={item.url}
          alt={item.originalName}
          width={item.width}
          height={item.height}
          priority={priority}
          className="h-auto w-full transition-transform duration-300 ease-out group-hover:scale-[1.04]"
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
        />
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={item.url}
          alt={item.originalName}
          className="h-auto w-full transition-transform duration-300 ease-out group-hover:scale-[1.04]"
        />
      )}

      {/* Uploader tag */}
      <span className="absolute bottom-2 left-2 inline-flex max-w-[calc(100%-1rem)] items-center gap-1 rounded-full bg-stone-950/55 px-2 py-0.5 text-[11px] font-medium text-white/95 backdrop-blur-sm">
        <User size={10} weight="fill" className="shrink-0" />
        <span className="truncate">{item.uploadedByName}</span>
      </span>
    </button>
  );
}

export function MediaGallery({
  media,
  view,
  onOpen,
}: {
  media: MediaItem[];
  view: GalleryView;
  onOpen: (index: number) => void;
}) {
  const reduceMotion = useReducedMotion();

  const groups = useMemo(() => {
    const map = new Map<string, MediaItem[]>();
    for (const item of media) {
      const day = new Date(item.createdAt).toDateString();
      const list = map.get(day) ?? [];
      list.push(item);
      map.set(day, list);
    }
    return [...map.entries()];
  }, [media]);

  if (media.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-stone-300 px-6 py-16 text-center dark:border-stone-700">
        <span className="flex size-14 items-center justify-center rounded-full bg-rose-100 text-rose-600 dark:bg-rose-950 dark:text-rose-400">
          <Images size={26} />
        </span>
        <div>
          <h3 className="font-display text-lg font-semibold text-stone-900 dark:text-stone-100">
            No photos yet
          </h3>
          <p className="mx-auto mt-1 max-w-sm text-sm text-stone-500 dark:text-stone-400">
            Share the album QR code with your guests. Every photo and video they
            add appears here instantly.
          </p>
        </div>
      </div>
    );
  }

  if (view === "carousel") {
    return (
      <div
        className="-mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-2 sm:-mx-6 sm:px-6"
        role="region"
        aria-label="Photo carousel"
      >
        {media.map((item, i) => (
          <motion.div
            key={item.id}
            initial={reduceMotion ? false : { opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.35, delay: Math.min(i * 0.04, 0.3), ease: [0.16, 1, 0.3, 1] }}
            className="w-64 shrink-0 snap-center sm:w-80"
          >
            <MediaThumb item={item} onClick={() => onOpen(i)} className="aspect-[4/3]" />
            <p className="mt-1.5 truncate px-1 text-xs text-stone-500 dark:text-stone-400">
              {item.uploadedByName} · {timeAgo(item.createdAt)}
            </p>
          </motion.div>
        ))}
      </div>
    );
  }

  if (view === "timeline") {
    return (
      <div className="space-y-10">
        {groups.map(([day, items]) => (
          <section key={day} aria-label={formatDate(items[0].createdAt)}>
            <h3 className="mb-3 flex items-center gap-3 text-sm font-semibold text-stone-500 dark:text-stone-400">
              {formatDate(items[0].createdAt)}
              <span className="h-px flex-1 bg-stone-200 dark:bg-stone-800" />
            </h3>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {items.map((item, i) => (
                <motion.div
                  key={item.id}
                  initial={reduceMotion ? false : { opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.35, delay: Math.min(i * 0.04, 0.3), ease: [0.16, 1, 0.3, 1] }}
                >
                  <MediaThumb item={item} onClick={() => onOpen(media.indexOf(item))} />
                </motion.div>
              ))}
            </div>
          </section>
        ))}
      </div>
    );
  }

  // Grid (masonry)
  return (
    <div className="columns-2 gap-3 sm:columns-3 lg:columns-4 [&>*]:mb-3">
      {media.map((item, i) => (
        <motion.div
          key={item.id}
          initial={reduceMotion ? false : { opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: Math.min(i * 0.03, 0.36), ease: [0.16, 1, 0.3, 1] }}
          className="break-inside-avoid"
        >
          <MediaThumb item={item} onClick={() => onOpen(i)} />
        </motion.div>
      ))}
    </div>
  );
}
