"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Heart } from "@phosphor-icons/react";
import { toast } from "sonner";
import type { GuestIdentity } from "@/lib/types";
import { setGuestIdentity } from "@/lib/auth";
import { Button, Card, Input, Label, Spinner } from "./ui";

/**
 * Name capture screen shown to a guest who was invited to an album.
 * Joining stores a lightweight identity (localStorage only) and takes the
 * guest straight to the album.
 */
export function JoinForm({
  albumId,
  albumTitle,
  couple,
}: {
  albumId: string;
  albumTitle: string;
  couple: string;
}) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [joining, setJoining] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim().length < 1) {
      setError("Please enter your name");
      return;
    }
    setJoining(true);
    try {
      const res = await fetch(`/api/albums/${albumId}/guests`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not join the album");
      setGuestIdentity(albumId, data.guest as GuestIdentity);
      toast.success(`Welcome, ${name.trim()}!`);
      router.push(`/album/${albumId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not join the album");
    } finally {
      setJoining(false);
    }
  };

  return (
    <Card className="mx-auto w-full max-w-md p-6 sm:p-8">
      <div className="mb-6 flex flex-col items-center gap-3 text-center">
        <span className="flex size-12 items-center justify-center rounded-full bg-rose-600 text-white shadow-lg shadow-rose-600/25">
          <Heart size={20} weight="fill" />
        </span>
        <div>
          <h1 className="font-display text-2xl font-semibold text-stone-900 dark:text-stone-100">
            {albumTitle}
          </h1>
          <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">
            {couple}. You are invited to add your photos.
          </p>
        </div>
      </div>

      <form onSubmit={submit} noValidate className="space-y-5">
        <div>
          <Label htmlFor="wa-guest-name">Your name</Label>
          <Input
            id="wa-guest-name"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setError(null);
            }}
            placeholder="How should we thank you?"
            autoComplete="name"
            autoFocus
            aria-invalid={Boolean(error)}
            aria-describedby={error ? "wa-guest-name-error" : undefined}
          />
          {error && (
            <p
              id="wa-guest-name-error"
              role="alert"
              className="mt-1.5 text-sm text-rose-600 dark:text-rose-400"
            >
              {error}
            </p>
          )}
        </div>

        <Button type="submit" size="lg" className="w-full" disabled={joining}>
          {joining ? (
            <>
              <Spinner /> Joining...
            </>
          ) : (
            <>
              Join the album <ArrowRight size={16} weight="bold" />
            </>
          )}
        </Button>
      </form>
    </Card>
  );
}
