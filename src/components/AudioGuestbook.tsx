"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
  Microphone,
  Play,
  SpinnerGap,
  Stop,
  Trash,
  UploadSimple,
  Waveform,
} from "@phosphor-icons/react";
import { toast } from "sonner";
import type { GuestIdentity, MediaItem } from "@/lib/types";
import { cn, timeAgo } from "@/lib/utils";
import { Button } from "./ui";

/**
 * Audio guestbook: guests record a short voice message for the couple.
 *
 * Recording happens entirely in the browser via MediaRecorder (opus/webm on
 * Chrome, Firefox and Edge; m4a on Safari). The finished blob is uploaded
 * through the normal media route, so voice messages flow through the same
 * storage, realtime and delete machinery as photos and videos.
 */

const MAX_SECONDS = 300; // 5 minutes is plenty for a guestbook message

type RecState = "idle" | "recording" | "reviewing" | "uploading";

function pickMimeType(): string {
  const candidates = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4"];
  if (typeof MediaRecorder === "undefined") return "";
  for (const mime of candidates) {
    if (MediaRecorder.isTypeSupported(mime)) return mime;
  }
  return "";
}

function extForMime(mime: string): string {
  if (mime.startsWith("audio/mp4") || mime.startsWith("audio/x-m4a")) return ".m4a";
  if (mime.startsWith("audio/mpeg")) return ".mp3";
  if (mime.startsWith("audio/ogg")) return ".ogg";
  if (mime.startsWith("audio/wav")) return ".wav";
  return ".webm";
}

function formatClock(total: number): string {
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function AudioGuestbook({
  albumId,
  guest,
  items,
  canDelete,
  onDelete,
  onUploaded,
}: {
  albumId: string;
  guest: GuestIdentity | null;
  /** Audio messages visible to the current viewer (filtered by the parent). */
  items: MediaItem[];
  canDelete: (item: MediaItem) => boolean;
  onDelete: (item: MediaItem) => Promise<void> | void;
  /** Called with the uploaded message(s) so the parent can update its state. */
  onUploaded: (added: MediaItem[]) => void;
}) {
  const reduceMotion = useReducedMotion();

  const [recState, setRecState] = useState<RecState>("idle");
  const [seconds, setSeconds] = useState(0);
  const [blob, setBlob] = useState<Blob | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);

  const stopTracks = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  };

  const clearTimer = () => {
    if (timerRef.current !== null) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const discard = () => {
    clearTimer();
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setBlob(null);
    setSeconds(0);
    setRecState("idle");
  };

  // Cleanup on unmount: never leave the mic open or a timer running.
  useEffect(() => {
    return () => {
      clearTimer();
      if (recorderRef.current && recorderRef.current.state !== "inactive") {
        recorderRef.current.stop();
      }
      stopTracks();
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const startRecording = async () => {
    if (!guest) {
      toast.error("Add your name before leaving a message");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mime = pickMimeType();
      const recorder = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
      recorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        stopTracks();
        const type = recorder.mimeType || "audio/webm";
        const nextBlob = new Blob(chunksRef.current, { type });
        const url = URL.createObjectURL(nextBlob);
        setBlob(nextBlob);
        setPreviewUrl(url);
        setRecState("reviewing");
      };

      recorder.start();
      setSeconds(0);
      setRecState("recording");
      timerRef.current = window.setInterval(() => {
        setSeconds((s) => {
          if (s + 1 >= MAX_SECONDS) {
            clearTimer();
            if (recorderRef.current && recorderRef.current.state !== "inactive") {
              recorderRef.current.stop();
            }
            return MAX_SECONDS;
          }
          return s + 1;
        });
      }, 1000);
    } catch {
      toast.error("Microphone access was blocked. Allow the mic in your browser and try again.");
    }
  };

  const stopRecording = () => {
    clearTimer();
    const recorder = recorderRef.current;
    if (recorder && recorder.state !== "inactive") recorder.stop();
    else stopTracks();
  };

  const sendMessage = async () => {
    if (!blob || !guest) return;
    setRecState("uploading");
    try {
      const form = new FormData();
      form.append(
        "files",
        blob,
        `voice-message-${Date.now()}${extForMime(blob.type)}`,
      );
      form.append("guestName", guest.name);
      form.append("dims", "[]");
      const res = await fetch(`/api/albums/${albumId}/media`, {
        method: "POST",
        body: form,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not send the message");
      const sent = data.media as MediaItem[] | undefined;
      if (!sent || sent.length === 0) throw new Error("Could not send the message");
      onUploaded(sent);
      discard();
      toast.success("Your voice message is in the album!");
    } catch (err) {
      setRecState("reviewing");
      toast.error(err instanceof Error ? err.message : "Could not send the message");
    }
  };

  const recording = recState === "recording";

  return (
    <section
      aria-labelledby="voice-messages-heading"
      className="mb-10 rounded-3xl border border-stone-200 bg-gradient-to-b from-white to-rose-50/40 p-5 sm:p-6 dark:border-stone-800 dark:from-stone-900 dark:to-rose-950/20"
    >
      <div className="mb-4 flex items-center gap-3">
        <span className="flex size-10 items-center justify-center rounded-full bg-rose-600 text-white shadow-sm shadow-rose-600/25">
          <Waveform size={18} weight="fill" />
        </span>
        <div>
          <h2
            id="voice-messages-heading"
            className="font-display text-xl font-semibold text-stone-900 dark:text-stone-100"
          >
            Voice messages
          </h2>
          <p className="text-xs text-stone-500 dark:text-stone-400">
            Leave the couple a message they can replay forever
          </p>
        </div>
        {items.length > 0 && (
          <span className="ml-auto rounded-full bg-rose-100 px-2.5 py-1 text-xs font-semibold text-rose-700 dark:bg-rose-950 dark:text-rose-300">
            {items.length}
          </span>
        )}
      </div>

      {/* Recorder */}
      {guest ? (
        <div className="mb-5">
          <AnimatePresence mode="wait" initial={false}>
            {recState === "idle" && (
              <motion.div
                key="idle"
                initial={reduceMotion ? false : { opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-rose-300 bg-white/70 px-5 py-6 text-center dark:border-rose-800 dark:bg-stone-900/60"
              >
                <button
                  type="button"
                  onClick={startRecording}
                  aria-label="Start recording a voice message"
                  className="press flex size-16 items-center justify-center rounded-full bg-rose-600 text-white shadow-lg shadow-rose-600/30 hover:bg-rose-700"
                >
                  <Microphone size={26} weight="fill" />
                </button>
                <div>
                  <p className="text-sm font-semibold text-stone-800 dark:text-stone-200">
                    Record a message for the couple
                  </p>
                  <p className="mt-0.5 text-xs text-stone-500 dark:text-stone-400">
                    Up to 5 minutes. Say a wish, a memory, or just hello.
                  </p>
                </div>
              </motion.div>
            )}

            {recording && (
              <motion.div
                key="recording"
                initial={reduceMotion ? false : { opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                className="flex flex-col items-center gap-3 rounded-2xl border border-rose-200 bg-rose-50/80 px-5 py-6 text-center dark:border-rose-900 dark:bg-rose-950/30"
              >
                <div className="flex items-center gap-3">
                  <span className="relative flex size-3">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-rose-500 opacity-75" />
                    <span className="relative inline-flex size-3 rounded-full bg-rose-600" />
                  </span>
                  <span className="font-mono text-2xl tabular-nums text-rose-700 dark:text-rose-300">
                    {formatClock(seconds)}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={stopRecording}
                  aria-label="Stop recording"
                  className="press flex size-14 items-center justify-center rounded-full bg-stone-900 text-white shadow-lg hover:bg-stone-700 dark:bg-white dark:text-stone-900 dark:hover:bg-stone-200"
                >
                  <Stop size={22} weight="fill" />
                </button>
                <p className="text-xs text-rose-600 dark:text-rose-400">
                  Recording as {guest.name}
                </p>
              </motion.div>
            )}

            {(recState === "reviewing" || recState === "uploading") && blob && previewUrl && (
              <motion.div
                key="review"
                initial={reduceMotion ? false : { opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                className="flex flex-col items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50/50 px-5 py-5 text-center dark:border-emerald-900 dark:bg-emerald-950/20"
              >
                <p className="text-sm font-semibold text-stone-800 dark:text-stone-200">
                  Listen before you send
                </p>
                <audio controls src={previewUrl} className="h-10 w-full max-w-sm" />
                <div className="flex flex-wrap items-center justify-center gap-2">
                  <Button
                    size="sm"
                    onClick={sendMessage}
                    disabled={recState === "uploading"}
                  >
                    {recState === "uploading" ? (
                      <>
                        <SpinnerGap size={16} className="animate-spin" /> Sending...
                      </>
                    ) : (
                      <>
                        <UploadSimple size={16} weight="bold" /> Send it
                      </>
                    )}
                  </Button>
                  <Button size="sm" variant="secondary" onClick={startRecording} disabled={recState === "uploading"}>
                    <Microphone size={16} /> Record again
                  </Button>
                  <Button size="sm" variant="ghost" onClick={discard} disabled={recState === "uploading"}>
                    Discard
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      ) : (
        <p className="mb-5 rounded-2xl border border-dashed border-stone-300 px-5 py-4 text-center text-sm text-stone-500 dark:border-stone-700 dark:text-stone-400">
          Add your name above to leave a voice message.
        </p>
      )}

      {/* Messages */}
      {items.length > 0 && (
        <ul className="space-y-2">
          {items.map((item) => (
            <li
              key={item.id}
              className="flex flex-wrap items-center gap-3 rounded-2xl border border-stone-200 bg-white px-4 py-3 dark:border-stone-800 dark:bg-stone-900"
            >
              <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-rose-100 text-rose-600 dark:bg-rose-950 dark:text-rose-400">
                <Play size={16} weight="fill" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-stone-800 dark:text-stone-200">
                  {item.uploadedByName}
                </p>
                <p className="text-xs text-stone-500 dark:text-stone-400">
                  {timeAgo(item.createdAt)}
                </p>
              </div>
              <audio
                controls
                preload="metadata"
                src={item.url}
                className="h-10 w-full sm:w-56"
                aria-label={`Voice message from ${item.uploadedByName}`}
              />
              {canDelete(item) &&
                (confirmDeleteId === item.id ? (
                  <div className="flex shrink-0 items-center gap-1.5 text-xs text-stone-500 dark:text-stone-400">
                    <span>Remove?</span>
                    <Button
                      size="sm"
                      variant="danger"
                      onClick={async () => {
                        await onDelete(item);
                        setConfirmDeleteId(null);
                      }}
                    >
                      Remove
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setConfirmDeleteId(null)}>
                      Keep
                    </Button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setConfirmDeleteId(item.id)}
                    aria-label={`Delete voice message from ${item.uploadedByName}`}
                    className={cn(
                      "press flex size-9 shrink-0 items-center justify-center rounded-full text-stone-400",
                      "hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40 dark:hover:text-rose-400",
                    )}
                  >
                    <Trash size={16} />
                  </button>
                ))}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
