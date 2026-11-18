import "server-only";
import { nearestKnownCity } from "./geo";
import { parsePhoton, photonQueryUrl } from "./photon";
import { SAMPLE_PLACES } from "./sample-data";
import type { PlaceResult, PlaceSuggestion } from "./types";

/**
 * Cafe search, called only from the server:
 * - GOOGLE_MAPS_API_KEY set → Google Places (New). The key never reaches the browser.
 * - otherwise → OpenStreetMap via Photon: free, no key or billing account.
 * - PLACES_PROVIDER=sample → a small offline list (for tests / no internet).
 */
const KEY = process.env.GOOGLE_MAPS_API_KEY;
const BASE = "https://places.googleapis.com/v1";

export type PlacesMode = "google" | "osm" | "sample";
export const placesMode = (): PlacesMode => (process.env.PLACES_PROVIDER === "sample" ? "sample" : KEY ? "google" : "osm");

async function osmSearch(query: string): Promise<PlaceSuggestion[]> {
  const res = await fetch(photonQueryUrl(query), {
    headers: { "User-Agent": "CafePassport/1.0 (cafe journal web app)", Accept: "application/json" },
    signal: AbortSignal.timeout(6000),
    next: { revalidate: 3600 },
  });
  if (!res.ok) throw new Error(`OpenStreetMap search failed (${res.status})`);
  return parsePhoton(await res.json())
    .slice(0, 6)
    .map((r) => r.suggestion);
}

export async function autocomplete(query: string, sessionToken?: string): Promise<PlaceSuggestion[]> {
  const mode = placesMode();
  if (mode === "sample") return sampleSearch(query);
  if (mode === "osm") return osmSearch(query);

  const res = await fetch(`${BASE}/places:autocomplete`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Goog-Api-Key": KEY! },
    body: JSON.stringify({
      input: query,
      includedPrimaryTypes: ["cafe", "coffee_shop", "bakery", "tea_house"],
      ...(sessionToken ? { sessionToken } : {}),
    }),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Places autocomplete failed (${res.status})`);
  const data = (await res.json()) as {
    suggestions?: {
      placePrediction?: {
        placeId: string;
        structuredFormat?: { mainText?: { text: string }; secondaryText?: { text: string } };
        text?: { text: string };
      };
    }[];
  };
  return (data.suggestions ?? [])
    .map((s) => s.placePrediction)
    .filter((p): p is NonNullable<typeof p> => Boolean(p))
    .slice(0, 6)
    .map((p) => ({
      id: p.placeId,
      title: p.structuredFormat?.mainText?.text ?? p.text?.text ?? "Cafe",
      subtitle: p.structuredFormat?.secondaryText?.text ?? "",
    }));
}

export async function placeDetails(id: string, sessionToken?: string): Promise<PlaceResult | null> {
  if (id.startsWith("sample-") || placesMode() !== "google") return SAMPLE_PLACES.find((p) => p.id === id) ?? null;

  const qs = sessionToken ? `?sessionToken=${encodeURIComponent(sessionToken)}` : "";
  const res = await fetch(`${BASE}/places/${encodeURIComponent(id)}${qs}`, {
    headers: {
      "X-Goog-Api-Key": KEY!,
      "X-Goog-FieldMask": "id,displayName,location,addressComponents,googleMapsUri",
    },
    cache: "no-store",
  });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Place details failed (${res.status})`);
  const p = (await res.json()) as {
    id: string;
    displayName?: { text: string };
    location?: { latitude: number; longitude: number };
    googleMapsUri?: string;
    addressComponents?: { longText: string; types: string[] }[];
  };
  if (!p.location) return null;
  const comp = (...types: string[]) =>
    types.map((t) => p.addressComponents?.find((c) => c.types.includes(t))?.longText).find(Boolean) ?? "";
  const known = nearestKnownCity(p.location.latitude, p.location.longitude);
  return {
    id: p.id,
    name: p.displayName?.text ?? "Cafe",
    area: comp("sublocality_level_1", "sublocality", "neighborhood"),
    city: comp("locality", "postal_town", "administrative_area_level_2") || known?.city || "",
    country: comp("country") || known?.country || "",
    lat: p.location.latitude,
    lon: p.location.longitude,
    mapsUrl: p.googleMapsUri,
  };
}

/** Follows a maps.app.goo.gl short link to the long Google Maps URL. */
export async function expandShortLink(url: string): Promise<string | null> {
  const u = new URL(url);
  const allowed = u.hostname === "maps.app.goo.gl" || (u.hostname === "goo.gl" && u.pathname.startsWith("/maps"));
  if (!allowed || u.protocol !== "https:") return null;
  const res = await fetch(u, { redirect: "manual", cache: "no-store" });
  const location = res.headers.get("location");
  return location && /^https:\/\/(www\.)?google\.[a-z.]+\/maps/.test(location) ? location : null;
}

function sampleSearch(query: string): PlaceSuggestion[] {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  return SAMPLE_PLACES.filter((p) => {
    const hay = `${p.name} ${p.area} ${p.city} ${p.country}`.toLowerCase();
    return words.every((w) => hay.includes(w));
  })
    .slice(0, 6)
    .map((p) => ({ id: p.id, title: p.name, subtitle: `${p.area}, ${p.city}, ${p.country}` }));
}
