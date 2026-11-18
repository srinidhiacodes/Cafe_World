import type { Cafe, CityGroup } from "./types";

export function slugify(text: string): string {
  return text
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function citySlug(city: string, country: string): string {
  return slugify(`${city} ${country}`) || "somewhere";
}

/**
 * Groups cafes into one pin per city (city + country, case-insensitive).
 * The pin sits at the average position of its cafes.
 * Cities are returned in the order they were first visited.
 */
export function groupByCity(cafes: Cafe[]): CityGroup[] {
  const map = new Map<string, CityGroup>();
  for (const cafe of cafes) {
    const slug = citySlug(cafe.city, cafe.country);
    let group = map.get(slug);
    if (!group) {
      group = {
        slug,
        city: cafe.city.trim(),
        country: cafe.country.trim(),
        lat: 0,
        lon: 0,
        cafes: [],
        firstVisit: cafe.visitedOn,
      };
      map.set(slug, group);
    }
    group.cafes.push(cafe);
    if (cafe.visitedOn < group.firstVisit) group.firstVisit = cafe.visitedOn;
  }
  for (const group of map.values()) {
    group.lat = group.cafes.reduce((s, c) => s + c.lat, 0) / group.cafes.length;
    group.lon = averageLongitude(group.cafes.map((c) => c.lon));
    group.cafes.sort((a, b) => b.visitedOn.localeCompare(a.visitedOn));
  }
  return [...map.values()].sort((a, b) => a.firstVisit.localeCompare(b.firstVisit));
}

/** Averages longitudes correctly across the ±180° line. */
export function averageLongitude(lons: number[]): number {
  if (lons.length === 0) return 0;
  let x = 0;
  let y = 0;
  for (const lon of lons) {
    const r = (lon * Math.PI) / 180;
    x += Math.cos(r);
    y += Math.sin(r);
  }
  return (Math.atan2(y, x) * 180) / Math.PI;
}

export interface Stats {
  cafes: number;
  cities: number;
  countries: number;
  favouriteVibe: string | null;
  topCafe: Cafe | null;
  topArea: string | null;
  firstCafe: Cafe | null;
}

export function computeStats(cafes: Cafe[]): Stats {
  const cities = new Set(cafes.map((c) => citySlug(c.city, c.country)));
  const countries = new Set(cafes.map((c) => c.country.trim().toLowerCase()).filter(Boolean));
  return {
    cafes: cafes.length,
    cities: cities.size,
    countries: countries.size,
    favouriteVibe: mostCommon(cafes.map((c) => c.vibe)),
    topCafe: [...cafes].sort((a, b) => b.rating - a.rating || b.visitedOn.localeCompare(a.visitedOn))[0] ?? null,
    topArea: mostCommon(cafes.map((c) => c.area).filter(Boolean)),
    firstCafe: [...cafes].sort((a, b) => a.visitedOn.localeCompare(b.visitedOn))[0] ?? null,
  };
}

function mostCommon(values: string[]): string | null {
  const counts = new Map<string, number>();
  for (const v of values) counts.set(v, (counts.get(v) ?? 0) + 1);
  let best: string | null = null;
  let bestCount = 0;
  for (const [v, n] of counts) {
    if (n > bestCount) {
      best = v;
      bestCount = n;
    }
  }
  return best;
}
