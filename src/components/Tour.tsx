"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";

export interface TourStep {
  /** Matches an element's data-tour attribute. */
  target: string;
  title: string;
  body: string;
}

interface Props {
  open: boolean;
  steps: TourStep[];
  onClose: () => void;
  /** Label and action for the last step's main button. */
  finishLabel?: string;
  onFinish?: () => void;
}

const TOUR_KEY = "cafe-passport:tour-done";

export function tourDone(): boolean {
  try {
    return window.localStorage.getItem(TOUR_KEY) === "1";
  } catch {
    return false;
  }
}

export function markTourDone() {
  try {
    window.localStorage.setItem(TOUR_KEY, "1");
  } catch {
    /* storage blocked: the tour will simply show again next time */
  }
}

type Rect = { top: number; left: number; width: number; height: number };

export default function Tour({ open, steps, onClose, finishLabel = "Done", onFinish }: Props) {
  const [i, setI] = useState(0);
  const [rect, setRect] = useState<Rect | null>(null);
  const [vw, setVw] = useState(1024);
  const cardRef = useRef<HTMLDivElement>(null);
  const step = steps[i];
  const last = i === steps.length - 1;

  const measure = useCallback(() => {
    if (!step) return;
    const el = document.querySelector<HTMLElement>(`[data-tour="${step.target}"]`);
    setVw(window.innerWidth);
    if (!el) {
      setRect(null);
      return;
    }
    const r = el.getBoundingClientRect();
    const pad = 10;
    setRect({ top: r.top - pad, left: r.left - pad, width: r.width + pad * 2, height: r.height + pad * 2 });
  }, [step]);

  useEffect(() => {
    if (open) setI(0);
  }, [open]);

  // Bring the highlighted part into view, then measure it.
  useLayoutEffect(() => {
    if (!open || !step) return;
    const el = document.querySelector<HTMLElement>(`[data-tour="${step.target}"]`);
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el?.scrollIntoView({ block: "center", behavior: reduced ? "auto" : "smooth" });
    measure();
    const t = window.setTimeout(measure, 450);
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);
    return () => {
      window.clearTimeout(t);
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, true);
    };
  }, [open, step, measure]);

  useEffect(() => {
    if (open) cardRef.current?.focus();
  }, [open, i]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight" && !last) setI((n) => n + 1);
      if (e.key === "ArrowLeft" && i > 0) setI((n) => n - 1);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose, last, i]);

  if (!open || !step) return null;

  // Place the card below the highlight when there's room, otherwise above, otherwise centred.
  const cardW = Math.min(360, vw - 32);
  const vh = typeof window !== "undefined" ? window.innerHeight : 800;
  let cardStyle: React.CSSProperties;
  if (rect) {
    const left = Math.max(16, Math.min(rect.left + rect.width / 2 - cardW / 2, vw - cardW - 16));
    const below = rect.top + rect.height + 14;
    if (below + 230 < vh) cardStyle = { top: below, left };
    else if (rect.top - 14 - 230 > 0) cardStyle = { top: rect.top - 14, left, transform: "translateY(-100%)" };
    else cardStyle = { top: "50%", left: "50%", transform: "translate(-50%, -50%)" };
  } else {
    cardStyle = { top: "50%", left: "50%", transform: "translate(-50%, -50%)" };
  }

  return (
    <div className="fixed inset-0 z-[80]" aria-hidden={false}>
      {/* Dim everything except the highlighted part. Clicks outside are blocked. */}
      {rect ? (
        <div
          className="pointer-events-none fixed rounded-[26px] border-[3px] border-berry transition-all duration-300"
          style={{ ...rect, boxShadow: "0 0 0 9999px rgba(74,47,39,.55)" }}
        />
      ) : (
        <div className="fixed inset-0 bg-ink/55" />
      )}
      <div
        ref={cardRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="tour-title"
        aria-describedby="tour-body"
        tabIndex={-1}
        className="drop-in fixed flex flex-col gap-3 rounded-[24px] bg-paper p-5 shadow-2xl outline-none"
        style={{ ...cardStyle, width: cardW }}
      >
        <div className="flex items-center justify-between">
          <span className="font-mono text-[11px] font-semibold tracking-[1.5px] text-sub">
            STEP {i + 1} OF {steps.length}
          </span>
          <button type="button" onClick={onClose} className="rounded-full px-2 py-1 text-[13px] font-extrabold text-sub underline">
            Skip tour
          </button>
        </div>
        <h2 id="tour-title" className="m-0 font-display text-2xl font-semibold">
          {step.title}
        </h2>
        <p id="tour-body" className="m-0 text-[15px] leading-relaxed text-ink">
          {step.body}
        </p>
        <div className="flex items-center gap-1.5" aria-hidden="true">
          {steps.map((_, n) => (
            <span key={n} className={`h-2 rounded-full transition-all ${n === i ? "w-6 bg-berry-deep" : "w-2 bg-line"}`} />
          ))}
        </div>
        <div className="mt-1 flex justify-end gap-2">
          {i > 0 && (
            <button type="button" onClick={() => setI(i - 1)} className="h-11 rounded-full px-4 font-extrabold text-sub">
              Back
            </button>
          )}
          {last ? (
            <button
              type="button"
              onClick={() => {
                onClose();
                onFinish?.();
              }}
              className="h-11 rounded-full bg-ink px-5 font-extrabold text-cream"
            >
              {finishLabel}
            </button>
          ) : (
            <button type="button" onClick={() => setI(i + 1)} className="h-11 rounded-full bg-ink px-5 font-extrabold text-cream">
              Next
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
