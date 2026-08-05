"use client";

import Link from "next/link";
import { Heart } from "@phosphor-icons/react";
import { Header } from "@/components/Header";

export default function NotFound() {
  return (
    <>
      <Header />
      <main className="flex min-h-[calc(100dvh-4rem)] items-center justify-center px-4">
        <div className="flex flex-col items-center gap-4 text-center">
          <span className="flex size-14 items-center justify-center rounded-full bg-stone-100 text-stone-400 dark:bg-stone-800">
            <Heart size={24} />
          </span>
          <h1 className="font-display text-3xl font-semibold text-stone-900 dark:text-stone-100">
            This album does not exist
          </h1>
          <p className="max-w-sm text-stone-500 dark:text-stone-400">
            The link may be wrong, or the album was removed. Check the code and
            try again.
          </p>
          <Link
            href="/"
            className="press mt-2 inline-flex h-11 items-center justify-center rounded-full bg-rose-600 px-6 text-sm font-medium text-white hover:bg-rose-700"
          >
            Back to Wedding Album
          </Link>
        </div>
      </main>
    </>
  );
}
