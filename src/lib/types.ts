export const VIBES = ["Aesthetic", "Work-friendly", "Budget", "Date spot"] as const;
export type Vibe = (typeof VIBES)[number];

export type DrinkKind = "cup" | "iced" | "filter";

/** One visit to one cafe: a single polaroid in the journal. */
export interface Cafe {
  id: string;
  name: string;
  area: string;
  city: string;
  country: string;
  lat: number;
  lon: number;
  /** ISO date, e.g. "2026-11-18" */
  visitedOn: string;
  ordered: string;
  rating: number;
  vibe: Vibe;
  note: string;
  /** Compressed photo data URLs (preview) or storage URLs (later, Supabase). */
  photos: string[];
  kind: DrinkKind;
  mapsUrl?: string;
  googlePlaceId?: string;
  /** True for the built-in example cafes. */
  example?: boolean;
}

/** A pin on the globe: every cafe in one city. */
export interface CityGroup {
  slug: string;
  city: string;
  country: string;
  lat: number;
  lon: number;
  cafes: Cafe[];
  firstVisit: string;
}

/** A place picked from search (Google Places or the offline sample list). */
export interface PlaceResult {
  id: string;
  name: string;
  area: string;
  city: string;
  country: string;
  lat: number;
  lon: number;
  mapsUrl?: string;
}

export interface PlaceSuggestion {
  id: string;
  title: string;
  subtitle: string;
}
