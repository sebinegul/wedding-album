"use client";

import Link from "next/link";
import {
  ArrowRight,
  QrCode,
  Sparkle,
  UploadSimple,
} from "@phosphor-icons/react";

const STEPS = [
  {
    n: "01",
    icon: Sparkle,
    title: "Create",
    body: "Name your album and get a shareable QR code in seconds. No account, no setup.",
  },
  {
    n: "02",
    icon: QrCode,
    title: "Share",
    body: "Put the code on a table card, print it in the invite, or send the link in the group chat.",
  },
  {
    n: "03",
    icon: UploadSimple,
    title: "Upload",
    body: "Guests add photos and videos from their phones. New uploads appear instantly for everyone.",
  },
];

export function HowItWorksSection() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
      <div className="mb-12 max-w-xl">
        <h2 className="font-display text-3xl font-semibold tracking-tight text-stone-900 sm:text-4xl dark:text-stone-100">
          Three steps to a full album
        </h2>
        <p className="mt-3 text-lg text-stone-600 dark:text-stone-400">
          No downloads, no accounts. Everything runs in the browser.
        </p>
      </div>

      <div className="grid gap-10 md:grid-cols-3 md:gap-8">
        {STEPS.map(({ n, icon: Icon, title, body }) => (
          <div key={n} className="relative">
            <p
              aria-hidden="true"
              className="font-display text-5xl font-semibold text-stone-200 select-none dark:text-stone-800"
            >
              {n}
            </p>
            <div className="mt-4 flex items-center gap-3">
              <span className="flex size-11 items-center justify-center rounded-2xl bg-rose-100 text-rose-600 dark:bg-rose-950 dark:text-rose-400">
                <Icon size={20} />
              </span>
              <h3 className="font-display text-xl font-semibold text-stone-900 dark:text-stone-100">
                {title}
              </h3>
            </div>
            <p className="mt-3 leading-relaxed text-stone-600 dark:text-stone-400">
              {body}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}

export function CTASection() {
  return (
    <section className="mx-auto max-w-6xl px-4 pb-24 sm:px-6">
      <div className="relative overflow-hidden rounded-3xl bg-stone-900 px-6 py-16 text-center sm:px-16 dark:bg-stone-900">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-24 left-1/2 h-64 w-[36rem] -translate-x-1/2 rounded-full bg-rose-600/25 blur-3xl"
        />
        <h2 className="relative font-display text-3xl font-semibold tracking-tight text-white sm:text-4xl">
          Your day, collected in one place
        </h2>
        <p className="relative mx-auto mt-3 max-w-md text-stone-300">
          Create the album now and share it the moment you are ready.
        </p>
        <Link
          href="/#create"
          className="press relative mt-8 inline-flex h-12 items-center justify-center gap-2 rounded-full bg-white px-7 text-base font-medium text-stone-900 hover:bg-rose-50"
        >
          Create your album
          <ArrowRight size={17} weight="bold" />
        </Link>
      </div>
    </section>
  );
}
