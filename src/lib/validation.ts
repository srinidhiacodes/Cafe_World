import { isValidLatLon } from "./maps-link";
import { VIBES, type Vibe } from "./types";

export const LIMITS = {
  name: 60,
  area: 60,
  ordered: 80,
  note: 200,
  photos: 6,
} as const;

export interface CafeDraft {
  name: string;
  area: string;
  city: string;
  country: string;
  lat: number | null;
  lon: number | null;
  ordered: string;
  rating: number;
  vibe: string;
  note: string;
  visitedOn: string;
  photos: string[];
}

export type CafeErrors = Partial<Record<keyof CafeDraft | "location", string>>;

export function validateCafe(d: CafeDraft, today = new Date()): CafeErrors {
  const e: CafeErrors = {};
  const name = d.name.trim();
  if (!name) e.name = "Give the cafe a name.";
  else if (name.length > LIMITS.name) e.name = `Keep the name under ${LIMITS.name} characters.`;

  if (d.lat === null || d.lon === null || !isValidLatLon(d.lat, d.lon) || !d.city.trim()) {
    e.location = "Search for the cafe or paste a Google Maps link so we know where to pin it.";
  }
  if (d.area.trim().length > LIMITS.area) e.area = `Keep the area under ${LIMITS.area} characters.`;
  if (d.ordered.trim().length > LIMITS.ordered) e.ordered = `Keep this under ${LIMITS.ordered} characters.`;
  if (d.note.trim().length > LIMITS.note) e.note = `Keep the note under ${LIMITS.note} characters.`;
  if (!Number.isInteger(d.rating) || d.rating < 1 || d.rating > 5) e.rating = "Pick 1 to 5 stars.";
  if (!VIBES.includes(d.vibe as Vibe)) e.vibe = "Pick a vibe.";
  if (d.photos.length > LIMITS.photos) e.photos = `Up to ${LIMITS.photos} photos per memory.`;

  if (!/^\d{4}-\d{2}-\d{2}$/.test(d.visitedOn) || Number.isNaN(Date.parse(d.visitedOn))) {
    e.visitedOn = "Pick the date you visited.";
  } else {
    const todayIso = toIsoDate(today);
    if (d.visitedOn > todayIso) e.visitedOn = "The visit date can't be in the future.";
  }
  return e;
}

export function toIsoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
