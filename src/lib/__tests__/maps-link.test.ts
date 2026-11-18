import { describe, expect, it } from "vitest";
import { parseMapsLink } from "../maps-link";

describe("parseMapsLink", () => {
  it("prefers the exact place position (!3d!4d) over the map centre (@)", () => {
    const r = parseMapsLink(
      "https://www.google.com/maps/place/Kaapi+Corner/@13.0300,80.2600,17z/data=!3m1!4b1!4m6!3m5!1s0x0:0x0!8m2!3d13.0339!4d80.2707",
    );
    expect(r).toEqual({ kind: "ok", lat: 13.0339, lon: 80.2707, name: "Kaapi Corner" });
  });

  it("reads the @lat,lng centre when there is no place position", () => {
    const r = parseMapsLink("https://www.google.com/maps/@48.8566,2.3522,15z");
    expect(r).toMatchObject({ kind: "ok", lat: 48.8566, lon: 2.3522, name: null });
  });

  it("reads ?q=lat,lng and ?query=lat,lng links", () => {
    expect(parseMapsLink("https://maps.google.com/?q=-37.8170,144.9650")).toMatchObject({ kind: "ok", lat: -37.817, lon: 144.965 });
    expect(parseMapsLink("https://www.google.com/maps/search/?api=1&query=1.285,103.83")).toMatchObject({ kind: "ok", lat: 1.285, lon: 103.83 });
  });

  it("decodes place names with special characters", () => {
    const r = parseMapsLink("https://www.google.com/maps/place/Caf%C3%A9+des+Petits+Matins/@48.859,2.362,17z");
    expect(r).toMatchObject({ kind: "ok", name: "Café des Petits Matins" });
  });

  it("flags short share links so the server can expand them", () => {
    expect(parseMapsLink("https://maps.app.goo.gl/AbCdEf123")).toEqual({ kind: "short", url: "https://maps.app.goo.gl/AbCdEf123" });
    expect(parseMapsLink("https://goo.gl/maps/xyz").kind).toBe("short");
  });

  it("rejects empty text, non-links, other sites and out-of-range coordinates", () => {
    expect(parseMapsLink("   ").kind).toBe("invalid");
    expect(parseMapsLink("kaapi corner chennai").kind).toBe("invalid");
    expect(parseMapsLink("https://example.com/@13.0,80.2").kind).toBe("invalid");
    expect(parseMapsLink("https://www.google.com/maps/@123.0,80.2,15z").kind).toBe("invalid");
    expect(parseMapsLink("https://www.google.com/maps/place/Somewhere").kind).toBe("invalid");
  });
});
