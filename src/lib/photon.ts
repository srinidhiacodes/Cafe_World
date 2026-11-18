import type { PlaceResult, PlaceSuggestion } from "./types";

/**
 * Free cafe search from OpenStreetMap via Photon (https://photon.komoot.io).
 * No key, no account, no billing. Built for search-as-you-type.
 */
export const PHOTON_URL = "https://photon.komoot.io/api/";

/** OpenStreetMap tags that count as a cafe-ish place. */
export const CAFE_TAGS = ["amenity:cafe", "shop:coffee", "amenity:ice_cream", "shop:tea", "shop:bakery", "cuisine:coffee_shop"];

interface PhotonFeature {
  geometry?: { coordinates?: [number, number] };
  properties?: {
    osm_type?: string;
    osm_id?: number;
    name?: string;
    street?: string;
    district?: string;
    locality?: string;
    suburb?: string;
    city?: string;
    county?: string;
    state?: string;
    country?: string;
  };
}

export function photonQueryUrl(query: string, limit = 8): string {
  const p = new URLSearchParams({ q: query, limit: String(limit), lang: "en" });
  for (const t of CAFE_TAGS) p.append("osm_tag", t);
  return `${PHOTON_URL}?${p.toString()}`;
}

/** Turns Photon's GeoJSON into places + suggestions. Features without a name or position are skipped. */
export function parsePhoton(json: unknown): { suggestion: PlaceSuggestion; place: PlaceResult }[] {
  const features = (json as { features?: PhotonFeature[] })?.features;
  if (!Array.isArray(features)) return [];
  const seen = new Set<string>();
  const out: { suggestion: PlaceSuggestion; place: PlaceResult }[] = [];
  for (const f of features) {
    const pr = f.properties ?? {};
    const coords = f.geometry?.coordinates;
    if (!pr.name || !coords || coords.length < 2) continue;
    const [lon, lat] = coords;
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) continue;
    const id = `osm-${(pr.osm_type ?? "x").toLowerCase()}${pr.osm_id ?? `${lat},${lon}`}`;
    if (seen.has(id)) continue;
    seen.add(id);
    const area = pr.district || pr.suburb || pr.locality || pr.street || "";
    const city = pr.city || pr.county || pr.state || "";
    const country = pr.country || "";
    const place: PlaceResult = {
      id,
      name: pr.name,
      area: area === city ? "" : area,
      city,
      country,
      lat,
      lon,
    };
    out.push({
      place,
      suggestion: { id, title: pr.name, subtitle: [place.area, city, country].filter(Boolean).join(", "), place },
    });
  }
  return out;
}
