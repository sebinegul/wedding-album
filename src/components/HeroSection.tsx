"use client";

import Link from "next/link";
import Image from "next/image";
import { motion, useReducedMotion } from "motion/react";
import { ArrowRight, Images, Users, VideoCamera } from "@phosphor-icons/react";
import { RealTimeIndicator } from "./RealTimeIndicator";

const HERO_PHOTOS = [
  { seed: "wedding-bouquet", w: 600, h: 800 },
  { seed: "wedding-dance", w: 800, h: 600 },
  { seed: "wedding-rings", w: 600, h: 600 },
  { seed: "wedding-toast", w: 800, h: 600 },
];

const photoUrl = (seed: string, w: number, h: number) =>
  `https://picsum.photos/seed/${seed}/${w}/${h}`;

export function HeroSection() {
  const reduceMotion = useReducedMotion();

  return (
    <section className="mx-auto max-w-6xl px-4 pb-20 pt-14 sm:px-6 sm:pt-20">
      <div className="grid items-center gap-12 lg:grid-cols-12">
        {/* Copy */}
        <motion.div
          initial={reduceMotion ? false : { opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="lg:col-span-6"
        >
          <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-xs font-semibold tracking-wide text-rose-700 uppercase dark:border-rose-900 dark:bg-rose-950/50 dark:text-rose-400">
            Wedding album
          </p>
          <h1 className="font-display text-4xl leading-[1.08] font-semibold tracking-tight text-stone-900 sm:text-5xl lg:text-6xl dark:text-stone-100">
            Every guest photo.
            <br />
            <span className="text-rose-600 dark:text-rose-500">One beautiful album.</span>
          </h1>
          <p className="mt-5 max-w-md text-lg leading-relaxed text-stone-600 dark:text-stone-400">
            Create a shared album for your wedding day. Guests scan a QR code,
            upload their photos and videos, and everything appears in real time.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/#create"
              className="press inline-flex h-12 items-center justify-center gap-2 rounded-full bg-rose-600 px-7 text-base font-medium text-white shadow-lg shadow-rose-600/25 hover:bg-rose-700"
            >
              Create an album
              <ArrowRight size={17} weight="bold" />
            </Link>
            <Link
              href="/upload"
              className="press inline-flex h-12 items-center justify-center gap-2 rounded-full border border-stone-300 bg-white px-7 text-base font-medium text-stone-800 hover:bg-stone-100 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-100 dark:hover:bg-stone-800"
            >
              Upload to an album
            </Link>
          </div>
        </motion.div>

        {/* Live album preview */}
        <motion.div
          initial={reduceMotion ? false : { opacity: 0, y: 24, rotate: 1 }}
          animate={{ opacity: 1, y: 0, rotate: 0 }}
          transition={{ duration: 0.6, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
          className="relative lg:col-span-6"
        >
          <div className="rounded-3xl border border-stone-200 bg-white p-3 shadow-xl shadow-stone-900/10 dark:border-stone-800 dark:bg-stone-900 dark:shadow-black/30">
            <div className="mb-3 flex items-center justify-between px-2 pt-1">
              <div>
                <p className="font-display text-lg font-semibold text-stone-900 dark:text-stone-100">
                  Aarav and Meera
                </p>
                <p className="text-xs text-stone-500 dark:text-stone-400">The Big Day</p>
              </div>
              <RealTimeIndicator status="live" online={3} />
            </div>

            <div className="grid grid-cols-2 gap-2">
              {HERO_PHOTOS.map((p, i) => (
                <Image
                  key={p.seed}
                  src={photoUrl(p.seed, p.w, p.h)}
                  alt=""
                  width={p.w}
                  height={p.h}
                  priority={i < 2}
                  sizes="(max-width: 1024px) 45vw, 22vw"
                  className="aspect-[4/3] w-full rounded-2xl object-cover"
                />
              ))}
            </div>

            <div className="mt-3 flex items-center justify-between px-2 pb-1 text-xs text-stone-500 dark:text-stone-400">
              <span className="inline-flex items-center gap-1.5">
                <Images size={14} /> 14 photos
              </span>
              <span className="inline-flex items-center gap-1.5">
                <VideoCamera size={14} /> 2 videos
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Users size={14} /> 9 guests
              </span>
            </div>
          </div>

          {/* Floating chip */}
          <motion.div
            initial={reduceMotion ? false : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="absolute -bottom-5 -left-3 hidden items-center gap-2.5 rounded-2xl border border-stone-200 bg-white p-2.5 pr-4 shadow-lg sm:flex dark:border-stone-700 dark:bg-stone-900"
          >
            <Image
              src={photoUrl("wedding-guests", 80, 80)}
              alt=""
              width={80}
              height={80}
              className="size-10 rounded-xl object-cover"
            />
            <div>
              <p className="text-xs font-semibold text-stone-900 dark:text-stone-100">
                New photo from Priya
              </p>
              <p className="text-[11px] text-stone-500 dark:text-stone-400">just now · via QR scan</p>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
