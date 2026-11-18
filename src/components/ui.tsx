"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import type { Badge } from "@/lib/badges";
import type { DrinkKind } from "@/lib/types";

export function Logo() {
  return (
    <Link href="/" className="flex items-center gap-2.5 rounded-full text-ink no-underline" aria-label="Cafe Passport home">
      <span className="flex h-10 w-10 items-center justify-center rounded-full bg-sky shadow-[inset_-4px_-4px_0_#A8D5A2]">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#4A2F27" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
          <path d="M5 9h12v4a6 6 0 0 1-12 0z" />
          <path d="M17 10h1.5a2.5 2.5 0 0 1 0 5H17" />
        </svg>
      </span>
      <span className="font-display text-2xl font-semibold">Cafe Passport</span>
    </Link>
  );
}

const TABS = [
  { href: "/globe", label: "My globe" },
  { href: "/journal", label: "Journal" },
  { href: "/passport", label: "Passport" },
];

export function AppNav({ right }: { right?: React.ReactNode }) {
  const path = usePathname();
  return (
    <nav className="flex flex-wrap items-center justify-between gap-4 py-5" aria-label="Main">
      <Logo />
      <div className="flex gap-1 rounded-full bg-paper p-1.5 text-sm font-extrabold shadow-[0_4px_14px_rgba(74,47,39,.08)]">
        {TABS.map((t) => {
          const active = path === t.href || (t.href === "/journal" && path.startsWith("/city"));
          return (
            <Link
              key={t.href}
              href={t.href}
              aria-current={active ? "page" : undefined}
              data-tour={t.href === "/passport" ? "passport" : undefined}
              className={`rounded-full px-4 py-2 no-underline ${active ? "bg-ink text-cream" : "text-ink hover:bg-berry-pale"}`}
            >
              {t.label}
            </Link>
          );
        })}
      </div>
      <div className="flex items-center gap-3">{right}</div>
    </nav>
  );
}

export function Stars({ value, size = 16 }: { value: number; size?: number }) {
  return (
    <span className="inline-flex gap-px" role="img" aria-label={`${value} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <svg key={i} width={size} height={size} viewBox="0 0 24 24" fill={i <= value ? "#FFC94D" : "none"} stroke="#D89A1F" strokeWidth="1.5" strokeLinejoin="round" aria-hidden="true">
          <path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z" />
        </svg>
      ))}
    </span>
  );
}

export function DrinkDrawing({ kind, size = 84 }: { kind: DrinkKind; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" stroke="#4A2F27" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {kind === "iced" ? (
        <>
          <path d="M20 18h24l-3 36a3 3 0 0 1-3 3H26a3 3 0 0 1-3-3z" fill="#FFFDF8" />
          <path d="M41 5l-5 26" />
          <rect x="25" y="26" width="7" height="7" rx="1.5" transform="rotate(-10 28 29)" />
          <rect x="33" y="32" width="7" height="7" rx="1.5" transform="rotate(12 36 35)" />
          <path d="M23 44h18" />
        </>
      ) : kind === "filter" ? (
        <>
          <path d="M28 8c-2 3 2 5 0 8M36 8c-2 3 2 5 0 8" />
          <path d="M22 20h20l-3 24H25z" fill="#FFFDF8" />
          <path d="M8 44h48l-5 10H13z" fill="#FFFDF8" />
        </>
      ) : (
        <>
          <path d="M24 14c-2 3 2 5 0 8M32 12c-2 3 2 5 0 8M40 14c-2 3 2 5 0 8" />
          <path d="M14 28h32v6a16 16 0 0 1-32 0z" fill="#FFFDF8" />
          <path d="M46 31h3a5 5 0 0 1 0 10h-4" />
          <path d="M10 53h40" />
        </>
      )}
    </svg>
  );
}

export const TAPE = ["#F7B7C6", "#BFE0B5", "#FFE59A", "#D9C8F5", "#C6E6F7"];
export const TINTS = ["#FDE6EC", "#E6F3E0", "#FFF2CC", "#EEE6FB", "#E3F2FA"];
export const TILTS = [-3, 2.5, -1.5, 3, -2.5, 1.5];

export function StampBadge({ badge, unlocked, progress, animate = false }: { badge: Badge; unlocked: boolean; progress: number; animate?: boolean }) {
  const shape = badge.shape === "circle" ? "rounded-full h-28 w-28" : badge.shape === "rect" ? "rounded-xl h-24 w-28" : "rounded-[50%] h-24 w-32";
  const rot = `${(badge.id.length % 5) * 4 - 8}deg`;
  if (!unlocked) {
    return (
      <div className={`flex flex-col items-center justify-center border-2 border-dashed border-[#DCC6B2] text-center font-mono text-[11px] font-semibold text-sub ${shape}`}>
        <span>{badge.title.toUpperCase()}</span>
        <span className="font-hand text-lg font-bold">{Math.round(progress * 100)}% there</span>
        <span className="sr-only">Locked. {badge.hint}.</span>
      </div>
    );
  }
  return (
    <div
      className={`flex flex-col items-center justify-center border-[3.5px] text-center font-mono font-semibold ${shape} ${animate ? "stamp-thump" : ""}`}
      style={{ borderColor: badge.ink, color: badge.ink, transform: `rotate(${rot})`, ["--r" as string]: rot }}
    >
      <span className="text-[10px] tracking-wider">{badge.subtitle}</span>
      <span className="px-2 text-[13px] leading-tight">{badge.title.toUpperCase()}</span>
      <span aria-hidden="true">★</span>
    </div>
  );
}

/** Coffee-bean and heart confetti from a point on screen. */
export function burstConfetti(x: number, y: number) {
  if (typeof window === "undefined" || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  for (let i = 0; i < 18; i++) {
    const el = document.createElement("span");
    const heart = i % 3 === 0;
    const a = Math.random() * Math.PI * 2;
    const dist = 70 + Math.random() * 90;
    el.className = "burst pointer-events-none fixed z-[60]";
    Object.assign(el.style, {
      left: `${x}px`,
      top: `${y}px`,
      width: heart ? "14px" : "12px",
      height: heart ? "14px" : "16px",
      borderRadius: heart ? "50% 50% 0 50%" : "50%",
      background: heart ? (i % 2 ? "#E0607E" : "#F49AB0") : "#7A4B2E",
      ["--dx" as string]: `${Math.cos(a) * dist}px`,
      ["--dy" as string]: `${Math.sin(a) * dist}px`,
      ["--rot" as string]: `${Math.random() * 360}deg`,
    } as Partial<CSSStyleDeclaration>);
    document.body.appendChild(el);
    window.setTimeout(() => el.remove(), 950);
  }
}

export function Toast({ message, onDone }: { message: string | null; onDone: () => void }) {
  const [shown, setShown] = useState<string | null>(null);
  useEffect(() => {
    if (!message) return;
    setShown(message);
    const t = window.setTimeout(() => {
      setShown(null);
      onDone();
    }, 2600);
    return () => window.clearTimeout(t);
  }, [message, onDone]);
  return (
    <div role="status" aria-live="polite" className="pointer-events-none fixed left-1/2 top-6 z-[70] -translate-x-1/2">
      {shown && <div className="drop-in rounded-full bg-ink px-5 py-3 text-sm font-extrabold text-cream shadow-lg">{shown}</div>}
    </div>
  );
}

export function formatDate(iso: string, opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "short" }) {
  const d = new Date(`${iso}T12:00:00`);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString("en-GB", opts);
}
