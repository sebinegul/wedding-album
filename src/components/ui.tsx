import * as React from "react";
import { cn } from "@/lib/utils";

/* Button: pill radius, tactile press, WCAG AA contrast in every variant. */
export function Button({
  className,
  variant = "primary",
  size = "md",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
}) {
  return (
    <button
      className={cn(
        "press inline-flex items-center justify-center gap-2 rounded-full font-medium whitespace-nowrap",
        "disabled:pointer-events-none disabled:opacity-50",
        size === "sm" && "h-9 px-4 text-sm",
        size === "md" && "h-11 px-6 text-sm",
        size === "lg" && "h-12 px-7 text-base",
        variant === "primary" &&
          "bg-rose-600 text-white shadow-sm shadow-rose-600/20 hover:bg-rose-700",
        variant === "secondary" &&
          "border border-stone-300 bg-white text-stone-800 hover:bg-stone-100 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-100 dark:hover:bg-stone-800",
        variant === "ghost" &&
          "text-stone-700 hover:bg-stone-100 dark:text-stone-300 dark:hover:bg-stone-800",
        variant === "danger" &&
          "border border-rose-200 bg-white text-rose-700 hover:bg-rose-50 dark:border-rose-900 dark:bg-stone-900 dark:text-rose-400 dark:hover:bg-rose-950/40",
        className,
      )}
      {...props}
    />
  );
}

export function Input({
  className,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "h-11 w-full rounded-xl border border-stone-300 bg-white px-4 text-stone-900 placeholder:text-stone-400",
        "transition-colors duration-150 focus:border-rose-500 focus:outline-none focus:ring-2 focus:ring-rose-500/30",
        "dark:border-stone-700 dark:bg-stone-900 dark:text-stone-100 dark:placeholder:text-stone-500",
        className,
      )}
      {...props}
    />
  );
}

export function Label({
  className,
  ...props
}: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label
      className={cn(
        "mb-2 block text-sm font-medium text-stone-800 dark:text-stone-200",
        className,
      )}
      {...props}
    />
  );
}

export function Spinner({ className }: { className?: string }) {
  return (
    <span
      role="status"
      aria-label="Loading"
      className={cn(
        "inline-block size-4 animate-spin rounded-full border-2 border-current border-t-transparent",
        className,
      )}
    />
  );
}

export function Card({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-stone-200/80 bg-white shadow-sm shadow-stone-900/5",
        "dark:border-stone-800 dark:bg-stone-900 dark:shadow-black/20",
        className,
      )}
      {...props}
    />
  );
}
