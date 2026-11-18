import { KNOWN_CITIES } from "./sample-data";

const R = 6371;

export function distanceKm(aLat: number, aLon: number, bLat: number, bLon: number): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(bLat - aLat);
  const dLon = toRad(bLon - aLon);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** The closest known city within `maxKm`, or null. */
export function nearestKnownCity(lat: number, lon: number, maxKm = 80) {
  let best: (typeof KNOWN_CITIES)[number] | null = null;
  let bestKm = Infinity;
  for (const c of KNOWN_CITIES) {
    const km = distanceKm(lat, lon, c.lat, c.lon);
    if (km < bestKm) {
      best = c;
      bestKm = km;
    }
  }
  return best && bestKm <= maxKm ? best : null;
}

/**
 * Position on a unit sphere, matching three.js SphereGeometry UVs
 * (u = 0 at longitude -180°).
 */
export function latLonToXYZ(lat: number, lon: number, r = 1): [number, number, number] {
  const phi = ((90 - lat) * Math.PI) / 180;
  const theta = ((lon + 180) * Math.PI) / 180;
  return [-r * Math.sin(phi) * Math.cos(theta), r * Math.cos(phi), r * Math.sin(phi) * Math.sin(theta)];
}

export function formatCoords(lat: number, lon: number): string {
  const ns = lat >= 0 ? "N" : "S";
  const ew = lon >= 0 ? "E" : "W";
  return `${Math.abs(lat).toFixed(2)}° ${ns} · ${Math.abs(lon).toFixed(2)}° ${ew}`;
}
