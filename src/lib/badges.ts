import { computeStats } from "./cities";
import type { Cafe } from "./types";

export interface Badge {
  id: string;
  title: string;
  /** Small line on the stamp, e.g. "3 COUNTRIES". */
  subtitle: string;
  /** How to unlock it, shown while locked. */
  hint: string;
  ink: string;
  shape: "circle" | "rect" | "oval";
  check: (cafes: Cafe[]) => boolean;
  /** Progress towards unlocking, 0..1. */
  progress: (cafes: Cafe[]) => number;
}

const KAAPI = /kaapi|filter coffee|filter kapi|kopi/i;

function isWeekend(iso: string): boolean {
  const day = new Date(`${iso}T12:00:00Z`).getUTCDay();
  return day === 0 || day === 6;
}

const clamp = (n: number) => Math.max(0, Math.min(1, n));

export const BADGES: Badge[] = [
  {
    id: "first-pin",
    title: "First Pin",
    subtitle: "WELCOME",
    hint: "Pin your first cafe",
    ink: "#D94F72",
    shape: "circle",
    check: (c) => c.length >= 1,
    progress: (c) => clamp(c.length / 1),
  },
  {
    id: "five-cafes",
    title: "5 Cafes Club",
    subtitle: "CAFE HOPPER",
    hint: "Pin 5 cafes",
    ink: "#4E8A55",
    shape: "rect",
    check: (c) => c.length >= 5,
    progress: (c) => clamp(c.length / 5),
  },
  {
    id: "ten-cafes",
    title: "10 Cafes Club",
    subtitle: "SUPER HOPPER",
    hint: "Pin 10 cafes",
    ink: "#3A86B5",
    shape: "circle",
    check: (c) => c.length >= 10,
    progress: (c) => clamp(c.length / 10),
  },
  {
    id: "three-cities",
    title: "3 Cities Explorer",
    subtitle: "PASSPORT",
    hint: "Pin cafes in 3 cities",
    ink: "#B9781A",
    shape: "oval",
    check: (c) => computeStats(c).cities >= 3,
    progress: (c) => clamp(computeStats(c).cities / 3),
  },
  {
    id: "globetrotter",
    title: "Globetrotter",
    subtitle: "3 COUNTRIES",
    hint: "Pin cafes in 3 countries",
    ink: "#7B5CC4",
    shape: "rect",
    check: (c) => computeStats(c).countries >= 3,
    progress: (c) => clamp(computeStats(c).countries / 3),
  },
  {
    id: "weekend-wanderer",
    title: "Weekend Wanderer",
    subtitle: "SAT · SUN",
    hint: "Visit 3 cafes on weekends",
    ink: "#D94F72",
    shape: "oval",
    check: (c) => c.filter((x) => isWeekend(x.visitedOn)).length >= 3,
    progress: (c) => clamp(c.filter((x) => isWeekend(x.visitedOn)).length / 3),
  },
  {
    id: "filter-kaapi-lover",
    title: "Filter Kaapi Lover",
    subtitle: "SOUTH INDIAN",
    hint: "Order filter kaapi twice",
    ink: "#4E8A55",
    shape: "circle",
    check: (c) => c.filter((x) => KAAPI.test(x.ordered)).length >= 2,
    progress: (c) => clamp(c.filter((x) => KAAPI.test(x.ordered)).length / 2),
  },
];

export function unlockedBadges(cafes: Cafe[]): Badge[] {
  return BADGES.filter((b) => b.check(cafes));
}

/** Badges that become unlocked when going from `before` to `after`. */
export function newlyUnlocked(before: Cafe[], after: Cafe[]): Badge[] {
  const had = new Set(unlockedBadges(before).map((b) => b.id));
  return unlockedBadges(after).filter((b) => !had.has(b.id));
}
