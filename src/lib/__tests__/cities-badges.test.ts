import { describe, expect, it } from "vitest";
import { averageLongitude, computeStats, groupByCity } from "../cities";
import { BADGES, newlyUnlocked, unlockedBadges } from "../badges";
import { SAMPLE_CAFES } from "../sample-data";
import type { Cafe } from "../types";

const cafe = (over: Partial<Cafe>): Cafe => ({
  id: Math.random().toString(36),
  name: "Test",
  area: "",
  city: "Chennai",
  country: "India",
  lat: 13,
  lon: 80,
  visitedOn: "2026-01-05",
  ordered: "",
  rating: 4,
  vibe: "Aesthetic",
  note: "",
  photos: [],
  kind: "cup",
  ...over,
});

describe("groupByCity", () => {
  it("makes one pin per city, ignoring case and extra spaces", () => {
    const groups = groupByCity([cafe({ city: "Chennai" }), cafe({ city: " chennai " }), cafe({ city: "Goa" })]);
    expect(groups.map((g) => g.slug)).toEqual(["chennai-india", "goa-india"]);
    expect(groups[0].cafes).toHaveLength(2);
  });

  it("keeps same-named cities in different countries apart", () => {
    const groups = groupByCity([cafe({ city: "Paris", country: "France" }), cafe({ city: "Paris", country: "USA" })]);
    expect(groups).toHaveLength(2);
  });

  it("orders cities by first visit and cafes newest first", () => {
    const groups = groupByCity([
      cafe({ city: "B", visitedOn: "2026-05-01" }),
      cafe({ city: "A", visitedOn: "2026-06-01", name: "older" }),
      cafe({ city: "A", visitedOn: "2026-07-01", name: "newer" }),
    ]);
    expect(groups.map((g) => g.city)).toEqual(["B", "A"]);
    expect(groups[1].cafes.map((c) => c.name)).toEqual(["newer", "older"]);
  });

  it("averages longitude across the 180° line", () => {
    expect(Math.abs(averageLongitude([179, -179]))).toBeCloseTo(180, 5);
  });

  it("handles 50+ cafes in one city", () => {
    const many = Array.from({ length: 60 }, (_, i) => cafe({ id: `c${i}` }));
    const groups = groupByCity(many);
    expect(groups).toHaveLength(1);
    expect(groups[0].cafes).toHaveLength(60);
  });
});

describe("stats", () => {
  it("counts the sample data", () => {
    const s = computeStats(SAMPLE_CAFES);
    expect(s).toMatchObject({ cafes: 9, cities: 5, countries: 3 });
  });

  it("is safe for an empty globe", () => {
    expect(computeStats([])).toMatchObject({ cafes: 0, cities: 0, countries: 0, topCafe: null, favouriteVibe: null });
  });
});

describe("badges", () => {
  it("unlocks nothing on an empty globe", () => {
    expect(unlockedBadges([])).toEqual([]);
  });

  it("unlocks First Pin with one cafe", () => {
    expect(newlyUnlocked([], [cafe({})]).map((b) => b.id)).toEqual(["first-pin"]);
  });

  it("needs 3 different countries for Globetrotter", () => {
    const g = BADGES.find((b) => b.id === "globetrotter")!;
    expect(g.check([cafe({ country: "India" }), cafe({ country: "India", city: "Goa" })])).toBe(false);
    expect(g.check([cafe({ country: "India" }), cafe({ country: "UAE", city: "Dubai" }), cafe({ country: "Japan", city: "Tokyo" })])).toBe(true);
  });

  it("counts weekend visits for Weekend Wanderer (2026-01-03 is a Saturday)", () => {
    const w = BADGES.find((b) => b.id === "weekend-wanderer")!;
    const weekend = ["2026-01-03", "2026-01-04", "2026-01-10"].map((d) => cafe({ visitedOn: d }));
    expect(w.check(weekend)).toBe(true);
    expect(w.check([cafe({ visitedOn: "2026-01-05" })])).toBe(false);
  });

  it("spots filter kaapi orders for Filter Kaapi Lover", () => {
    const k = BADGES.find((b) => b.id === "filter-kaapi-lover")!;
    expect(k.check([cafe({ ordered: "Filter Kaapi" }), cafe({ ordered: "filter coffee + idli" })])).toBe(true);
    expect(k.check([cafe({ ordered: "Latte" })])).toBe(false);
  });

  it("reports progress between 0 and 1", () => {
    const ten = BADGES.find((b) => b.id === "ten-cafes")!;
    expect(ten.progress(Array.from({ length: 4 }, () => cafe({})))).toBeCloseTo(0.4);
    expect(ten.progress(Array.from({ length: 40 }, () => cafe({})))).toBe(1);
  });
});
