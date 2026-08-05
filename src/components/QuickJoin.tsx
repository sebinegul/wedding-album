"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Scan } from "@phosphor-icons/react";
import { Button, Card, Input, Label } from "./ui";
import { QRScanner } from "./QRScanner";

/**
 * Quick join card for guests who already have an album code or a QR code.
 */
export function QuickJoin() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);

  const go = (albumId: string) => router.push(`/join/${albumId}`);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (code.trim().length < 3) {
      setError("Enter the album code from your invitation");
      return;
    }
    go(code.trim());
  };

  const handleScan = (url: string) => {
    setScanning(false);
    const match = url.match(/\/join\/([A-Za-z0-9]+)/);
    if (match) {
      go(match[1]);
      return;
    }
    const bare = url.trim().match(/^[A-Za-z0-9]{4,12}$/);
    if (bare) {
      go(bare[0]);
      return;
    }
    setError("That QR code is not a wedding album link");
  };

  return (
    <Card className="p-6 sm:p-8">
      <div className="mb-5 flex items-center gap-2">
        <span className="flex size-9 items-center justify-center rounded-full bg-stone-100 text-stone-600 dark:bg-stone-800 dark:text-stone-300">
          <Scan size={17} />
        </span>
        <h2 className="font-display text-xl font-semibold text-stone-900 dark:text-stone-100">
          Join an album
        </h2>
      </div>

      {scanning ? (
        <QRScanner onResult={handleScan} onClose={() => setScanning(false)} />
      ) : (
        <form onSubmit={submit} noValidate className="space-y-4">
          <div>
            <Label htmlFor="wa-code">Album code</Label>
            <Input
              id="wa-code"
              value={code}
              onChange={(e) => {
                setCode(e.target.value);
                setError(null);
              }}
              placeholder="e.g. kQ7m2xPz"
              className="font-mono tracking-wide"
              aria-invalid={Boolean(error)}
              aria-describedby={error ? "wa-code-error" : undefined}
            />
            {error && (
              <p
                id="wa-code-error"
                role="alert"
                className="mt-1.5 text-sm text-rose-600 dark:text-rose-400"
              >
                {error}
              </p>
            )}
          </div>

          <div className="flex gap-2">
            <Button type="submit" size="lg" className="flex-1">
              Join album <ArrowRight size={16} weight="bold" />
            </Button>
            <Button type="button" size="lg" variant="secondary" onClick={() => setScanning(true)}>
              Scan QR
            </Button>
          </div>
        </form>
      )}
    </Card>
  );
}
