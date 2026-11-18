import { describe, expect, it } from "vitest";
import { validateCafe, type CafeDraft } from "../validation";

const good: CafeDraft = {
  name: "Kaapi Corner",
  area: "Mylapore",
  city: "Chennai",
  country: "India",
  lat: 13.03,
  lon: 80.27,
  ordered: "Filter kaapi",
  rating: 5,
  vibe: "Budget",
  note: "Tastes like home",
  visitedOn: "2026-11-18",
  photos: [],
};
const today = new Date("2026-11-18T10:00:00");

describe("validateCafe", () => {
  it("accepts a complete cafe", () => {
    expect(validateCafe(good, today)).toEqual({});
  });

  it("requires a name and a location", () => {
    const e = validateCafe({ ...good, name: "  ", lat: null, lon: null }, today);
    expect(e.name).toBeTruthy();
    expect(e.location).toBeTruthy();
  });

  it("rejects long text", () => {
    const e = validateCafe({ ...good, name: "x".repeat(61), note: "y".repeat(201) }, today);
    expect(e.name).toBeTruthy();
    expect(e.note).toBeTruthy();
  });

  it("rejects ratings outside 1–5 and unknown vibes", () => {
    expect(validateCafe({ ...good, rating: 0 }, today).rating).toBeTruthy();
    expect(validateCafe({ ...good, rating: 4.5 }, today).rating).toBeTruthy();
    expect(validateCafe({ ...good, vibe: "Loud" }, today).vibe).toBeTruthy();
  });

  it("rejects future dates and more than 6 photos", () => {
    expect(validateCafe({ ...good, visitedOn: "2026-11-19" }, today).visitedOn).toBeTruthy();
    expect(validateCafe({ ...good, photos: Array(7).fill("x") }, today).photos).toBeTruthy();
  });
});
