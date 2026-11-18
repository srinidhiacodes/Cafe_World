import { describe, expect, it } from "vitest";
import { parsePhoton, photonQueryUrl } from "../photon";

const sample = {
  type: "FeatureCollection",
  features: [
    {
      geometry: { type: "Point", coordinates: [80.2707, 13.0339] },
      properties: { osm_type: "N", osm_id: 123, name: "Kaapi Corner", district: "Mylapore", city: "Chennai", state: "Tamil Nadu", country: "India" },
    },
    // duplicate of the first one
    {
      geometry: { type: "Point", coordinates: [80.2707, 13.0339] },
      properties: { osm_type: "N", osm_id: 123, name: "Kaapi Corner", city: "Chennai", country: "India" },
    },
    // no name → skipped
    { geometry: { type: "Point", coordinates: [77.6, 12.97] }, properties: { osm_type: "W", osm_id: 9, city: "Bengaluru" } },
    // no city → falls back to state; area equal to city is dropped
    {
      geometry: { type: "Point", coordinates: [115.26, -8.507] },
      properties: { osm_type: "W", osm_id: 77, name: "Rice Terrace Roastery", locality: "Bali", state: "Bali", country: "Indonesia" },
    },
  ],
};

describe("parsePhoton", () => {
  it("maps OpenStreetMap results to places with lat/lon in the right order", () => {
    const out = parsePhoton(sample);
    expect(out).toHaveLength(2);
    expect(out[0].place).toEqual({ id: "osm-n123", name: "Kaapi Corner", area: "Mylapore", city: "Chennai", country: "India", lat: 13.0339, lon: 80.2707 });
    expect(out[0].suggestion).toMatchObject({ title: "Kaapi Corner", subtitle: "Mylapore, Chennai, India" });
  });

  it("falls back to the state for the city and drops an area that repeats it", () => {
    const bali = parsePhoton(sample)[1].place;
    expect(bali).toMatchObject({ city: "Bali", area: "", country: "Indonesia" });
  });

  it("returns nothing for junk input", () => {
    expect(parsePhoton(null)).toEqual([]);
    expect(parsePhoton({ features: "nope" })).toEqual([]);
  });

  it("builds a cafe-filtered search URL", () => {
    const url = new URL(photonQueryUrl("kaapi mylapore"));
    expect(url.hostname).toBe("photon.komoot.io");
    expect(url.searchParams.get("q")).toBe("kaapi mylapore");
    expect(url.searchParams.getAll("osm_tag")).toContain("amenity:cafe");
  });
});
