"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import BadgePopup from "@/components/BadgePopup";
import PinCafeDialog from "@/components/PinCafeDialog";
import Tour, { markTourDone, tourDone, type TourStep } from "@/components/Tour";
import { AppNav, TINTS, Toast, burstConfetti, formatDate } from "@/components/ui";
import type { Badge } from "@/lib/badges";
import { citySlug, computeStats, groupByCity } from "@/lib/cities";
import { useRequireSignIn, useStore } from "@/lib/store";
import { VIBES, type Cafe } from "@/lib/types";

const Globe = dynamic(() => import("@/components/Globe"), { ssr: false });

const TOUR: TourStep[] = [
  {
    target: "globe",
    title: "This is your globe",
    body: "Drag to spin it, scroll or pinch to zoom. Every cafe you visit becomes a pin here, and tapping a pin opens that city's polaroids.",
  },
  {
    target: "pin",
    title: "Pin a cafe",
    body: "Search the cafe on Google Maps or paste a Maps link. Add your photos, what you ordered, stars, the vibe and a little note.",
  },
  {
    target: "journal",
    title: "Your journal",
    body: "Your cafes, cities and countries add up here, with your latest stamps. Use the vibe chips to show only aesthetic or work-friendly spots.",
  },
  {
    target: "passport",
    title: "Collect stamps",
    body: "Earn passport stamps like First Pin, 5 Cafes Club and Filter Kaapi Lover. See them all on your Passport page.",
  },
];

const VIBE_BG: Record<string, string> = {
  Aesthetic: "bg-berry-soft",
  "Work-friendly": "bg-matcha-soft",
  Budget: "bg-butter-soft",
  "Date spot": "bg-lilac-soft",
};

export default function GlobePage() {
  const { cafes, name, ready, clearExamples, localToImport, importLocal, dismissImport } = useStore();
  useRequireSignIn();
  const router = useRouter();
  const [vibe, setVibe] = useState<string | null>(null);
  const [focus, setFocus] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [badges, setBadges] = useState<Badge[]>([]);
  const [touring, setTouring] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const globeBox = useRef<HTMLDivElement>(null);

  // First visit: show the guided tour once.
  useEffect(() => {
    if (ready && !tourDone()) setTouring(true);
  }, [ready]);
  const endTour = useCallback(() => {
    setTouring(false);
    markTourDone();
  }, []);

  const shown = useMemo(() => (vibe ? cafes.filter((c) => c.vibe === vibe) : cafes), [cafes, vibe]);
  const cities = useMemo(() => groupByCity(shown), [shown]);
  const stats = computeStats(cafes);
  const recent = [...cafes].sort((a, b) => b.visitedOn.localeCompare(a.visitedOn)).slice(0, 3);
  const hasExamples = cafes.some((c) => c.example);

  const select = useCallback(
    (slug: string) => {
      setFocus(slug);
      window.setTimeout(() => router.push(`/city/${slug}`), 750);
    },
    [router],
  );

  const onSaved = (cafe: Cafe, unlocked: Badge[]) => {
    setOpen(false);
    setVibe(null);
    setFocus(citySlug(cafe.city, cafe.country));
    setToast(`Pinned to ${cafe.city}!`);
    window.setTimeout(() => {
      const r = globeBox.current?.getBoundingClientRect();
      if (r) burstConfetti(r.left + r.width / 2, r.top + r.height / 2);
    }, 650);
    if (unlocked.length) window.setTimeout(() => setBadges(unlocked), 1500);
  };

  return (
    <main className="mx-auto max-w-[1360px] px-4 sm:px-8">
      <AppNav
        right={
          <Link href="/passport" aria-label="My passport" className="flex h-11 w-11 items-center justify-center rounded-full bg-berry font-display text-lg font-semibold text-ink no-underline">
            {(name ?? "Me").slice(0, 1).toUpperCase()}
          </Link>
        }
      />

      <div className="flex flex-wrap items-start gap-7 pb-10 pt-2">
        <aside data-tour="journal" className="flex min-w-0 max-w-[380px] flex-[1_1_300px] flex-col gap-5 rounded-[26px] bg-paper p-6 shadow-[0_14px_34px_rgba(74,47,39,.08)]">
          <div>
            <div className="font-hand text-[26px] font-bold leading-none text-berry-ink">{name ? `${name}'s` : "My"}</div>
            <h1 className="m-0 font-display text-[32px] font-semibold">Cafe Passport</h1>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="rounded-2xl bg-berry-soft px-1 py-3">
              <div className="font-display text-[28px] font-semibold leading-none">{stats.cafes}</div>
              <div className="text-xs font-extrabold">cafes</div>
            </div>
            <div className="rounded-2xl bg-matcha-soft px-1 py-3">
              <div className="font-display text-[28px] font-semibold leading-none">{stats.cities}</div>
              <div className="text-xs font-extrabold">cities</div>
            </div>
            <div className="rounded-2xl bg-butter-soft px-1 py-3">
              <div className="font-display text-[28px] font-semibold leading-none">{stats.countries}</div>
              <div className="text-xs font-extrabold">countries</div>
            </div>
          </div>

          {recent.length > 0 && (
            <div>
              <h2 className="m-0 mb-1.5 font-mono text-[11px] font-semibold tracking-[1.5px] text-sub">RECENT STAMPS</h2>
              <ul className="m-0 list-none p-0">
                {recent.map((c, i) => (
                  <li key={c.id}>
                    <Link href={`/city/${citySlug(c.city, c.country)}`} className="flex items-center gap-3 rounded-2xl p-2.5 text-ink no-underline hover:bg-[#FFF1E4]">
                      <span className="h-[54px] w-[46px] flex-none bg-paper p-1 pb-2.5 shadow-[0_3px_8px_rgba(74,47,39,.18)]" style={{ rotate: `${i % 2 ? 3 : -4}deg` }}>
                        {c.photos[0] ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={c.photos[0]} alt="" className="h-full w-full object-cover" />
                        ) : (
                          <span className="block h-full w-full" style={{ background: TINTS[i % TINTS.length] }} />
                        )}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-hand text-[22px] font-bold leading-none">{c.name}</span>
                        <span className="block truncate text-[12.5px] font-semibold text-sub">
                          {c.city} · {formatDate(c.visitedOn)}
                        </span>
                      </span>
                      <span className="text-xs font-extrabold text-berry-ink">★ {c.rating}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div>
            <h2 className="m-0 mb-2 font-mono text-[11px] font-semibold tracking-[1.5px] text-sub">SHOW ON GLOBE</h2>
            <div className="flex flex-wrap gap-2">
              <button type="button" aria-pressed={vibe === null} onClick={() => setVibe(null)} className={`rounded-full px-3.5 py-2 text-[13px] font-extrabold ${vibe === null ? "bg-ink text-cream" : "bg-[#F3E4D6]"}`}>
                All
              </button>
              {VIBES.map((v) => (
                <button key={v} type="button" aria-pressed={vibe === v} onClick={() => setVibe(vibe === v ? null : v)} className={`rounded-full px-3.5 py-2 text-[13px] font-extrabold ${vibe === v ? "bg-ink text-cream" : VIBE_BG[v]}`}>
                  {v}
                </button>
              ))}
            </div>
          </div>

          {localToImport > 0 && (
            <div className="flex flex-col gap-2.5 rounded-2xl bg-sky p-4">
              <p className="m-0 text-[14px] font-bold">
                You have {localToImport} {localToImport === 1 ? "cafe" : "cafes"} saved in this browser from before. Move {localToImport === 1 ? "it" : "them"} into your account?
              </p>
              {importError && <p className="m-0 text-[13px] font-bold text-berry-ink">{importError}</p>}
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={importing}
                  onClick={async () => {
                    setImporting(true);
                    setImportError(null);
                    const r = await importLocal();
                    setImporting(false);
                    if (r.ok) setToast("Moved into your account!");
                    else setImportError(r.error);
                  }}
                  className="h-10 rounded-full bg-ink px-4 text-[13px] font-extrabold text-cream disabled:opacity-70"
                >
                  {importing ? "Moving…" : "Move them"}
                </button>
                <button type="button" onClick={dismissImport} className="h-10 rounded-full px-3 text-[13px] font-extrabold text-ink underline">
                  Not now
                </button>
              </div>
            </div>
          )}

          {ready && cafes.length === 0 && (
            <div className="flex flex-col gap-3 rounded-2xl bg-berry-pale p-4">
              <div className="font-hand text-[24px] font-bold leading-none">your first stamp is waiting</div>
              <p className="m-0 text-[14px] font-semibold text-sub">Pin a cafe you loved recently. It only takes a minute.</p>
              <button type="button" onClick={() => setOpen(true)} className="h-11 self-start rounded-full bg-ink px-5 text-sm font-extrabold text-cream">
                Pin my first cafe
              </button>
            </div>
          )}

          {hasExamples && (
            <div className="rounded-2xl bg-butter-soft p-3.5 text-[13px] font-bold">
              These are example cafes to show how it looks.{" "}
              <button type="button" onClick={clearExamples} className="font-extrabold text-berry-ink underline">
                Clear examples
              </button>
            </div>
          )}
          <button type="button" onClick={() => setTouring(true)} className="self-start text-[13px] font-extrabold text-berry-ink underline">
            Take the tour again
          </button>
        </aside>

        <section className="relative order-first flex min-w-0 flex-[999_1_560px] flex-col items-center pb-20 md:order-none">
          <div ref={globeBox} data-tour="globe" className="relative aspect-square w-full max-w-[680px]">
            <div className="absolute left-[12%] top-[12%] h-[76%] w-[76%] translate-x-3 translate-y-4 rounded-full bg-[#FFE3EA]" aria-hidden="true" />
            <Globe cities={cities} focusSlug={focus} onSelect={select} className="absolute inset-0" />
            {cafes.length === 0 && (
              <div className="pointer-events-none absolute inset-x-0 top-[40%] text-center">
                <p className="m-0 inline-block rounded-2xl bg-paper/95 px-5 py-3 font-hand text-[28px] font-bold shadow">Your globe is waiting… pin your first cafe</p>
              </div>
            )}
            {vibe && cities.length === 0 && cafes.length > 0 && (
              <p className="absolute inset-x-0 top-[44%] m-0 text-center font-bold">No {vibe} cafes yet.</p>
            )}
          </div>
          <button
            type="button"
            data-tour="pin"
            onClick={() => setOpen(true)}
            className="absolute bottom-2 right-0 flex h-16 items-center gap-3 rounded-full bg-ink py-2 pl-2.5 pr-6 text-[17px] font-extrabold text-cream shadow-[0_14px_28px_rgba(74,47,39,.3)] transition-transform hover:-translate-y-0.5"
          >
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-berry">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#4A2F27" strokeWidth="2.6" strokeLinecap="round" aria-hidden="true">
                <path d="M12 5v14M5 12h14" />
              </svg>
            </span>
            Pin a cafe
          </button>
        </section>
      </div>

      <PinCafeDialog open={open} onClose={() => setOpen(false)} onSaved={onSaved} />
      <Toast message={toast} onDone={() => setToast(null)} />
      <BadgePopup badges={badges} onClose={() => setBadges([])} />
      <Tour
        open={touring && !open}
        steps={TOUR}
        onClose={endTour}
        finishLabel={cafes.length ? "Got it" : "Pin my first cafe"}
        onFinish={() => {
          if (!cafes.length) setOpen(true);
        }}
      />
    </main>
  );
}
