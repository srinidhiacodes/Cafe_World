"use client";

import Link from "next/link";
import { AppNav, DrinkDrawing, TAPE, TILTS, TINTS, formatDate } from "@/components/ui";
import { useRequireSignIn, useStore } from "@/lib/store";

export default function JournalPage() {
  const { cities, ready } = useStore();
  useRequireSignIn();
  return (
    <main className="mx-auto max-w-[1360px] px-4 sm:px-8">
      <AppNav />
      <div className="pb-12 pt-2">
        <div className="font-hand text-[28px] font-bold leading-none text-berry-ink">every city, one page</div>
        <h1 className="m-0 mb-8 font-display text-[44px] font-semibold">My journal</h1>
        {ready && cities.length === 0 && (
          <p className="rounded-2xl bg-paper p-6 font-bold">
            No cafes yet. <Link href="/globe">Pin your first cafe</Link> and it will get its own page here.
          </p>
        )}
        <ul className="m-0 grid list-none grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-x-8 gap-y-12 p-0">
          {[...cities].reverse().map((c, i) => {
            const cover = c.cafes[0];
            return (
              <li key={c.slug}>
                <Link
                  href={`/city/${c.slug}`}
                  className="drop-in relative block bg-paper p-3 pb-4 text-ink no-underline shadow-[0_14px_28px_rgba(74,47,39,.15)] transition-transform hover:-translate-y-1"
                  style={{ rotate: `${TILTS[i % TILTS.length]}deg`, animationDelay: `${i * 0.06}s` }}
                >
                  <span className="absolute -top-2.5 left-1/2 h-5 w-16 -translate-x-1/2 opacity-90" style={{ background: TAPE[i % TAPE.length] }} aria-hidden="true" />
                  <span className="flex aspect-[4/3] items-center justify-center overflow-hidden" style={{ background: TINTS[i % TINTS.length] }}>
                    {cover.photos[0] ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={cover.photos[0]} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <DrinkDrawing kind={cover.kind} size={72} />
                    )}
                  </span>
                  <span className="mt-3 block font-display text-2xl font-semibold leading-none">{c.city}</span>
                  <span className="mt-1 block text-[13px] font-semibold text-sub">
                    {c.cafes.length} {c.cafes.length === 1 ? "cafe" : "cafes"} · {c.country} · latest {formatDate(cover.visitedOn)}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </main>
  );
}
