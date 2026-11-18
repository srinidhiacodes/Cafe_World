"use client";

import { useRouter } from "next/navigation";
import { AppNav, StampBadge, formatDate } from "@/components/ui";
import { BADGES } from "@/lib/badges";
import { computeStats } from "@/lib/cities";
import { useStore } from "@/lib/store";

function monthsAgo(iso: string): number {
  const d = new Date(`${iso}T12:00:00`);
  const now = new Date();
  return Math.max(0, (now.getFullYear() - d.getFullYear()) * 12 + now.getMonth() - d.getMonth());
}

export default function PassportPage() {
  const { cafes, name, signOut } = useStore();
  const router = useRouter();
  const s = computeStats(cafes);
  const unlocked = BADGES.filter((b) => b.check(cafes));
  const displayName = (name ?? "Cafe hopper").toUpperCase();
  const mrz = `P<CAF<${displayName.replace(/[^A-Z]/g, "<")}`.padEnd(36, "<").slice(0, 36);
  const mrz2 = `${String(s.cafes).padStart(2, "0")}CAFES<${String(s.cities).padStart(2, "0")}CITIES<${String(s.countries).padStart(2, "0")}CTRY`.padEnd(36, "<");

  return (
    <main className="mx-auto max-w-[1360px] px-4 sm:px-8">
      <AppNav
        right={
          <button
            type="button"
            onClick={() => {
              signOut();
              router.push("/");
            }}
            className="h-11 rounded-full border-2 border-[#E8D3C0] px-4 text-sm font-extrabold"
          >
            Sign out
          </button>
        }
      />
      <h1 className="sr-only">My passport</h1>
      <div className="flex justify-center pb-12 pt-3">
        <div className="flex w-full max-w-[1120px] flex-wrap overflow-hidden rounded-[28px] shadow-[0_30px_60px_rgba(74,47,39,.16),0_0_0_10px_#7FB98A]">
          <section
            aria-label="Passport details"
            className="flex min-w-0 flex-[1_1_420px] flex-col gap-5 bg-paper p-6 shadow-[inset_-24px_0_30px_-24px_rgba(74,47,39,.25)] sm:p-9"
            style={{ backgroundImage: "repeating-linear-gradient(135deg, rgba(168,213,162,.12) 0 2px, transparent 2px 10px)" }}
          >
            <div className="flex items-center justify-between">
              <span className="font-mono text-[13px] font-semibold tracking-[3px] text-matcha-ink">CAFE PASSPORT</span>
            </div>
            <div className="flex flex-wrap gap-5">
              <div className="flex h-40 w-32 flex-none items-center justify-center rounded-xl bg-berry-soft font-display text-6xl font-semibold shadow-[inset_0_-30px_0_#F49AB0]">
                {displayName.slice(0, 1)}
              </div>
              <dl className="m-0 grid min-w-0 flex-[1_1_200px] grid-cols-2 content-start gap-x-4 gap-y-3.5 font-mono">
                <div className="col-span-2">
                  <dt className="text-[10px] tracking-wider text-sub">NAME</dt>
                  <dd className="m-0 truncate text-xl font-semibold">{displayName}</dd>
                </div>
                <div>
                  <dt className="text-[10px] tracking-wider text-sub">FIRST STAMP</dt>
                  <dd className="m-0 text-[15px] font-semibold">{s.firstCafe ? formatDate(s.firstCafe.visitedOn, { day: "2-digit", month: "short", year: "numeric" }).toUpperCase() : "—"}</dd>
                </div>
                <div>
                  <dt className="text-[10px] tracking-wider text-sub">FAVOURITE VIBE</dt>
                  <dd className="m-0 text-[15px] font-semibold">{s.favouriteVibe?.toUpperCase() ?? "—"}</dd>
                </div>
                <div>
                  <dt className="text-[10px] tracking-wider text-sub">TOP CUP</dt>
                  <dd className="m-0 truncate text-[15px] font-semibold">{s.topCafe ? `${s.topCafe.name.toUpperCase()} ★${s.topCafe.rating}` : "—"}</dd>
                </div>
                <div>
                  <dt className="text-[10px] tracking-wider text-sub">FAVOURITE AREA</dt>
                  <dd className="m-0 truncate text-[15px] font-semibold">{s.topArea?.toUpperCase() ?? "—"}</dd>
                </div>
              </dl>
            </div>
            <div className="grid grid-cols-3 gap-2.5 text-center">
              <div className="rounded-2xl bg-berry-soft px-1 py-3.5">
                <div className="font-display text-[34px] font-semibold leading-none">{s.cafes}</div>
                <div className="text-[13px] font-extrabold">cafes</div>
              </div>
              <div className="rounded-2xl bg-matcha-soft px-1 py-3.5">
                <div className="font-display text-[34px] font-semibold leading-none">{s.cities}</div>
                <div className="text-[13px] font-extrabold">cities</div>
              </div>
              <div className="rounded-2xl bg-butter-soft px-1 py-3.5">
                <div className="font-display text-[34px] font-semibold leading-none">{s.countries}</div>
                <div className="text-[13px] font-extrabold">countries</div>
              </div>
            </div>
            {s.firstCafe && (
              <p className="m-0 flex items-center gap-2.5 text-[15px] font-bold">
                <span className="h-2.5 w-2.5 flex-none rounded-full bg-berry-deep" />
                Your first pin was {monthsAgo(s.firstCafe.visitedOn) || "less than 1"} {monthsAgo(s.firstCafe.visitedOn) === 1 ? "month" : "months"} ago, at {s.firstCafe.name} in {s.firstCafe.city}.
              </p>
            )}
            <div className="mt-auto break-all border-t-2 border-dashed border-line pt-3.5 font-mono text-[13px] leading-normal tracking-[2px] text-sub" aria-hidden="true">
              {mrz}
              <br />
              {mrz2}
            </div>
          </section>

          <section aria-labelledby="stamps-title" className="flex min-w-0 flex-[1_1_420px] flex-col gap-4 bg-paper p-6 shadow-[inset_24px_0_30px_-24px_rgba(74,47,39,.25)] sm:p-9">
            <div className="flex items-baseline justify-between">
              <h2 id="stamps-title" className="m-0 font-hand text-[40px] font-bold">
                my stamps
              </h2>
              <span className="text-sm font-extrabold text-sub">
                {unlocked.length} of {BADGES.length} collected
              </span>
            </div>
            <ul className="m-0 grid list-none grid-cols-[repeat(auto-fill,minmax(130px,1fr))] gap-4 p-0">
              {BADGES.map((b) => (
                <li key={b.id} className="flex min-h-[130px] flex-col items-center justify-center gap-1.5" title={b.hint}>
                  <StampBadge badge={b} unlocked={b.check(cafes)} progress={b.progress(cafes)} />
                </li>
              ))}
            </ul>
          </section>
        </div>
      </div>
    </main>
  );
}
