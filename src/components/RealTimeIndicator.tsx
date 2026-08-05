"use client";

import { motion } from "motion/react";
import type { RealtimeStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

const COPY: Record<RealtimeStatus, string> = {
  connecting: "Connecting",
  live: "Live",
  offline: "Offline",
};

/**
 * Live connection indicator. The colored dot carries real semantic state
 * (connected / connecting / offline), which is the one case a status dot
 * is warranted.
 */
export function RealTimeIndicator({
  status,
  online,
  className,
}: {
  status: RealtimeStatus;
  online: number | null;
  className?: string;
}) {
  const isLive = status === "live";
  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        "inline-flex h-8 items-center gap-2 rounded-full border border-stone-200 bg-white px-3 text-xs font-medium text-stone-600 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-300",
        className,
      )}
    >
      <motion.span
        className={cn(
          "size-2 rounded-full",
          status === "live" && "bg-emerald-500",
          status === "connecting" && "bg-amber-400",
          status === "offline" && "bg-stone-400 dark:bg-stone-500",
        )}
        animate={
          status === "connecting"
            ? { opacity: [1, 0.35, 1], scale: [1, 0.8, 1] }
            : { opacity: 1, scale: 1 }
        }
        transition={{ duration: 1.2, repeat: status === "connecting" ? Infinity : 0 }}
      />
      <span>{COPY[status]}</span>
      {isLive && online !== null && (
        <motion.span
          initial={{ opacity: 0, y: 3 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-stone-400 dark:text-stone-500"
        >
          · {online} online
        </motion.span>
      )}
    </div>
  );
}
