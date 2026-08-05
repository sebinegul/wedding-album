"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { QRCodeSVG } from "qrcode.react";
import { Copy, QrCode, X } from "@phosphor-icons/react";
import { toast } from "sonner";
import type { Album } from "@/lib/types";
import { Button } from "./ui";

export function ShareDialog({
  open,
  onClose,
  album,
}: {
  open: boolean;
  onClose: () => void;
  album: Album;
}) {
  const [copied, setCopied] = useState(false);
  const joinUrl =
    typeof window === "undefined"
      ? ""
      : `${window.location.origin}/join/${album.id}`;

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(joinUrl);
      setCopied(true);
      toast.success("Link copied to clipboard");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Could not copy, select the link manually");
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-end justify-center bg-stone-950/60 p-4 backdrop-blur-sm sm:items-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={onClose}
          role="dialog"
          aria-modal="true"
          aria-label="Share album"
        >
          <motion.div
            className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl dark:bg-stone-900"
            initial={{ opacity: 0, y: 24, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.97 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-start justify-between">
              <div className="flex items-center gap-2">
                <span className="flex size-9 items-center justify-center rounded-full bg-rose-100 text-rose-600 dark:bg-rose-950 dark:text-rose-400">
                  <QrCode size={18} />
                </span>
                <div>
                  <h2 className="font-display text-lg font-semibold text-stone-900 dark:text-stone-100">
                    Share your album
                  </h2>
                  <p className="text-xs text-stone-500 dark:text-stone-400">
                    {album.title}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                className="press flex size-8 items-center justify-center rounded-full text-stone-400 hover:bg-stone-100 hover:text-stone-600 dark:hover:bg-stone-800"
              >
                <X size={16} />
              </button>
            </div>

            <div className="mb-4 flex justify-center rounded-2xl border border-stone-200 bg-white p-6 dark:border-stone-700 dark:bg-white">
              <QRCodeSVG
                value={joinUrl}
                size={176}
                level="M"
                bgColor="#ffffff"
                fgColor="#1c1917"
              />
            </div>

            <p className="mb-4 text-center text-sm text-stone-600 dark:text-stone-300">
              Guests scan this code to join and upload their photos and videos.
            </p>

            <div className="flex items-center gap-2 rounded-xl border border-stone-200 bg-stone-50 p-2 pl-3 dark:border-stone-700 dark:bg-stone-800">
              <code className="min-w-0 flex-1 truncate text-xs text-stone-500 dark:text-stone-400">
                {joinUrl}
              </code>
              <Button size="sm" variant="secondary" onClick={copyLink}>
                <Copy size={14} />
                {copied ? "Copied" : "Copy"}
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
