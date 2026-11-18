"use client";

import { useEffect, useRef, useState } from "react";
import type { Cafe } from "@/lib/types";
import { DrinkDrawing, Stars, TAPE, TILTS, TINTS, formatDate } from "./ui";

interface Props {
  cafe: Cafe;
  index: number;
  onEdit?: (cafe: Cafe) => void;
  onDelete?: (cafe: Cafe) => void;
}

export default function Polaroid({ cafe, index, onEdit, onDelete }: Props) {
  const [flipped, setFlipped] = useState(false);
  const [photo, setPhoto] = useState(0);
  const [confirming, setConfirming] = useState(false);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const timer = useRef<number | undefined>(undefined);
  const rot = TILTS[index % TILTS.length];
  const mapsUrl =
    cafe.mapsUrl ??
    `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent([cafe.name, cafe.area, cafe.city].filter(Boolean).join(", "))}`;

  useEffect(() => () => window.clearTimeout(timer.current), []);

  const toggle = () => setFlipped((f) => !f);
  const askDelete = () => {
    if (!confirming) {
      setConfirming(true);
      timer.current = window.setTimeout(() => setConfirming(false), 3500);
      return;
    }
    onDelete?.(cafe);
  };

  return (
    <div
      className={`flip drop-in relative h-[340px] w-full ${flipped ? "is-flipped" : ""}`}
      style={{ animationDelay: `${0.08 * index + 0.1}s`, rotate: `${rot}deg` }}
      onPointerMove={(e) => {
        if (e.pointerType !== "mouse") return;
        const r = e.currentTarget.getBoundingClientRect();
        setTilt({ x: ((e.clientY - r.top) / r.height - 0.5) * -8, y: ((e.clientX - r.left) / r.width - 0.5) * 10 });
      }}
      onPointerLeave={() => setTilt({ x: 0, y: 0 })}
    >
      <div className="flip-inner" style={{ transform: `rotateX(${tilt.x}deg) rotateY(${(flipped ? 180 : 0) + tilt.y}deg)` }}>
        {/* Front */}
        <div className="flip-face bg-paper p-2.5 pb-3.5 shadow-[0_14px_28px_rgba(74,47,39,.16)]">
          <span className="absolute left-1/2 -top-2.5 z-10 h-5 w-16 -translate-x-1/2 -rotate-3 opacity-90" style={{ background: TAPE[index % TAPE.length] }} aria-hidden="true" />
          <button
            type="button"
            onClick={toggle}
            className="block w-full text-left"
            aria-label={`${cafe.name}. Show what you ordered and your note`}
          >
            <div className="relative flex aspect-square items-center justify-center overflow-hidden" style={{ background: TINTS[index % TINTS.length] }}>
              {cafe.photos.length > 0 ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={cafe.photos[photo]} alt={`Photo at ${cafe.name}`} className="develop h-full w-full object-cover" />
              ) : (
                <DrinkDrawing kind={cafe.kind} />
              )}
            </div>
            <div className="mt-2.5 truncate font-hand text-[26px] font-bold leading-none">{cafe.name}</div>
            <div className="mt-1 truncate text-[12.5px] font-semibold text-sub">
              {[cafe.area, formatDate(cafe.visitedOn)].filter(Boolean).join(" · ")}
            </div>
          </button>
          {cafe.photos.length > 1 && (
            <div className="absolute bottom-[86px] left-1/2 flex -translate-x-1/2 gap-1.5">
              {cafe.photos.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setPhoto(i)}
                  aria-label={`Photo ${i + 1} of ${cafe.photos.length}`}
                  aria-pressed={i === photo}
                  className={`h-2.5 w-2.5 rounded-full border border-white ${i === photo ? "bg-white" : "bg-white/40"}`}
                />
              ))}
            </div>
          )}
          {cafe.example && (
            <span className="absolute right-2 top-2 rounded-full bg-paper/90 px-2 py-0.5 text-[10.5px] font-extrabold text-sub">example</span>
          )}
        </div>

        {/* Back */}
        <div className="flip-face flip-back flex flex-col gap-2.5 bg-paper p-4 shadow-[0_14px_28px_rgba(74,47,39,.16)]">
          <div
            className="absolute right-3 top-3 flex h-[72px] w-[72px] -rotate-[14deg] flex-col items-center justify-center rounded-full border-[2.5px] border-[#D94F72] font-mono font-semibold text-[#D94F72]"
            aria-hidden="true"
          >
            <span className="max-w-[60px] truncate text-[7.5px] tracking-wider">{cafe.city.toUpperCase()}</span>
            <span className="text-[11px]">VISITED</span>
            <span className="text-[7.5px]">{formatDate(cafe.visitedOn, { day: "2-digit", month: "short", year: "2-digit" }).toUpperCase()}</span>
          </div>
          <button type="button" onClick={toggle} className="pr-[76px] text-left font-hand text-[26px] font-bold leading-none" aria-label={`${cafe.name}. Show the photo`}>
            {cafe.name}
          </button>
          <div>
            <div className="font-mono text-[10px] font-semibold tracking-wider text-sub">ORDERED</div>
            <div className="text-sm font-extrabold">{cafe.ordered || "—"}</div>
          </div>
          <div className="flex items-center justify-between gap-2">
            <Stars value={cafe.rating} />
            <span className="rounded-full bg-berry-soft px-2.5 py-1 text-[11.5px] font-extrabold">{cafe.vibe}</span>
          </div>
          <p className="m-0 line-clamp-4 flex-1 font-hand text-xl leading-tight">{cafe.note || "A lovely visit."}</p>
          <a
            href={mapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex h-10 items-center justify-center gap-1.5 rounded-full bg-sky text-[13px] font-extrabold text-ink no-underline"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#4A2F27" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21z" />
              <circle cx="12" cy="9.5" r="2.5" />
            </svg>
            Open in Google Maps
          </a>
          {(onEdit || onDelete) && (
            <div className="flex gap-2">
              {onEdit && (
                <button type="button" onClick={() => onEdit(cafe)} className="h-9 flex-1 rounded-full border-2 border-line text-[13px] font-extrabold">
                  Edit
                </button>
              )}
              {onDelete && (
                <button
                  type="button"
                  onClick={askDelete}
                  className={`h-9 flex-1 rounded-full text-[13px] font-extrabold ${confirming ? "bg-berry-ink text-white" : "border-2 border-line"}`}
                >
                  {confirming ? "Tap again to delete" : "Delete"}
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
