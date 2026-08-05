"use client";

import { useCallback, useRef, useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "motion/react";
import { CheckCircle, Images, UploadSimple, VideoCamera, WarningCircle, X } from "@phosphor-icons/react";
import { toast } from "sonner";
import type { GuestIdentity, MediaItem } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Button } from "./ui";

type UploadStatus = "uploading" | "done" | "error";

type FileState = {
  name: string;
  status: UploadStatus;
  error?: string;
};

const MAX_IMAGE = 25 * 1024 * 1024;
const MAX_VIDEO = 200 * 1024 * 1024;

type DimsEntry = { name: string; width: number; height: number };

async function detectDimensions(file: File): Promise<{ width?: number; height?: number }> {
  if (!file.type.startsWith("image/")) return {};
  try {
    const bitmap = await createImageBitmap(file);
    const dims = { width: bitmap.width, height: bitmap.height };
    bitmap.close();
    return dims;
  } catch {
    return {};
  }
}

function uploadFiles(params: {
  albumId: string;
  files: File[];
  guest: GuestIdentity | null;
  onProgress: (name: string, progress: number) => void;
}): Promise<{ media: MediaItem[]; errors: string[]; message: string }> {
  return new Promise(async (resolve, reject) => {
    try {
      const dims: DimsEntry[] = [];
      for (const file of params.files) {
        if (file.type.startsWith("image/")) {
          const d = await detectDimensions(file);
          if (d.width && d.height) dims.push({ name: file.name, width: d.width, height: d.height });
        }
      }

      const form = new FormData();
      for (const file of params.files) form.append("files", file);
      form.append("guestName", params.guest?.name ?? "");
      form.append("dims", JSON.stringify(dims));

      const xhr = new XMLHttpRequest();
      xhr.open("POST", `/api/albums/${params.albumId}/media`);
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) {
          const pct = Math.round((e.loaded / e.total) * 100);
          params.onProgress("__all__", pct);
        }
      };
      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            resolve(JSON.parse(xhr.responseText));
          } catch {
            reject(new Error("Unexpected server response"));
          }
        } else {
          let message = "Upload failed";
          try {
            message = JSON.parse(xhr.responseText).error ?? message;
          } catch {
            /* keep default */
          }
          reject(new Error(message));
        }
      };
      xhr.onerror = () => reject(new Error("Network error while uploading"));
      xhr.send(form);
    } catch (err) {
      reject(err instanceof Error ? err : new Error("Upload failed"));
    }
  });
}

export function UploadZone({
  albumId,
  guest,
  onUploaded,
}: {
  albumId: string;
  guest: GuestIdentity | null;
  onUploaded: (media: MediaItem[]) => void;
}) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [overall, setOverall] = useState(0);
  const [fileStates, setFileStates] = useState<FileState[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const reduceMotion = useReducedMotion();

  const setFileState = (name: string, patch: Partial<FileState>) => {
    setFileStates((prev) =>
      prev.map((f) => (f.name === name ? { ...f, ...patch } : f)),
    );
  };

  const validate = (file: File): string | null => {
    const images = ["image/jpeg", "image/png", "image/gif", "image/webp", "image/heic"];
    const videos = ["video/mp4", "video/quicktime", "video/webm"];
    if (![...images, ...videos].includes(file.type)) {
      return "Unsupported type, use JPG, PNG, GIF, WebP, MP4, MOV or WebM";
    }
    const limit = images.includes(file.type) ? MAX_IMAGE : MAX_VIDEO;
    if (file.size > limit) {
      return `Larger than ${Math.round(limit / (1024 * 1024))} MB`;
    }
    return null;
  };

  const processFiles = async (list: FileList | File[]) => {
    if (!guest) {
      toast.error("Add your name before uploading");
      return;
    }
    const files = Array.from(list);
    const valid: File[] = [];
    const states: FileState[] = [];

    for (const file of files) {
      const error = validate(file);
      states.push({ name: file.name, status: error ? "error" : "uploading", error: error ?? undefined });
      if (!error) valid.push(file);
    }
    setFileStates(states);
    if (valid.length === 0) return;

    setIsUploading(true);
    setOverall(0);

    try {
      const result = await uploadFiles({
        albumId,
        files: valid,
        guest,
        onProgress: (name, pct) => {
          if (name === "__all__") setOverall(pct);
        },
      });

      valid.forEach((file) => setFileState(file.name, { status: "done" }));
      setOverall(100);

      if (result.media.length > 0) {
        toast.success(
          result.errors.length
            ? `${result.media.length} uploaded, ${result.errors.length} skipped`
            : result.message,
        );
        onUploaded(result.media);
      }
      if (result.errors.length) {
        for (const err of result.errors) toast.error(err);
      }
    } catch (err) {
      valid.forEach((file) =>
        setFileState(file.name, {
          status: "error",
          error: err instanceof Error ? err.message : "Upload failed",
        }),
      );
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setIsUploading(false);
    }
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files.length) processFiles(e.dataTransfer.files);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [albumId, guest]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.length) processFiles(e.target.files);
    e.target.value = "";
  };

  const hasErrors = fileStates.some((f) => f.status === "error");
  const activeCount = fileStates.filter((f) => f.status === "uploading").length;

  return (
    <div className="space-y-4">
      <motion.div
        onDrop={handleDrop}
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragOver(true);
        }}
        onDragLeave={(e) => {
          e.preventDefault();
          setIsDragOver(false);
        }}
        initial={reduceMotion ? false : { opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className={cn(
          "relative rounded-2xl border-2 border-dashed p-8 text-center transition-colors duration-200 sm:p-10",
          isDragOver
            ? "border-rose-500 bg-rose-50 dark:border-rose-400 dark:bg-rose-950/30"
            : "border-stone-300 bg-white hover:border-rose-400 dark:border-stone-700 dark:bg-stone-900 dark:hover:border-rose-500",
        )}
      >
        <input
          ref={inputRef}
          type="file"
          multiple
          accept="image/*,video/*"
          className="sr-only"
          onChange={handleFileSelect}
          disabled={isUploading}
          aria-label="Choose photos and videos to upload"
        />

        <div className="mx-auto flex max-w-sm flex-col items-center gap-4">
          <motion.div
            className="flex items-center justify-center gap-3"
            whileHover={reduceMotion ? undefined : { scale: 1.06 }}
            transition={{ duration: 0.2 }}
          >
            <span className="flex size-12 items-center justify-center rounded-full bg-rose-100 text-rose-600 dark:bg-rose-950 dark:text-rose-400">
              <Images size={22} />
            </span>
            <span className="flex size-12 items-center justify-center rounded-full bg-stone-100 text-stone-500 dark:bg-stone-800 dark:text-stone-400">
              <VideoCamera size={22} />
            </span>
          </motion.div>

          <div>
            <h3 className="font-display text-xl font-semibold text-stone-900 dark:text-stone-100">
              Drop photos and videos here
            </h3>
            <p className="mt-1.5 text-sm leading-relaxed text-stone-500 dark:text-stone-400">
              JPG, PNG, GIF, WebP, HEIC and MP4, MOV, WebM. Photos up to 25 MB, videos up to 200 MB.
            </p>
          </div>

          <Button
            type="button"
            size="lg"
            onClick={() => inputRef.current?.click()}
            disabled={isUploading}
            className="mt-1"
          >
            <UploadSimple size={18} weight="bold" />
            {isUploading ? "Uploading" : "Select files"}
          </Button>
        </div>
      </motion.div>

      <AnimatePresence>
        {fileStates.length > 0 && (
          <motion.div
            initial={reduceMotion ? false : { opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden"
            role="status"
            aria-live="polite"
          >
            <div className="rounded-2xl border border-stone-200 bg-white p-4 dark:border-stone-800 dark:bg-stone-900">
              <div className="mb-3 flex items-center justify-between text-sm">
                <span className="font-medium text-stone-800 dark:text-stone-200">
                  {isUploading
                    ? `Uploading ${activeCount} file${activeCount === 1 ? "" : "s"}`
                    : hasErrors
                      ? "Finished with warnings"
                      : "Upload complete"}
                </span>
                <button
                  type="button"
                  onClick={() => setFileStates([])}
                  aria-label="Dismiss upload list"
                  className="press flex size-7 items-center justify-center rounded-full text-stone-400 hover:bg-stone-100 hover:text-stone-600 dark:hover:bg-stone-800"
                >
                  <X size={14} />
                </button>
              </div>

              {isUploading && (
                <div className="mb-3 h-1.5 overflow-hidden rounded-full bg-stone-200 dark:bg-stone-800">
                  <motion.div
                    className="h-full rounded-full bg-gradient-to-r from-rose-500 to-rose-600"
                    animate={{ width: `${overall}%` }}
                    transition={{ duration: 0.25, ease: "easeOut" }}
                  />
                </div>
              )}

              <ul className="max-h-56 space-y-2 overflow-y-auto pr-1">
                {fileStates.map((file) => (
                  <li
                    key={file.name}
                    className="flex items-center gap-3 rounded-lg px-2 py-1.5 text-sm"
                  >
                    {file.status === "done" ? (
                      <CheckCircle size={18} className="shrink-0 text-emerald-600 dark:text-emerald-400" weight="fill" />
                    ) : file.status === "error" ? (
                      <WarningCircle size={18} className="shrink-0 text-rose-600 dark:text-rose-400" weight="fill" />
                    ) : (
                      <SpinnerDot />
                    )}
                    <span className="min-w-0 flex-1 truncate text-stone-700 dark:text-stone-300">
                      {file.name}
                    </span>
                    {file.status === "error" && file.error && (
                      <span className="shrink-0 text-xs text-rose-600 dark:text-rose-400">{file.error}</span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function SpinnerDot() {
  return (
    <span className="size-4 shrink-0 animate-spin rounded-full border-2 border-rose-500 border-t-transparent" />
  );
}
