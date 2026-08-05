"use client";

import Link from "next/link";
import { Heart, Moon, Sun } from "@phosphor-icons/react";
import { useTheme } from "./ThemeProvider";

const linkBase =
  "press inline-flex h-9 items-center justify-center gap-2 rounded-full px-4 text-sm font-medium whitespace-nowrap";

export function Header() {
  const { theme, toggle } = useTheme();

  return (
    <header className="sticky top-0 z-40 border-b border-stone-200/70 bg-stone-50/80 backdrop-blur-md dark:border-stone-800 dark:bg-stone-950/80">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link
          href="/"
          className="flex items-center gap-2.5 rounded-full"
          aria-label="Wedding Album home"
        >
          <span className="flex size-9 items-center justify-center rounded-full bg-rose-600 text-white">
            <Heart size={18} weight="fill" />
          </span>
          <span className="font-display text-lg font-semibold tracking-tight text-stone-900 dark:text-stone-100">
            Wedding Album
          </span>
        </Link>

        <nav className="flex items-center gap-1.5" aria-label="Site">
          <Link
            href="/#create"
            className={`${linkBase} hidden text-stone-700 hover:bg-stone-200/70 sm:inline-flex dark:text-stone-300 dark:hover:bg-stone-800`}
          >
            Create an album
          </Link>
          <Link
            href="/upload"
            className={`${linkBase} border border-stone-300 bg-white text-stone-800 hover:bg-stone-100 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-100 dark:hover:bg-stone-800`}
          >
            Upload photos
          </Link>
          <button
            type="button"
            onClick={toggle}
            aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            className="press flex size-9 items-center justify-center rounded-full text-stone-600 hover:bg-stone-200/70 dark:text-stone-300 dark:hover:bg-stone-800"
          >
            {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
          </button>
        </nav>
      </div>
    </header>
  );
}
