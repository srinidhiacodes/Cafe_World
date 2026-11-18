"use client";

import { useEffect, useRef } from "react";
import type { Badge } from "@/lib/badges";
import { StampBadge } from "./ui";

export default function BadgePopup({ badges, onClose }: { badges: Badge[]; onClose: () => void }) {
  const btn = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (badges.length) btn.current?.focus();
  }, [badges]);
  if (!badges.length) return null;
  return (
    <div className="fixed inset-0 z-[65] flex items-center justify-center bg-ink/30 p-6" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div role="dialog" aria-modal="true" aria-labelledby="badge-title" className="drop-in flex max-w-sm flex-col items-center gap-5 rounded-[28px] bg-paper p-8 text-center shadow-2xl">
        <div className="font-hand text-[28px] font-bold leading-none text-berry-ink">new stamp!</div>
        <div className="flex flex-wrap justify-center gap-4">
          {badges.map((b) => (
            <StampBadge key={b.id} badge={b} unlocked progress={1} animate />
          ))}
        </div>
        <h2 id="badge-title" className="m-0 font-display text-2xl font-semibold">
          {badges.map((b) => b.title).join(" + ")}
        </h2>
        <button ref={btn} type="button" onClick={onClose} className="h-12 rounded-full bg-ink px-8 font-extrabold text-cream">
          Add to my passport
        </button>
      </div>
    </div>
  );
}
