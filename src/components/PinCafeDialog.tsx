"use client";

import { useEffect, useId, useRef, useState } from "react";
import { newlyUnlocked, type Badge } from "@/lib/badges";
import { nearestKnownCity } from "@/lib/geo";
import { compressPhoto } from "@/lib/image";
import { parseMapsLink } from "@/lib/maps-link";
import { newId, useStore } from "@/lib/store";
import { VIBES, type Cafe, type DrinkKind, type PlaceResult, type PlaceSuggestion } from "@/lib/types";
import { LIMITS, toIsoDate, validateCafe, type CafeErrors } from "@/lib/validation";
import { Stars } from "./ui";

interface Props {
  open: boolean;
  onClose: () => void;
  /** Called after a cafe is saved. */
  onSaved: (cafe: Cafe, badges: Badge[], isNew: boolean) => void;
  /** Cafe to edit; omit to add a new one. */
  editing?: Cafe | null;
}

type Place = Pick<PlaceResult, "name" | "area" | "city" | "country" | "lat" | "lon" | "mapsUrl"> & { id?: string };

const VIBE_COLOURS: Record<string, string> = {
  Aesthetic: "bg-berry-soft",
  "Work-friendly": "bg-matcha-soft",
  Budget: "bg-butter-soft",
  "Date spot": "bg-lilac-soft",
};

function guessKind(order: string): DrinkKind {
  if (/iced|cold|frapp|tonic/i.test(order)) return "iced";
  if (/kaapi|filter|kopi|tea|chai/i.test(order)) return "filter";
  return "cup";
}

export default function PinCafeDialog({ open, onClose, onSaved, editing }: Props) {
  const { cafes, addCafe, updateCafe } = useStore();
  const uid = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const firstRef = useRef<HTMLInputElement>(null);

  const [tab, setTab] = useState<"search" | "link">("search");
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([]);
  const [mode, setMode] = useState<"google" | "sample" | null>(null);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [session, setSession] = useState("");
  const [link, setLink] = useState("");
  const [linkMsg, setLinkMsg] = useState<string | null>(null);

  const [place, setPlace] = useState<Place | null>(null);
  const [name, setName] = useState("");
  const [area, setArea] = useState("");
  const [city, setCity] = useState("");
  const [country, setCountry] = useState("");
  const [ordered, setOrdered] = useState("");
  const [rating, setRating] = useState(4);
  const [vibe, setVibe] = useState<string>("Aesthetic");
  const [note, setNote] = useState("");
  const [visitedOn, setVisitedOn] = useState(toIsoDate(new Date()));
  const [photos, setPhotos] = useState<string[]>([]);
  const [photoMsg, setPhotoMsg] = useState<string | null>(null);
  const [errors, setErrors] = useState<CafeErrors>({});
  const [saveError, setSaveError] = useState<string | null>(null);

  // Reset whenever the dialog opens.
  useEffect(() => {
    if (!open) return;
    const c = editing;
    setTab("search");
    setQuery("");
    setSuggestions([]);
    setSearchError(null);
    setLink("");
    setLinkMsg(null);
    setSession(newId());
    setPlace(c ? { name: c.name, area: c.area, city: c.city, country: c.country, lat: c.lat, lon: c.lon, mapsUrl: c.mapsUrl, id: c.googlePlaceId } : null);
    setName(c?.name ?? "");
    setArea(c?.area ?? "");
    setCity(c?.city ?? "");
    setCountry(c?.country ?? "");
    setOrdered(c?.ordered ?? "");
    setRating(c?.rating ?? 4);
    setVibe(c?.vibe ?? "Aesthetic");
    setNote(c?.note ?? "");
    setVisitedOn(c?.visitedOn ?? toIsoDate(new Date()));
    setPhotos(c?.photos ?? []);
    setPhotoMsg(null);
    setErrors({});
    setSaveError(null);
    window.setTimeout(() => firstRef.current?.focus(), 30);
  }, [open, editing]);

  // Close on Escape, keep focus inside.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "Tab" && dialogRef.current) {
        const f = dialogRef.current.querySelectorAll<HTMLElement>("button, input, textarea, select, a[href]");
        const list = [...f].filter((el) => !el.hasAttribute("disabled"));
        if (!list.length) return;
        const first = list[0];
        const last = list[list.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  // Debounced search.
  useEffect(() => {
    if (!open || tab !== "search") return;
    const q = query.trim();
    if (q.length < 3) {
      setSuggestions([]);
      setSearchError(null);
      return;
    }
    const ctrl = new AbortController();
    const t = window.setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(`/api/places/autocomplete?q=${encodeURIComponent(q)}&session=${session}`, { signal: ctrl.signal });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        setSuggestions(data.suggestions);
        setMode(data.mode);
        setSearchError(data.suggestions.length ? null : "No cafes found. Try another name, or paste a Google Maps link.");
      } catch (err) {
        if ((err as Error).name !== "AbortError") setSearchError((err as Error).message || "Search isn't working right now.");
      } finally {
        setSearching(false);
      }
    }, 250);
    return () => {
      ctrl.abort();
      window.clearTimeout(t);
    };
  }, [query, open, tab, session]);

  if (!open) return null;

  const applyPlace = (p: Place) => {
    setPlace(p);
    setName(p.name);
    setArea(p.area);
    setCity(p.city);
    setCountry(p.country);
    setErrors((e) => ({ ...e, location: undefined, name: undefined }));
  };

  const pickSuggestion = async (s: PlaceSuggestion) => {
    setSearchError(null);
    try {
      const res = await fetch(`/api/places/details?id=${encodeURIComponent(s.id)}&session=${session}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      applyPlace(data.place);
      setSuggestions([]);
      setQuery("");
      setSession(newId());
    } catch (err) {
      setSearchError((err as Error).message || "Couldn't load that cafe.");
    }
  };

  const readLink = async () => {
    setLinkMsg(null);
    let r = parseMapsLink(link);
    if (r.kind === "short") {
      setLinkMsg("Opening short link…");
      try {
        const res = await fetch(`/api/places/expand?url=${encodeURIComponent(r.url)}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        r = parseMapsLink(data.url);
      } catch (err) {
        setLinkMsg((err as Error).message);
        return;
      }
    }
    if (r.kind !== "ok") {
      setLinkMsg(r.kind === "invalid" ? r.reason : "Couldn't read that link.");
      return;
    }
    const known = nearestKnownCity(r.lat, r.lon);
    applyPlace({ name: r.name ?? "", area: "", city: known?.city ?? "", country: known?.country ?? "", lat: r.lat, lon: r.lon, mapsUrl: link.trim() });
    setLinkMsg(known ? `Found it, near ${known.city}.` : "Found the spot. Type the city and country below.");
  };

  const addPhotos = async (files: FileList | null) => {
    if (!files?.length) return;
    setPhotoMsg(null);
    const room = LIMITS.photos - photos.length;
    if (room <= 0) {
      setPhotoMsg(`Up to ${LIMITS.photos} photos per memory.`);
      return;
    }
    const picked = [...files].slice(0, room);
    const out: string[] = [];
    for (const f of picked) {
      try {
        out.push(await compressPhoto(f));
      } catch (err) {
        setPhotoMsg((err as Error).message);
      }
    }
    if (files.length > room) setPhotoMsg(`Added ${room}. Up to ${LIMITS.photos} photos per memory.`);
    setPhotos((p) => [...p, ...out]);
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const draft = {
      name,
      area,
      city,
      country,
      lat: place?.lat ?? null,
      lon: place?.lon ?? null,
      ordered,
      rating,
      vibe,
      note,
      visitedOn,
      photos,
    };
    const errs = validateCafe(draft);
    setErrors(errs);
    if (Object.keys(errs).length) {
      dialogRef.current?.querySelector<HTMLElement>("[aria-invalid='true']")?.focus();
      return;
    }
    const cafe: Cafe = {
      id: editing?.id ?? newId(),
      name: name.trim(),
      area: area.trim(),
      city: city.trim(),
      country: country.trim(),
      lat: place!.lat,
      lon: place!.lon,
      visitedOn,
      ordered: ordered.trim(),
      rating,
      vibe: vibe as Cafe["vibe"],
      note: note.trim(),
      photos,
      kind: guessKind(ordered),
      mapsUrl: place?.mapsUrl,
      googlePlaceId: place?.id && !place.id.startsWith("sample-") ? place.id : undefined,
    };
    const result = editing ? updateCafe(cafe) : addCafe(cafe);
    if (!result.ok) {
      setSaveError(result.error);
      return;
    }
    const after = editing ? cafes.map((c) => (c.id === cafe.id ? cafe : c)) : [cafe, ...cafes];
    onSaved(cafe, newlyUnlocked(cafes, after), !editing);
  };

  const field = "h-12 w-full rounded-2xl border-2 border-line bg-paper px-4 text-[15px] font-semibold text-ink placeholder:text-sub/70";
  const err = (k: keyof CafeErrors) =>
    errors[k] ? (
      <p id={`${uid}-${k}-err`} className="m-0 text-[13px] font-bold text-berry-ink">
        {errors[k]}
      </p>
    ) : null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center overflow-y-auto bg-ink/35 sm:items-center sm:p-6" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={`${uid}-title`}
        className="drop-in w-full max-w-[980px] rounded-t-[30px] bg-cream shadow-[0_30px_70px_rgba(74,47,39,.3)] sm:rounded-[30px]"
      >
        <form onSubmit={submit} noValidate className="flex max-h-[92dvh] flex-col gap-5 overflow-y-auto p-5 sm:p-8">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="font-hand text-[26px] font-bold leading-none text-berry-ink">{editing ? "fix a memory" : "a new stamp"}</div>
              <h2 id={`${uid}-title`} className="m-0 font-display text-[34px] font-semibold">
                {editing ? "Edit cafe" : "Pin a cafe"}
              </h2>
            </div>
            <button type="button" onClick={onClose} aria-label="Close" className="flex h-11 w-11 items-center justify-center rounded-full bg-paper shadow">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#4A2F27" strokeWidth="2.6" strokeLinecap="round" aria-hidden="true">
                <path d="M6 6l12 12M18 6 6 18" />
              </svg>
            </button>
          </div>

          <div className="flex flex-wrap gap-7">
            {/* Left: where */}
            <div className="flex min-w-0 flex-[1_1_340px] flex-col gap-3">
              {place ? (
                <div className="flex items-center gap-3 rounded-2xl bg-berry-pale p-3.5">
                  <span className="flex h-10 w-10 flex-none items-center justify-center rounded-full bg-berry">
                    <svg width="16" height="20" viewBox="0 0 24 32" aria-hidden="true">
                      <path d="M12 31s10-11 10-19A10 10 0 0 0 2 12c0 8 10 19 10 19z" fill="#4A2F27" />
                      <circle cx="12" cy="12" r="4" fill="#F49AB0" />
                    </svg>
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-extrabold">{name || "Pinned spot"}</div>
                    <div className="truncate text-[13px] font-semibold text-sub">
                      {[area, city, country].filter(Boolean).join(", ") || `${place.lat.toFixed(4)}, ${place.lon.toFixed(4)}`}
                    </div>
                  </div>
                  <button type="button" onClick={() => setPlace(null)} className="rounded-full px-3 py-2 text-[13px] font-extrabold text-berry-ink underline">
                    Change
                  </button>
                </div>
              ) : (
                <>
                  <div role="tablist" aria-label="Search or paste a link" className="flex gap-1 self-start rounded-full bg-paper p-1 text-sm font-extrabold">
                    {(["search", "link"] as const).map((t) => (
                      <button
                        key={t}
                        type="button"
                        role="tab"
                        aria-selected={tab === t}
                        onClick={() => setTab(t)}
                        className={`rounded-full px-4 py-2 ${tab === t ? "bg-ink text-cream" : ""}`}
                      >
                        {t === "search" ? "Search Google Maps" : "Paste a Maps link"}
                      </button>
                    ))}
                  </div>
                  {tab === "search" ? (
                    <>
                      <label htmlFor={`${uid}-q`} className="text-sm font-extrabold">
                        Find the cafe
                      </label>
                      <div className="relative">
                        <input
                          ref={firstRef}
                          id={`${uid}-q`}
                          value={query}
                          onChange={(e) => setQuery(e.target.value)}
                          placeholder="e.g. Kaapi Corner Mylapore"
                          autoComplete="off"
                          aria-invalid={Boolean(errors.location)}
                          aria-describedby={errors.location ? `${uid}-location-err` : undefined}
                          className={`${field} h-14 pl-12 ${errors.location ? "border-berry-deep" : "focus:border-berry-deep"}`}
                        />
                        <svg className="absolute left-4 top-[18px]" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#E0607E" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true">
                          <circle cx="11" cy="11" r="7" />
                          <path d="m20 20-4-4" />
                        </svg>
                      </div>
                      {(suggestions.length > 0 || searching) && (
                        <ul className="m-0 list-none overflow-hidden rounded-2xl bg-paper p-0 shadow-[0_8px_22px_rgba(74,47,39,.1)]" aria-label="Search results">
                          {searching && suggestions.length === 0 && <li className="p-4 text-sm font-bold text-sub">Searching…</li>}
                          {suggestions.map((s) => (
                            <li key={s.id} className="border-t border-line first:border-t-0">
                              <button type="button" onClick={() => pickSuggestion(s)} className="flex w-full items-center gap-3 p-3 text-left hover:bg-berry-pale">
                                <span className="flex h-9 w-9 flex-none items-center justify-center rounded-full bg-berry-soft">
                                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#4A2F27" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
                                    <path d="M5 9h12v4a6 6 0 0 1-12 0z" />
                                    <path d="M17 10h1.5a2.5 2.5 0 0 1 0 5H17" />
                                  </svg>
                                </span>
                                <span className="min-w-0">
                                  <span className="block truncate font-extrabold">{s.title}</span>
                                  <span className="block truncate text-[12.5px] font-semibold text-sub">{s.subtitle}</span>
                                </span>
                              </button>
                            </li>
                          ))}
                          {mode && suggestions.length > 0 && (
                            <li className="border-t border-line px-3 py-2 text-right text-[11.5px] font-bold text-sub">
                              {mode === "google" ? "Results from Google Maps" : "Example results · add a Google Maps key to search real cafes"}
                            </li>
                          )}
                        </ul>
                      )}
                      {searchError && <p className="m-0 text-[13px] font-bold text-berry-ink">{searchError}</p>}
                    </>
                  ) : (
                    <>
                      <label htmlFor={`${uid}-link`} className="text-sm font-extrabold">
                        Google Maps link
                      </label>
                      <div className="flex gap-2">
                        <input
                          id={`${uid}-link`}
                          value={link}
                          onChange={(e) => setLink(e.target.value)}
                          placeholder="https://www.google.com/maps/place/…"
                          className={`${field} flex-1`}
                          aria-describedby={linkMsg ? `${uid}-linkmsg` : undefined}
                        />
                        <button type="button" onClick={readLink} className="h-12 rounded-2xl bg-ink px-4 font-extrabold text-cream">
                          Read link
                        </button>
                      </div>
                      {linkMsg && (
                        <p id={`${uid}-linkmsg`} className="m-0 text-[13px] font-bold text-sub">
                          {linkMsg}
                        </p>
                      )}
                    </>
                  )}
                  {err("location")}
                </>
              )}

              <label htmlFor={`${uid}-name`} className="mt-1 text-sm font-extrabold">
                Cafe name
              </label>
              <input
                id={`${uid}-name`}
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={LIMITS.name + 10}
                aria-invalid={Boolean(errors.name)}
                aria-describedby={errors.name ? `${uid}-name-err` : undefined}
                className={field}
              />
              {err("name")}
              <div className="grid grid-cols-3 gap-2">
                <div className="flex min-w-0 flex-col gap-1">
                  <label htmlFor={`${uid}-area`} className="text-[13px] font-extrabold">
                    Area
                  </label>
                  <input id={`${uid}-area`} value={area} onChange={(e) => setArea(e.target.value)} className={`${field} px-3`} />
                </div>
                <div className="flex min-w-0 flex-col gap-1">
                  <label htmlFor={`${uid}-city`} className="text-[13px] font-extrabold">
                    City
                  </label>
                  <input id={`${uid}-city`} value={city} onChange={(e) => setCity(e.target.value)} className={`${field} px-3`} />
                </div>
                <div className="flex min-w-0 flex-col gap-1">
                  <label htmlFor={`${uid}-country`} className="text-[13px] font-extrabold">
                    Country
                  </label>
                  <input id={`${uid}-country`} value={country} onChange={(e) => setCountry(e.target.value)} className={`${field} px-3`} />
                </div>
              </div>
              <label htmlFor={`${uid}-ord`} className="mt-1 text-sm font-extrabold">
                What did you order?
              </label>
              <input id={`${uid}-ord`} value={ordered} onChange={(e) => setOrdered(e.target.value)} placeholder="e.g. Iced Spanish latte" className={field} />
              {err("ordered")}
              <label htmlFor={`${uid}-date`} className="mt-1 text-sm font-extrabold">
                Date visited
              </label>
              <input
                id={`${uid}-date`}
                type="date"
                value={visitedOn}
                max={toIsoDate(new Date())}
                onChange={(e) => setVisitedOn(e.target.value)}
                aria-invalid={Boolean(errors.visitedOn)}
                className={field}
              />
              {err("visitedOn")}
            </div>

            {/* Right: memory */}
            <div className="flex min-w-0 flex-[1_1_340px] flex-col gap-3.5">
              <div className="flex justify-between">
                <span className="text-sm font-extrabold">Your photos</span>
                <span className="text-[13px] font-bold text-sub">
                  {photos.length} of {LIMITS.photos}
                </span>
              </div>
              <div className="flex flex-wrap gap-4 p-1">
                {photos.map((src, i) => (
                  <div key={i} className="relative h-[124px] w-[104px] bg-paper p-1.5 pb-5 shadow-[0_10px_20px_rgba(74,47,39,.18)]" style={{ rotate: `${i % 2 ? 3 : -4}deg` }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={src} alt={`Photo ${i + 1}`} className="develop h-full w-full object-cover" />
                    <button
                      type="button"
                      onClick={() => setPhotos((p) => p.filter((_, j) => j !== i))}
                      aria-label={`Remove photo ${i + 1}`}
                      className="absolute -right-2.5 -top-2.5 flex h-7 w-7 items-center justify-center rounded-full bg-ink text-cream"
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" aria-hidden="true">
                        <path d="M6 6l12 12M18 6 6 18" />
                      </svg>
                    </button>
                  </div>
                ))}
                {photos.length < LIMITS.photos && (
                  <label className="flex h-[124px] w-[104px] cursor-pointer flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed border-berry-deep bg-berry-pale text-[13px] font-extrabold focus-within:outline-3 focus-within:outline-berry-deep">
                    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#C24E6B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M4 8h3l2-3h6l2 3h3v11H4z" />
                      <circle cx="12" cy="13" r="3.5" />
                    </svg>
                    Add photo
                    <input type="file" accept="image/*" multiple className="sr-only" onChange={(e) => { addPhotos(e.target.files); e.target.value = ""; }} />
                  </label>
                )}
              </div>
              {photoMsg && <p className="m-0 text-[13px] font-bold text-berry-ink">{photoMsg}</p>}

              <fieldset className="m-0 flex items-center justify-between border-0 p-0">
                <legend className="float-left text-sm font-extrabold">How was it?</legend>
                <div className="flex">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button key={n} type="button" onClick={() => setRating(n)} aria-label={`${n} ${n === 1 ? "star" : "stars"}`} aria-pressed={n <= rating} className="p-0.5">
                      <svg width="34" height="34" viewBox="0 0 24 24" fill={n <= rating ? "#FFC94D" : "none"} stroke="#D89A1F" strokeWidth="1.4" strokeLinejoin="round" aria-hidden="true">
                        <path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z" />
                      </svg>
                    </button>
                  ))}
                </div>
              </fieldset>
              <span className="sr-only">
                <Stars value={rating} />
              </span>

              <fieldset className="m-0 border-0 p-0">
                <legend className="mb-2 text-sm font-extrabold">Vibe</legend>
                <div className="flex flex-wrap gap-2">
                  {VIBES.map((v) => (
                    <button
                      key={v}
                      type="button"
                      aria-pressed={vibe === v}
                      onClick={() => setVibe(v)}
                      className={`h-10 rounded-full px-4 text-[13.5px] font-extrabold ${vibe === v ? "bg-ink text-cream" : VIBE_COLOURS[v]}`}
                    >
                      {v}
                    </button>
                  ))}
                </div>
              </fieldset>

              <label htmlFor={`${uid}-note`} className="text-sm font-extrabold">
                A little note
              </label>
              <textarea
                id={`${uid}-note`}
                rows={3}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="What made it special?"
                aria-invalid={Boolean(errors.note)}
                className="resize-none rounded-2xl border-2 border-line bg-paper px-4 py-2.5 font-hand text-[22px] font-bold text-ink"
              />
              <div className="flex justify-between text-[12px] font-bold text-sub">
                {err("note") ?? <span />}
                <span>
                  {note.trim().length}/{LIMITS.note}
                </span>
              </div>
            </div>
          </div>

          {saveError && <p className="m-0 rounded-2xl bg-berry-pale p-3 text-sm font-bold text-berry-ink">{saveError}</p>}
          <div className="flex flex-wrap justify-end gap-3 border-t-2 border-dashed border-line pt-5">
            <button type="button" onClick={onClose} className="h-13 rounded-full px-5 font-extrabold text-sub">
              Cancel
            </button>
            <button type="submit" className="flex h-13 items-center gap-2.5 rounded-full bg-ink px-7 py-3.5 text-base font-extrabold text-cream shadow-[0_10px_22px_rgba(74,47,39,.25)]">
              <svg width="16" height="20" viewBox="0 0 24 32" aria-hidden="true">
                <path d="M12 31s10-11 10-19A10 10 0 0 0 2 12c0 8 10 19 10 19z" fill="#F49AB0" />
                <circle cx="12" cy="12" r="4" fill="#4A2F27" />
              </svg>
              {editing ? "Save changes" : "Stamp it on my globe"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
