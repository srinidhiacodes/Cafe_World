export type MapsLinkResult =
  | { kind: "ok"; lat: number; lon: number; name: string | null }
  | { kind: "short"; url: string }
  | { kind: "invalid"; reason: string };

const NUM = "(-?\\d{1,3}(?:\\.\\d+)?)";

/**
 * Reads a location (and the place name when present) from a Google Maps link.
 * Supports the long links people copy from the address bar:
 *   - .../place/Name/@13.03,80.27,17z/...   (map centre)
 *   - ...!3d13.0339!4d80.2707...            (exact place position, preferred)
 *   - ...?q=13.03,80.27  /  ?query=  /  ?ll=
 * Short share links (maps.app.goo.gl, goo.gl/maps) cannot be read offline;
 * the server expands them first.
 */
export function parseMapsLink(input: string): MapsLinkResult {
  const text = input.trim();
  if (!text) return { kind: "invalid", reason: "Paste a Google Maps link first." };

  let url: URL;
  try {
    url = new URL(text);
  } catch {
    return { kind: "invalid", reason: "That doesn't look like a link. Copy it from the Maps address bar or Share button." };
  }

  const host = url.hostname.toLowerCase();
  if (host === "maps.app.goo.gl" || (host === "goo.gl" && url.pathname.startsWith("/maps"))) {
    return { kind: "short", url: url.toString() };
  }
  const isGoogleMaps =
    /(^|\.)google\.[a-z.]+$/.test(host) && (url.pathname.startsWith("/maps") || host.startsWith("maps."));
  if (!isGoogleMaps) {
    return { kind: "invalid", reason: "That isn't a Google Maps link." };
  }

  const decoded = safeDecode(text);
  const candidates: RegExp[] = [
    new RegExp(`!3d${NUM}!4d${NUM}`),
    new RegExp(`[?&](?:q|query|ll|center|destination)=${NUM},\\s*${NUM}`),
    new RegExp(`@${NUM},${NUM}`),
  ];

  for (const re of candidates) {
    const m = decoded.match(re);
    if (!m) continue;
    const lat = Number(m[1]);
    const lon = Number(m[2]);
    if (isValidLatLon(lat, lon)) {
      return { kind: "ok", lat, lon, name: placeName(url) };
    }
  }
  return { kind: "invalid", reason: "Couldn't find a location in that link. Open the cafe in Google Maps and copy the full link." };
}

export function isValidLatLon(lat: number, lon: number): boolean {
  return Number.isFinite(lat) && Number.isFinite(lon) && Math.abs(lat) <= 90 && Math.abs(lon) <= 180;
}

function placeName(url: URL): string | null {
  const m = url.pathname.match(/\/place\/([^/@]+)/);
  if (!m) return null;
  const name = safeDecode(m[1].replace(/\+/g, " ")).trim();
  if (!name || /^-?\d+(\.\d+)?,\s*-?\d+(\.\d+)?$/.test(name)) return null;
  return name;
}

function safeDecode(s: string): string {
  try {
    return decodeURIComponent(s);
  } catch {
    return s;
  }
}
