"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, UploadSimple } from "@phosphor-icons/react";
import { toast } from "sonner";
import type { Guest, GuestIdentity } from "@/lib/types";
import { getGuestIdentity, setGuestIdentity } from "@/lib/auth";
import { Button, Card, Input, Label, Spinner } from "./ui";
import { UploadZone } from "./UploadZone";

/**
 * Standalone upload page for guests who have the link but no album context.
 * Three states: pick an album by code, add a name, then upload.
 */
export function UploadPage({ initialAlbumId }: { initialAlbumId?: string }) {
  const router = useRouter();
  const [albumId, setAlbumId] = useState<string | null>(initialAlbumId ?? null);
  const [identity, setIdentity] = useState<GuestIdentity | null>(
    initialAlbumId ? getGuestIdentity(initialAlbumId) : null,
  );
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const pickAlbum = (e: React.FormEvent) => {
    e.preventDefault();
    if (code.trim().length < 3) {
      setError("Enter the album code from your invitation");
      return;
    }
    setAlbumId(code.trim());
    setIdentity(getGuestIdentity(code.trim()));
    setError(null);
  };

  const saveName = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!albumId || name.trim().length < 1) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/albums/${albumId}/guests`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not save your name");
      const guest = data.guest as Guest;
      setGuestIdentity(albumId, { id: guest.id, name: guest.name });
      setIdentity({ id: guest.id, name: guest.name });
      toast.success(`You are in, ${guest.name}!`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save your name");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-12 sm:px-6">
      <button
        type="button"
        onClick={() => router.push("/")}
        className="press mb-6 inline-flex items-center gap-1.5 text-sm font-medium text-stone-500 hover:text-stone-800 dark:text-stone-400 dark:hover:text-stone-200"
      >
        <ArrowLeft size={16} />
        Home
      </button>

      {!albumId && (
        <Card className="p-6 sm:p-8">
          <div className="mb-5 flex items-center gap-2">
            <span className="flex size-9 items-center justify-center rounded-full bg-rose-100 text-rose-600 dark:bg-rose-950 dark:text-rose-400">
              <UploadSimple size={17} />
            </span>
            <h1 className="font-display text-2xl font-semibold text-stone-900 dark:text-stone-100">
              Upload to an album
            </h1>
          </div>
          <p className="mb-5 text-sm text-stone-500 dark:text-stone-400">
            Enter the album code from your invitation, or open the QR code you
            received.
          </p>
          <form onSubmit={pickAlbum} noValidate className="space-y-4">
            <div>
              <Label htmlFor="wa-upload-code">Album code</Label>
              <Input
                id="wa-upload-code"
                value={code}
                onChange={(e) => {
                  setCode(e.target.value);
                  setError(null);
                }}
                placeholder="e.g. kQ7m2xPz"
                className="font-mono tracking-wide"
                aria-invalid={Boolean(error)}
                aria-describedby={error ? "wa-upload-code-error" : undefined}
              />
              {error && (
                <p
                  id="wa-upload-code-error"
                  role="alert"
                  className="mt-1.5 text-sm text-rose-600 dark:text-rose-400"
                >
                  {error}
                </p>
              )}
            </div>
            <Button type="submit" size="lg" className="w-full">
              Continue <ArrowRight size={16} weight="bold" />
            </Button>
          </form>
        </Card>
      )}

      {albumId && !identity && (
        <Card className="p-6 sm:p-8">
          <h1 className="mb-1 font-display text-2xl font-semibold text-stone-900 dark:text-stone-100">
            Add your name
          </h1>
          <p className="mb-5 text-sm text-stone-500 dark:text-stone-400">
            So the couple knows who to thank for each photo.
          </p>
          <form onSubmit={saveName} noValidate className="space-y-4">
            <div>
              <Label htmlFor="wa-upload-name">Your name</Label>
              <Input
                id="wa-upload-name"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  setError(null);
                }}
                placeholder="Priya"
                autoFocus
                autoComplete="name"
              />
            </div>
            {error && (
              <p role="alert" className="text-sm text-rose-600 dark:text-rose-400">
                {error}
              </p>
            )}
            <Button type="submit" size="lg" className="w-full" disabled={busy}>
              {busy ? (
                <>
                  <Spinner /> Saving...
                </>
              ) : (
                <>
                  Continue <ArrowRight size={16} weight="bold" />
                </>
              )}
            </Button>
          </form>
        </Card>
      )}

      {albumId && identity && (
        <>
          <div className="mb-6">
            <h1 className="font-display text-3xl font-semibold text-stone-900 dark:text-stone-100">
              Drop your photos here
            </h1>
            <p className="mt-1.5 text-sm text-stone-500 dark:text-stone-400">
              Uploading as {identity.name}.
            </p>
          </div>
          <UploadZone
            albumId={albumId}
            guest={identity}
            onUploaded={() => {
              router.push(`/album/${albumId}`);
            }}
          />
          <div className="mt-6 text-center">
            <Button variant="secondary" onClick={() => router.push(`/album/${albumId}`)}>
              Open the album instead
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
