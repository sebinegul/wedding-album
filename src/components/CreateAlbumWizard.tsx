"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, useReducedMotion } from "motion/react";
import { QRCodeSVG } from "qrcode.react";
import confetti from "canvas-confetti";
import { ArrowRight, Copy, Heart, Sparkle } from "@phosphor-icons/react";
import { toast } from "sonner";
import type { Album } from "@/lib/types";
import { setOwnerId } from "@/lib/auth";
import { Button, Card, Input, Label, Spinner } from "./ui";

const CONFETTI_COLORS = ["#e11d48", "#f43f5e", "#fda4af", "#fecdd3", "#fff1f2"];

export function CreateAlbumWizard() {
  const router = useRouter();
  const reduceMotion = useReducedMotion();

  const [ownerName, setOwnerName] = useState("");
  const [couple, setCouple] = useState("");
  const [title, setTitle] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [album, setAlbum] = useState<Album | null>(null);
  const [copied, setCopied] = useState(false);

  const joinUrl = album ? `${window.location.origin}/join/${album.id}` : "";

  const fireConfetti = () => {
    if (reduceMotion) return;
    const base = {
      spread: 70,
      ticks: 130,
      gravity: 0.9,
      startVelocity: 34,
      colors: CONFETTI_COLORS,
      disableForReducedMotion: true,
    };
    confetti({ ...base, particleCount: 55, angle: 60, origin: { x: 0, y: 0.8 } });
    confetti({ ...base, particleCount: 55, angle: 120, origin: { x: 1, y: 0.8 } });
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const next: Record<string, string> = {};
    if (ownerName.trim().length < 2) next.ownerName = "Please enter your name";
    if (couple.trim().length < 2) next.couple = "Enter both names, for example Aarav and Meera";
    if (title.trim().length < 2) next.title = "Give the album a title";
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    setSubmitting(true);
    try {
      const res = await fetch("/api/albums", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ownerName: ownerName.trim(),
          couple: couple.trim(),
          title: title.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not create the album");
      setAlbum(data.album as Album);
      setOwnerId(data.album.id, data.album.ownerId);
      fireConfetti();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not create the album");
    } finally {
      setSubmitting(false);
    }
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(joinUrl);
      setCopied(true);
      toast.success("Link copied");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Could not copy the link");
    }
  };

  if (album) {
    return (
      <Card className="p-6 sm:p-8">
        <motion.div
          initial={reduceMotion ? false : { opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          className="flex flex-col items-center gap-5 text-center"
        >
          <motion.span
            className="flex size-14 items-center justify-center rounded-full bg-rose-600 text-white shadow-lg shadow-rose-600/30"
            initial={reduceMotion ? false : { scale: 0.8 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 260, damping: 16 }}
          >
            <Sparkle size={24} weight="fill" />
          </motion.span>

          <div>
            <h3 className="font-display text-2xl font-semibold text-stone-900 dark:text-stone-100">
              {album.title} is ready
            </h3>
            <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">
              {album.couple}. Share the QR code with your guests.
            </p>
          </div>

          <div className="rounded-2xl border border-stone-200 bg-white p-5 dark:border-stone-700">
            <QRCodeSVG value={joinUrl} size={168} level="M" bgColor="#ffffff" fgColor="#1c1917" />
          </div>

          <div className="flex w-full max-w-xs items-center gap-2 rounded-xl border border-stone-200 bg-stone-50 p-2 pl-3 dark:border-stone-700 dark:bg-stone-800">
            <code className="min-w-0 flex-1 truncate text-xs text-stone-500 dark:text-stone-400">
              {joinUrl}
            </code>
            <Button size="sm" variant="secondary" onClick={copyLink}>
              <Copy size={14} />
              {copied ? "Copied" : "Copy"}
            </Button>
          </div>

          <div className="flex w-full flex-col gap-2 sm:flex-row">
            <Button size="lg" className="flex-1" onClick={() => router.push(`/album/${album.id}`)}>
              Open your album
              <ArrowRight size={16} weight="bold" />
            </Button>
            <Button
              size="lg"
              variant="secondary"
              className="flex-1"
              onClick={() => {
                setAlbum(null);
                setTitle("");
                setCouple("");
                setOwnerName("");
              }}
            >
              Create another
            </Button>
          </div>
        </motion.div>
      </Card>
    );
  }

  return (
    <Card className="p-6 sm:p-8" id="create">
      <div className="mb-6 flex items-center gap-2">
        <span className="flex size-9 items-center justify-center rounded-full bg-rose-100 text-rose-600 dark:bg-rose-950 dark:text-rose-400">
          <Heart size={17} weight="fill" />
        </span>
        <h2 className="font-display text-xl font-semibold text-stone-900 dark:text-stone-100">
          Create your album
        </h2>
      </div>

      <form onSubmit={submit} noValidate className="space-y-5">
        <div>
          <Label htmlFor="wa-owner">Your name</Label>
          <Input
            id="wa-owner"
            value={ownerName}
            onChange={(e) => setOwnerName(e.target.value)}
            placeholder="Alex"
            autoComplete="name"
            aria-invalid={Boolean(errors.ownerName)}
            aria-describedby={errors.ownerName ? "wa-owner-error" : undefined}
          />
          {errors.ownerName && (
            <p id="wa-owner-error" role="alert" className="mt-1.5 text-sm text-rose-600 dark:text-rose-400">
              {errors.ownerName}
            </p>
          )}
        </div>

        <div>
          <Label htmlFor="wa-couple">Couple names</Label>
          <Input
            id="wa-couple"
            value={couple}
            onChange={(e) => setCouple(e.target.value)}
            placeholder="Aarav and Meera"
            aria-invalid={Boolean(errors.couple)}
            aria-describedby={errors.couple ? "wa-couple-error" : undefined}
          />
          {errors.couple && (
            <p id="wa-couple-error" role="alert" className="mt-1.5 text-sm text-rose-600 dark:text-rose-400">
              {errors.couple}
            </p>
          )}
        </div>

        <div>
          <Label htmlFor="wa-title">Album title</Label>
          <Input
            id="wa-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="The Big Day"
            aria-invalid={Boolean(errors.title)}
            aria-describedby={errors.title ? "wa-title-error" : undefined}
          />
          {errors.title && (
            <p id="wa-title-error" role="alert" className="mt-1.5 text-sm text-rose-600 dark:text-rose-400">
              {errors.title}
            </p>
          )}
        </div>

        <Button type="submit" size="lg" className="w-full" disabled={submitting}>
          {submitting ? (
            <>
              <Spinner /> Creating...
            </>
          ) : (
            <>
              Create album <ArrowRight size={16} weight="bold" />
            </>
          )}
        </Button>
      </form>
    </Card>
  );
}
