"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Logo } from "@/components/ui";
import { useStore } from "@/lib/store";

const Globe = dynamic(() => import("@/components/Globe"), { ssr: false });

export default function Landing() {
  const { cities, name, ready, signIn } = useStore();
  const router = useRouter();
  const [asking, setAsking] = useState(false);
  const [draft, setDraft] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (asking) inputRef.current?.focus();
  }, [asking]);

  const start = (e: React.FormEvent) => {
    e.preventDefault();
    signIn(draft);
    router.push("/globe");
  };

  return (
    <main className="mx-auto max-w-[1360px] px-4 sm:px-8">
      <nav className="flex flex-wrap items-center justify-between gap-4 py-6">
        <Logo />
        <div className="flex items-center gap-6 text-[15px] font-bold">
          <a href="#how" className="text-ink no-underline hover:text-berry-ink">
            How it works
          </a>
          {ready && name ? (
            <Link href="/globe" className="rounded-full bg-ink px-5 py-3 text-cream no-underline">
              Open my globe
            </Link>
          ) : (
            <button type="button" onClick={() => setAsking(true)} className="rounded-full bg-ink px-5 py-3 text-cream">
              Sign in
            </button>
          )}
        </div>
      </nav>

      <section className="flex flex-wrap items-center gap-10 pb-16 pt-2">
        <div className="flex min-w-0 flex-[1_1_440px] flex-col gap-6">
          <div className="-rotate-3 self-start bg-butter px-4 py-1.5 font-hand text-[26px] font-bold shadow-[0_4px_10px_rgba(74,47,39,.1)]">your cafe journal</div>
          <h1 className="m-0 text-balance font-display text-5xl font-semibold leading-[1.02] tracking-tight sm:text-[64px]">
            Pin every cafe you love on your own <span className="text-berry-deep">little globe</span>
          </h1>
          <p className="m-0 max-w-[520px] text-lg leading-relaxed text-sub sm:text-[19px]">
            Search a cafe, add your photos as polaroids, write what you ordered, and watch your world fill up with stamps.
          </p>
          {ready && name ? (
            <Link href="/globe" className="inline-flex h-14 items-center self-start rounded-full bg-ink px-7 text-base font-extrabold text-cream no-underline shadow-lg">
              Welcome back, {name}. Open my globe
            </Link>
          ) : (
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => setAsking(true)}
                className="flex h-14 items-center gap-3 rounded-full bg-paper px-6 text-base font-extrabold shadow-[0_10px_24px_rgba(74,47,39,.14)]"
              >
                <svg width="22" height="22" viewBox="0 0 48 48" aria-hidden="true">
                  <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
                  <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
                  <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
                  <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
                </svg>
                Continue with Google
              </button>
              <button type="button" onClick={() => setAsking(true)} className="h-14 rounded-full border-2 border-ink px-6 text-base font-extrabold">
                Use email instead
              </button>
            </div>
          )}
          <p className="m-0 text-sm font-semibold text-sub">Free to use · Your passport is private to you</p>
          <ul id="how" className="m-0 flex list-none flex-wrap gap-2.5 p-0" aria-label="How it works">
            <li className="rounded-2xl bg-sky px-4 py-2.5 text-sm font-extrabold">1 · Search Google Maps</li>
            <li className="rounded-2xl bg-berry-soft px-4 py-2.5 text-sm font-extrabold">2 · Add photo polaroids</li>
            <li className="rounded-2xl bg-matcha-soft px-4 py-2.5 text-sm font-extrabold">3 · Collect stamps</li>
          </ul>
        </div>

        <div className="relative min-w-0 flex-[1_1_520px]">
          <div className="relative mx-auto aspect-square w-full max-w-[640px]">
            <div className="absolute left-[12%] top-[12%] h-[76%] w-[76%] translate-x-3 translate-y-4 rounded-full bg-[#FFE3EA]" aria-hidden="true" />
            <Globe cities={cities} className="absolute inset-0" />
          </div>
        </div>
      </section>

      {asking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/35 p-6" onMouseDown={(e) => e.target === e.currentTarget && setAsking(false)}>
          <form
            onSubmit={start}
            role="dialog"
            aria-modal="true"
            aria-labelledby="name-title"
            className="drop-in flex w-full max-w-md flex-col gap-4 rounded-[28px] bg-cream p-8 shadow-2xl"
            onKeyDown={(e) => e.key === "Escape" && setAsking(false)}
          >
            <div className="font-hand text-[26px] font-bold leading-none text-berry-ink">nice to meet you</div>
            <h2 id="name-title" className="m-0 font-display text-3xl font-semibold">
              What should we call you?
            </h2>
            <label htmlFor="your-name" className="text-sm font-extrabold">
              Your name
            </label>
            <input
              ref={inputRef}
              id="your-name"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              maxLength={30}
              placeholder="e.g. Srinidhi"
              className="h-12 rounded-2xl border-2 border-line bg-paper px-4 text-base font-semibold"
            />
            <p className="m-0 rounded-2xl bg-butter-soft p-3 text-[13px] font-bold">
              Preview mode: Google sign-in switches on once Supabase is connected. Until then your cafes are saved in this browser only.
            </p>
            <button type="submit" className="h-13 rounded-full bg-ink py-3.5 font-extrabold text-cream">
              Start my passport
            </button>
          </form>
        </div>
      )}
    </main>
  );
}
