"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import confetti from "canvas-confetti";
import {
  ArrowLeft,
  CaretDown,
  GridFour,
  Images,
  ListBullets,
  LockKey,
  MagnifyingGlass,
  ShareNetwork,
  ShieldCheck,
  UploadSimple,
  Users,
  VideoCamera,
} from "@phosphor-icons/react";
import { toast } from "sonner";
import type { Album, Guest, GuestIdentity, MediaItem } from "@/lib/types";
import { getGuestIdentity, getOwnerId, setGuestIdentity } from "@/lib/auth";
import { cn } from "@/lib/utils";
import { useRealtime } from "@/hooks/useRealtime";
import { MediaGallery, type GalleryView } from "./MediaGallery";
import { UploadZone } from "./UploadZone";
import { Lightbox } from "./Lightbox";
import { ShareDialog } from "./ShareDialog";
import { RealTimeIndicator } from "./RealTimeIndicator";
import { Button, Input, Spinner } from "./ui";

type Filter = "all" | "image" | "video";

export function AlbumView({
  album,
  initialMedia,
  initialGuests,
}: {
  album: Album;
  initialMedia: MediaItem[];
  initialGuests: Guest[];
}) {
  const router = useRouter();
  const reduceMotion = useReducedMotion();

  const [media, setMedia] = useState<MediaItem[]>(initialMedia);
  const [guests, setGuests] = useState<Guest[]>(initialGuests);
  const [identity, setIdentity] = useState<GuestIdentity | null>(() => getGuestIdentity(album.id));
  const [ownerId] = useState<string | null>(() => getOwnerId(album.id));

  const [view, setView] = useState<GalleryView>("grid");
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [shareOpen, setShareOpen] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [nameDraft, setNameDraft] = useState("");
  const [nameSaving, setNameSaving] = useState(false);
  const [adminPrompt, setAdminPrompt] = useState(false);
  const [adminCode, setAdminCode] = useState<string | null>(null);
  const [adminUnlocking, setAdminUnlocking] = useState(false);

  // Admin mode is deliberately session-only: the admin code never touches
  // localStorage. Unlock once per page visit; the server re-validates the
  // code on every privileged request (delete any photo).
  const isOwner = ownerId === album.ownerId;
  const isAdmin = Boolean(adminCode);
  const photoCount = media.filter((m) => m.kind === "image").length;
  const videoCount = media.length - photoCount;

  const { status, online } = useRealtime(album.id, {
    onNewMedia: (item) => {
      setMedia((prev) => [item, ...prev.filter((m) => m.id !== item.id)]);
      if (!document.hidden) {
        confetti({
          particleCount: 45,
          spread: 60,
          startVelocity: 28,
          gravity: 0.85,
          ticks: 90,
          origin: { x: 0.5, y: 0.9 },
          colors: ["#e11d48", "#f43f5e", "#fda4af", "#fecdd3"],
          disableForReducedMotion: true,
        });
      }
    },
    onMediaDeleted: (mediaId) => {
      setMedia((prev) => prev.filter((m) => m.id !== mediaId));
    },
    onGuestJoined: (guest) => {
      setGuests((prev) => (prev.some((g) => g.id === guest.id) ? prev : [...prev, guest]));
    },
  });

  const filtered = useMemo(() => {
    let list = media;
    if (filter !== "all") list = list.filter((m) => m.kind === filter);
    const q = query.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (m) =>
          m.uploadedByName.toLowerCase().includes(q) ||
          m.originalName.toLowerCase().includes(q),
      );
    }
    return list;
  }, [media, filter, query]);

  // Guests see only their own uploads; owner and admin see everything.
  const visibleMedia = useMemo(() => {
    if (isOwner || isAdmin) return filtered;
    return filtered.filter((m) => m.uploadedBy === identity?.id);
  }, [filtered, isOwner, isAdmin, identity]);

  const saveName = async (e: React.FormEvent) => {
    e.preventDefault();
    if (nameDraft.trim().length < 1) return;
    setNameSaving(true);
    try {
      const res = await fetch(`/api/albums/${album.id}/guests`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: nameDraft.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not save your name");
      const guest = data.guest as Guest;
      setGuestIdentity(album.id, { id: guest.id, name: guest.name });
      setIdentity({ id: guest.id, name: guest.name });
      setGuests((prev) => (prev.some((g) => g.id === guest.id) ? prev : [...prev, guest]));
      toast.success(`You are in, ${guest.name}!`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save your name");
    } finally {
      setNameSaving(false);
    }
  };

  const deleteItem = async (item: MediaItem) => {
    try {
      const res = await fetch(`/api/albums/${album.id}/media/${item.id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          guestId: identity?.id ?? undefined,
          ownerId: ownerId ?? undefined,
          adminCode: isAdmin ? adminCode : undefined,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Could not remove this item");
      }
      setMedia((prev) => prev.filter((m) => m.id !== item.id));
      setLightboxIndex(null);
      toast.success("Removed from the album");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not remove this item");
    }
  };

  const unlockAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminCode || adminCode.trim().length < 4) return;
    setAdminUnlocking(true);
    try {
      const res = await fetch("/api/admin/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adminCode: adminCode.trim() }),
      });
      if (!res.ok) {
        setAdminCode(null);
        toast.error("That admin code is not right");
        return;
      }
      setAdminPrompt(false);
      toast.success("Admin mode on - you can see and remove every photo");
    } catch {
      toast.error("Could not verify the admin code");
    } finally {
      setAdminUnlocking(false);
    }
  };

  const turnOffAdmin = () => {
    setAdminCode(null);
    setAdminPrompt(false);
    toast("Admin mode off");
  };

  const viewControls = (
    <div
      className="inline-flex items-center gap-1 rounded-full border border-stone-200 bg-stone-100 p-1 dark:border-stone-700 dark:bg-stone-800"
      role="group"
      aria-label="Gallery view"
    >
      {(
        [
          { key: "grid", label: "Grid view", icon: GridFour },
          { key: "timeline", label: "Timeline view", icon: ListBullets },
          { key: "carousel", label: "Carousel view", icon: CaretDown },
        ] as const
      ).map(({ key, label, icon: Icon }) => (
        <button
          key={key}
          type="button"
          onClick={() => setView(key)}
          aria-label={label}
          aria-pressed={view === key}
          className={cn(
            "press flex size-8 items-center justify-center rounded-full transition-colors",
            view === key
              ? "bg-white text-stone-900 shadow-sm dark:bg-stone-900 dark:text-stone-100"
              : "text-stone-500 hover:text-stone-800 dark:text-stone-400 dark:hover:text-stone-200",
          )}
        >
          <Icon size={16} />
        </button>
      ))}
    </div>
  );

  const filterControls = (
    <div className="flex gap-1.5" role="group" aria-label="Filter media">
      {(
        [
          { key: "all", label: "All" },
          { key: "image", label: "Photos" },
          { key: "video", label: "Videos" },
        ] as const
      ).map(({ key, label }) => (
        <button
          key={key}
          type="button"
          onClick={() => setFilter(key)}
          aria-pressed={filter === key}
          className={cn(
            "press h-8 rounded-full px-3.5 text-sm font-medium transition-colors",
            filter === key
              ? "bg-rose-600 text-white shadow-sm shadow-rose-600/25"
              : "text-stone-600 hover:bg-stone-200/70 dark:text-stone-300 dark:hover:bg-stone-800",
          )}
        >
          {label}
        </button>
      ))}
    </div>
  );

  return (
    <div className="mx-auto max-w-6xl px-4 pb-24 pt-6 sm:px-6">
      {/* Back + identity bar */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => router.push("/")}
          className="press inline-flex items-center gap-1.5 text-sm font-medium text-stone-500 hover:text-stone-800 dark:text-stone-400 dark:hover:text-stone-200"
        >
          <ArrowLeft size={16} />
          All albums
        </button>
        <RealTimeIndicator status={status} online={online} />
      </div>

      {/* Header */}
      <motion.div
        initial={reduceMotion ? false : { opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
        className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"
      >
        <div className="min-w-0">
          <h1 className="font-display text-3xl font-semibold tracking-tight text-stone-900 sm:text-4xl dark:text-stone-100">
            {album.title}
          </h1>
          <p className="mt-1.5 font-display text-lg italic text-rose-600 dark:text-rose-400">
            {album.couple}
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-stone-500 dark:text-stone-400">
            <span className="inline-flex items-center gap-1.5">
              <Images size={15} />
              {photoCount} photo{photoCount === 1 ? "" : "s"}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <VideoCamera size={15} />
              {videoCount} video{videoCount === 1 ? "" : "s"}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Users size={15} />
              {guests.length} guest{guests.length === 1 ? "" : "s"}
            </span>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {isAdmin ? (
            <Button variant="secondary" onClick={turnOffAdmin} title="Turn off admin mode">
              <ShieldCheck size={16} weight="fill" className="text-emerald-600 dark:text-emerald-400" />
              Admin on
            </Button>
          ) : (
            <Button variant="ghost" onClick={() => setAdminPrompt((v) => !v)}>
              <LockKey size={16} />
              Admin
            </Button>
          )}
          <Button variant="secondary" onClick={() => setShareOpen(true)}>
            <ShareNetwork size={16} />
            Share
          </Button>
          <Button onClick={() => setUploadOpen((v) => !v)}>
            <UploadSimple size={16} weight="bold" />
            {uploadOpen ? "Close upload" : "Add photos"}
          </Button>
        </div>
      </motion.div>

      {/* Admin unlock */}
      {adminPrompt && !isAdmin && (
        <motion.form
          onSubmit={unlockAdmin}
          initial={reduceMotion ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
          className="mb-6 flex flex-col gap-3 rounded-2xl border border-stone-200 bg-stone-50 p-4 sm:flex-row sm:items-center dark:border-stone-800 dark:bg-stone-900"
        >
          <p className="text-sm text-stone-700 sm:flex-1 dark:text-stone-300">
            Enter the admin code to manage every photo in this album.
          </p>
          <div className="flex w-full gap-2 sm:w-auto">
            <Input
              type="password"
              value={adminCode ?? ""}
              onChange={(e) => setAdminCode(e.target.value)}
              placeholder="Admin code"
              aria-label="Admin code"
              autoComplete="off"
              className="h-9 sm:w-44"
            />
            <Button type="submit" size="sm" disabled={adminUnlocking}>
              {adminUnlocking ? <Spinner /> : "Unlock"}
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={() => setAdminPrompt(false)}>
              Cancel
            </Button>
          </div>
        </motion.form>
      )}

      {/* Identity gate */}
      {!identity && (
        <motion.form
          onSubmit={saveName}
          initial={reduceMotion ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
          className="mb-6 flex flex-col gap-3 rounded-2xl border border-rose-200 bg-rose-50/70 p-4 sm:flex-row sm:items-center dark:border-rose-900 dark:bg-rose-950/30"
        >
          <p className="text-sm text-stone-700 sm:flex-1 dark:text-stone-300">
            Add your name so the couple knows who to thank for each photo.
          </p>
          <div className="flex w-full gap-2 sm:w-auto">
            <Input
              value={nameDraft}
              onChange={(e) => setNameDraft(e.target.value)}
              placeholder="Your name"
              aria-label="Your name"
              className="h-9 sm:w-44"
              autoComplete="name"
            />
            <Button type="submit" size="sm" disabled={nameSaving}>
              {nameSaving ? <Spinner /> : "Save"}
            </Button>
          </div>
        </motion.form>
      )}

      {/* Upload panel */}
      <AnimatePresence initial={false}>
        {uploadOpen && (
          <motion.div
            initial={reduceMotion ? false : { opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="mb-8 overflow-hidden"
          >
            <UploadZone
              albumId={album.id}
              guest={identity}
              onUploaded={(added) => {
                setMedia((prev) => [...added, ...prev]);
                setUploadOpen(false);
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Toolbar */}
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        {viewControls}
        <div className="flex flex-1 flex-wrap items-center justify-end gap-3">
          {filterControls}
          <div className="relative">
            <MagnifyingGlass
              size={15}
              className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400"
            />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by guest or file name"
              aria-label="Search the album"
              className="h-9 w-56 rounded-full pl-9 text-sm"
            />
          </div>
        </div>
      </div>

      {/* Gallery */}
      <MediaGallery
        media={visibleMedia}
        view={view}
        onOpen={(index) => setLightboxIndex(index)}
        emptyTitle={
          !isOwner && !isAdmin && media.length > 0
            ? "You have not uploaded anything yet"
            : undefined
        }
        emptyBody={
          !isOwner && !isAdmin && media.length > 0
            ? "Tap Add photos and your uploads will show up here for you. Only you and the couple can see this view."
            : undefined
        }
      />

      {/* Lightbox */}
      {lightboxIndex !== null && visibleMedia[lightboxIndex] && (
        <Lightbox
          items={visibleMedia}
          index={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
          onNavigate={(i) => setLightboxIndex(i)}
          canDelete={(item) => isOwner || isAdmin || item.uploadedBy === identity?.id}
          onDelete={deleteItem}
        />
      )}

      {/* Share dialog */}
      <ShareDialog open={shareOpen} onClose={() => setShareOpen(false)} album={album} />
    </div>
  );
}
