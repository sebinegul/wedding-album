"use client";

import { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { Camera, X } from "@phosphor-icons/react";
import { Button } from "./ui";

/**
 * Live QR scanner backed by html5-qrcode. The scan line is decorative;
 * detection is handled by the library. Camera is stopped on unmount.
 */
export function QRScanner({
  onResult,
  onClose,
}: {
  onResult: (decodedUrl: string) => void;
  onClose: () => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [starting, setStarting] = useState(true);

  useEffect(() => {
    const scanner = new Html5Qrcode("wa-qr-scanner");
    let stopped = false;

    scanner
      .start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 220, height: 220 } },
        (decodedText) => {
          if (stopped) return;
          stopped = true;
          scanner.stop().catch(() => {});
          onResult(decodedText);
        },
        () => {
          /* frame without a code, keep scanning */
        },
      )
      .catch(() => {
        if (!stopped) setError("Camera unavailable or permission denied");
      })
      .finally(() => {
        if (!stopped) setStarting(false);
      });

    return () => {
      stopped = true;
      scanner.stop().catch(() => {});
      scanner.clear().catch(() => {});
    };
  }, [onResult]);

  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-4 dark:border-stone-700 dark:bg-stone-900">
      <div className="mb-3 flex items-center justify-between">
        <span className="flex items-center gap-2 text-sm font-medium text-stone-800 dark:text-stone-200">
          <Camera size={16} className="text-rose-600 dark:text-rose-400" />
          Point your camera at the QR code
        </span>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close scanner"
          className="press flex size-8 items-center justify-center rounded-full text-stone-400 hover:bg-stone-100 hover:text-stone-600 dark:hover:bg-stone-800"
        >
          <X size={15} />
        </button>
      </div>

      <div className="relative overflow-hidden rounded-xl bg-stone-950">
        <div
          id="wa-qr-scanner"
          ref={containerRef}
          className="min-h-64 [&_video]:h-64 [&_video]:w-full [&_video]:object-cover"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-4 top-1 h-8 rounded-full bg-gradient-to-b from-rose-300/0 via-rose-300/50 to-rose-300/0 animate-scanline"
        />
        {starting && (
          <div className="absolute inset-0 flex items-center justify-center text-xs text-stone-400">
            Starting camera...
          </div>
        )}
      </div>

      {error && (
        <p role="alert" className="mt-3 text-sm text-rose-600 dark:text-rose-400">
          {error}. You can enter the album code manually instead.
        </p>
      )}

      <div className="mt-3 flex justify-end">
        <Button size="sm" variant="secondary" onClick={onClose}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
