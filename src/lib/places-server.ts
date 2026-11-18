import "server-only";
import { nearestKnownCity } from "./geo";
import { SAMPLE_PLACES } from "./sample-data";
import type { PlaceResult, PlaceSuggestion } from "./types";

/**
 * Google Places (New) is called only from the server, so the API key never
 * reaches the browser. Without GOOGLE_MAPS_API_KEY the app uses a small
 * offline sample list, so it still works in preview.
 */
const KEY = process.env.GOOGLE_MAPS_API_KEY;
const BASE = "https://places.googleapis.com/v1";

export const placesMode = (): "google" | "sample" => (KEY ? "google" : "sample");

export async function autocomplete(query: string, sessionToken?: string): Promise<PlaceSuggestion[]> {
  if (!KEY) return sampleSearch(query);

  const res = await fetch(`${BASE}/places:autocomplete`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Goog-Api-Key": KEY },
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
  if (!KEY) return SAMPLE_PLACES.find((p) => p.id === id) ?? null;

  const qs = sessionToken ? `?sessionToken=${encodeURIComponent(sessionToken)}` : "";
  const res = await fetch(`${BASE}/places/${encodeURIComponent(id)}${qs}`, {
    headers: {
      "X-Goog-Api-Key": KEY,
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
