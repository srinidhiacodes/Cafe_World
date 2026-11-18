"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { groupByCity } from "./cities";
import { SAMPLE_CAFES } from "./sample-data";
import type { Cafe, CityGroup } from "./types";

/**
 * Preview-mode storage: everything lives in this browser (localStorage).
 * The Supabase version replaces these functions with database calls;
 * the components only use the hook below, so they don't change.
 */
const KEY = "cafe-passport:v1";

interface Saved {
  name: string | null;
  cafes: Cafe[];
}

interface StoreValue {
  ready: boolean;
  name: string | null;
  cafes: Cafe[];
  cities: CityGroup[];
  signIn: (name: string) => void;
  signOut: () => void;
  addCafe: (cafe: Cafe) => { ok: true } | { ok: false; error: string };
  updateCafe: (cafe: Cafe) => { ok: true } | { ok: false; error: string };
  deleteCafe: (id: string) => void;
  clearExamples: () => void;
}

const StoreContext = createContext<StoreValue | null>(null);

function load(): Saved | null {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Saved;
    if (!Array.isArray(parsed.cafes)) return null;
    return parsed;
  } catch {
    return null;
  }
}

function save(data: Saved): string | null {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(data));
    return null;
  } catch {
    return "Your browser's storage is full. Remove a few photos or memories and try again. (Accounts with cloud saving are coming soon.)";
  }
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [name, setName] = useState<string | null>(null);
  const [cafes, setCafes] = useState<Cafe[]>(SAMPLE_CAFES);

  useEffect(() => {
    const saved = load();
    if (saved) {
      setName(saved.name);
      setCafes(saved.cafes);
    }
    setReady(true);
  }, []);

  const commit = useCallback(
    (nextName: string | null, nextCafes: Cafe[]) => {
      const error = save({ name: nextName, cafes: nextCafes });
      if (error) return { ok: false as const, error };
      setName(nextName);
      setCafes(nextCafes);
      return { ok: true as const };
    },
    [],
  );

  const value = useMemo<StoreValue>(
    () => ({
      ready,
      name,
      cafes,
      cities: groupByCity(cafes),
      signIn: (n) => {
        commit(n.trim() || "Cafe hopper", cafes);
      },
      signOut: () => {
        commit(null, cafes);
      },
      addCafe: (cafe) => commit(name, [cafe, ...cafes]),
      updateCafe: (cafe) => commit(name, cafes.map((c) => (c.id === cafe.id ? cafe : c))),
      deleteCafe: (id) => {
        commit(name, cafes.filter((c) => c.id !== id));
      },
      clearExamples: () => {
        commit(name, cafes.filter((c) => !c.example));
      },
    }),
    [ready, name, cafes, commit],
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): StoreValue {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used inside <StoreProvider>");
  return ctx;
}

export function newId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `c-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}
