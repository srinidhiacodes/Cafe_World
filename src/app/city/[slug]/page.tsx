"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import BadgePopup from "@/components/BadgePopup";
import PinCafeDialog from "@/components/PinCafeDialog";
import Polaroid from "@/components/Polaroid";
import { AppNav, Toast, formatDate } from "@/components/ui";
import type { Badge } from "@/lib/badges";
import { citySlug, computeStats } from "@/lib/cities";
import { formatCoords } from "@/lib/geo";
import { useRequireSignIn, useStore } from "@/lib/store";
import type { Cafe } from "@/lib/types";

const Globe = dynamic(() => import("@/components/Globe"), { ssr: false });

export default function CityPage() {
  const { slug } = useParams<{ slug: string }>();
  const router = useRouter();
  const { cities, ready, deleteCafe } = useStore();
  const [editing, setEditing] = useState<Cafe | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [badges, setBadges] = useState<Badge[]>([]);
  useRequireSignIn();
  const city = cities.find((c) => c.slug === slug);

  const onSaved = (cafe: Cafe, unlocked: Badge[]) => {
    setEditing(null);
    setToast("Saved!");
    const newSlug = citySlug(cafe.city, cafe.country);
    if (newSlug !== slug) router.push(`/city/${newSlug}`);
    if (unlocked.length) setBadges(unlocked);
  };

  if (!ready) {
    return <main className="mx-auto max-w-[1360px] px-4 py-20 text-center font-bold text-sub sm:px-8">Opening your journal…</main>;
  }

  if (!city) {
    return (
      <main className="mx-auto max-w-[1360px] px-4 sm:px-8">
        <AppNav />
        <div className="mx-auto mt-16 max-w-md rounded-[26px] bg-paper p-8 text-center shadow">
          <h1 className="m-0 font-display text-3xl font-semibold">No cafes here yet</h1>
          <p className="text-sub">This city isn&apos;t on your globe. Pin a cafe here and it will show up.</p>
          <Link href="/globe" className="inline-flex h-12 items-center rounded-full bg-ink px-6 font-extrabold text-cream no-underline">
            Back to my globe
          </Link>
        </div>
      </main>
    );
  }

  const stats = computeStats(city.cafes);

  return (
    <main className="mx-auto max-w-[1360px] px-4 sm:px-8">
      <AppNav />
      <div className="flex flex-wrap items-start gap-8 pb-12 pt-1">
        <div className="flex min-w-0 max-w-[460px] flex-[1_1_360px] flex-col gap-4">
          <Link href="/globe" className="inline-flex items-center gap-1.5 self-start text-sm font-extrabold text-ink no-underline">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#4A2F27" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M15 5l-7 7 7 7" />
            </svg>
            Back to my globe
          </Link>
          <div className="relative aspect-square w-full overflow-hidden rounded-[30px] bg-[#FFE3EA]">
            <Globe cities={cities} focusSlug={city.slug} zoom={3.1} showLabels={false} autoRotate={false} className="absolute inset-0" />
          </div>
          <div>
            <div className="font-mono text-xs font-semibold tracking-[2px] text-berry-ink">
              {formatCoords(city.lat, city.lon)} · {city.country.toUpperCase()}
            </div>
            <h1 className="m-0 mt-1 font-display text-5xl font-semibold leading-none">{city.city}</h1>
            <div className="font-hand text-[26px] font-bold text-sub">
              {city.cafes.length} {city.cafes.length === 1 ? "memory" : "memories"} · since {formatDate(city.firstVisit, { month: "short", year: "numeric" })}
            </div>
          </div>
          <div className="flex flex-wrap gap-2.5">
            {stats.topCafe && (
              <span className="rounded-2xl bg-butter-soft px-3.5 py-2 text-[13.5px] font-extrabold">
                Top cup: {stats.topCafe.name} ★{stats.topCafe.rating}
              </span>
            )}
            {stats.favouriteVibe && <span className="rounded-2xl bg-berry-soft px-3.5 py-2 text-[13.5px] font-extrabold">Mostly: {stats.favouriteVibe}</span>}
          </div>
        </div>

        <section
          className="min-w-0 flex-[999_1_560px] rounded-[26px] bg-paper p-6 shadow-[0_14px_34px_rgba(74,47,39,.08)] sm:p-8"
          style={{ backgroundImage: "repeating-linear-gradient(180deg, transparent 0, transparent 35px, #F6E8DB 35px, #F6E8DB 36px)" }}
          aria-labelledby="city-cafes"
        >
          <div className="mb-7 flex flex-wrap items-baseline justify-between gap-3">
            <h2 id="city-cafes" className="m-0 font-hand text-[40px] font-bold">
              my {city.city} cafes
            </h2>
            <span className="text-[13.5px] font-bold text-sub">Tap a polaroid to flip it</span>
          </div>
          <div className="grid grid-cols-[repeat(auto-fill,minmax(210px,1fr))] gap-x-7 gap-y-9">
            {city.cafes.map((c, i) => (
              <Polaroid
                key={c.id}
                cafe={c}
                index={i}
                onEdit={setEditing}
                onDelete={async (cafe) => {
                  const last = city.cafes.length === 1;
                  const r = await deleteCafe(cafe.id);
                  if (!r.ok) {
                    setToast(r.error);
                    return;
                  }
                  setToast(`Removed ${cafe.name}`);
                  if (last) router.push("/globe");
                }}
              />
            ))}
          </div>
        </section>
      </div>
      <PinCafeDialog open={Boolean(editing)} editing={editing} onClose={() => setEditing(null)} onSaved={onSaved} />
      <Toast message={toast} onDone={() => setToast(null)} />
      <BadgePopup badges={badges} onClose={() => setBadges([])} />
    </main>
  );
}
