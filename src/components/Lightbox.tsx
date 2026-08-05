"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { CaretLeft, CaretRight, Trash, X } from "@phosphor-icons/react";
import type { MediaItem } from "@/lib/types";
import { formatDateTime, timeAgo } from "@/lib/utils";
import { Button } from "./ui";

export function Lightbox({
  items,
  index,
  onClose,
  onNavigate,
  canDelete,
  onDelete,
}: {
  items: MediaItem[];
  index: number;
  onClose: () => void;
  onNavigate: (next: number) => void;
  canDelete: (item: MediaItem) => boolean;
  onDelete: (item: MediaItem) => Promise<void> | void;
}) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);
  const item = items[index];

  const prev = useCallback(() => {
    setConfirmDelete(false);
    onNavigate((index - 1 + items.length) % items.length);
  }, [index, items.length, onNavigate]);

  const next = useCallback(() => {
    setConfirmDelete(false);
    onNavigate((index + 1) % items.length);
  }, [index, items.length, onNavigate]);

  useEffect(() => {
    if (!item) return;
    closeRef.current?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") prev();
      if (e.key === "ArrowRight") next();
    };
    window.addEventListener("keydown", onKey);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [item, onClose, prev, next]);

  if (!item) return null;

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 flex flex-col bg-stone-950/95 backdrop-blur-sm"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        role="dialog"
        aria-modal="true"
        aria-label={`${item.originalName} in lightbox`}
      >
        {/* Top bar */}
        <div className="flex items-center justify-between px-4 py-3 text-stone-300 sm:px-6">
          <span className="text-sm tabular-nums">
            {index + 1} of {items.length}
          </span>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label="Close lightbox"
            className="press flex size-10 items-center justify-center rounded-full text-stone-300 hover:bg-white/10 hover:text-white"
          >
            <X size={20} />
          </button>
        </div>

        {/* Media */}
        <div className="relative flex min-h-0 flex-1 items-center justify-center px-4 sm:px-16">
          <button
            type="button"
            onClick={prev}
            aria-label="Previous photo"
            className="press absolute left-2 z-10 flex size-11 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur hover:bg-white/20 sm:left-6"
          >
            <CaretLeft size={20} />
          </button>

          <motion.div
            key={item.id}
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            className="flex max-h-full items-center justify-center"
          >
            {item.kind === "video" ? (
              <video
                src={item.url}
                controls
                autoPlay
                playsInline
                className="max-h-[72dvh] max-w-full rounded-xl"
              />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={item.url}
                alt={item.originalName}
                className="max-h-[72dvh] max-w-full rounded-xl object-contain shadow-2xl"
              />
            )}
          </motion.div>

          <button
            type="button"
            onClick={next}
            aria-label="Next photo"
            className="press absolute right-2 z-10 flex size-11 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur hover:bg-white/20 sm:right-6"
          >
            <CaretRight size={20} />
          </button>
        </div>

        {/* Caption bar */}
        <div className="flex items-center justify-between gap-3 px-4 py-4 text-sm text-stone-400 sm:px-6">
          <div className="min-w-0">
            <p className="truncate font-medium text-stone-200">
              {item.uploadedByName}
            </p>
            <p className="truncate text-xs text-stone-500" title={formatDateTime(item.createdAt)}>
              {timeAgo(item.createdAt)} · {item.originalName}
            </p>
          </div>
          {canDelete(item) &&
            (confirmDelete ? (
              <div className="flex shrink-0 items-center gap-2">
                <span className="text-xs text-stone-400">Remove this?</span>
                <Button
                  size="sm"
                  variant="danger"
                  onClick={async () => {
                    await onDelete(item);
                    setConfirmDelete(false);
                  }}
                >
                  Remove
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setConfirmDelete(false)}>
                  Keep
                </Button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmDelete(true)}
                aria-label="Delete photo"
                className="press flex shrink-0 size-10 items-center justify-center rounded-full text-stone-400 hover:bg-white/10 hover:text-rose-400"
              >
                <Trash size={18} />
              </button>
            ))}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
