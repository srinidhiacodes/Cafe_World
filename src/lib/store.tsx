"use client";

import { useRouter } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { User } from "@supabase/supabase-js";
import { groupByCity } from "./cities";
import { CloudError, deleteCafeRow, fetchCafes, fetchDisplayName, insertCafe, updateCafeRow } from "./cloud";
import { cloudEnabled, getSupabase } from "./supabase";
import type { Cafe, CityGroup } from "./types";

/**
 * Two modes, one API for the pages:
 * - cloud: Supabase keys are set → Google sign-in, cafes + photos saved in Supabase.
 * - local: no keys → preview mode, everything saved in this browser (localStorage).
 */
const KEY = "cafe-passport:v1";

type Result = { ok: true } | { ok: false; error: string };

interface Saved {
  name: string | null;
  cafes: Cafe[];
}

interface StoreValue {
  mode: "cloud" | "local";
  ready: boolean;
  signedIn: boolean;
  name: string | null;
  cafes: Cafe[];
  cities: CityGroup[];
  /** An error to show on the landing page (e.g. Google sign-in was cancelled). */
  authError: string | null;
  /** Cloud mode: start Google sign-in (leaves the page). */
  signInWithGoogle: () => Promise<Result>;
  /** Preview mode: "sign in" with just a name. */
  signIn: (name: string) => void;
  signOut: () => Promise<void>;
  addCafe: (cafe: Cafe) => Promise<Result>;
  updateCafe: (cafe: Cafe) => Promise<Result>;
  deleteCafe: (id: string) => Promise<Result>;
  clearExamples: () => void;
  /** Cloud mode: cafes left in this browser from preview mode, offered for import. */
  localToImport: number;
  importLocal: () => Promise<Result>;
  dismissImport: () => void;
}

const StoreContext = createContext<StoreValue | null>(null);

function loadLocal(): Saved | null {
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

function saveLocal(data: Saved): string | null {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(data));
    return null;
  } catch {
    return "Your browser's storage is full. Remove a few photos or memories and try again.";
  }
}

function firstName(user: User, profileName: string | null): string {
  const meta = user.user_metadata ?? {};
  const full = profileName || meta.full_name || meta.name || user.email?.split("@")[0] || "Cafe hopper";
  return String(full).trim().split(/\s+/)[0];
}

const errorText = (err: unknown) => (err instanceof CloudError ? err.message : "Something went wrong. Please try again.");

export function StoreProvider({ children }: { children: ReactNode }) {
  const mode: "cloud" | "local" = cloudEnabled ? "cloud" : "local";
  const [ready, setReady] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [name, setName] = useState<string | null>(null);
  const [cafes, setCafes] = useState<Cafe[]>([]);
  const [authError, setAuthError] = useState<string | null>(null);
  const [localToImport, setLocalToImport] = useState(0);
  const cafesRef = useRef<Cafe[]>([]);
  cafesRef.current = cafes;

  // ---------- start-up ----------
  useEffect(() => {
    if (mode === "local") {
      const saved = loadLocal();
      if (saved) {
        setName(saved.name);
        setCafes(saved.cafes);
      }
      setReady(true);
      return;
    }

    const sb = getSupabase()!;
    const params = new URLSearchParams(window.location.search);
    const oauthError = params.get("error_description");
    if (oauthError) setAuthError(oauthError.includes("cancel") || oauthError.includes("denied") ? "Sign-in was cancelled." : `Couldn't sign in: ${oauthError}`);

    let cancelled = false;
    const loadFor = async (u: User | null) => {
      setUser(u);
      if (!u) {
        setName(null);
        setCafes([]);
        setReady(true);
        return;
      }
      try {
        const [profileName, list] = await Promise.all([fetchDisplayName(sb, u.id), fetchCafes(sb)]);
        if (cancelled) return;
        setName(firstName(u, profileName));
        setCafes(list);
        const local = loadLocal();
        setLocalToImport(local ? local.cafes.filter((c) => !c.example).length : 0);
      } catch (err) {
        setAuthError(errorText(err));
      } finally {
        if (!cancelled) setReady(true);
      }
    };

    sb.auth.getSession().then(({ data }) => loadFor(data.session?.user ?? null));
    const { data: sub } = sb.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" || event === "SIGNED_OUT" || event === "USER_UPDATED") {
        // Defer so we don't call Supabase from inside its own auth callback.
        window.setTimeout(() => loadFor(session?.user ?? null), 0);
      }
    });
    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, [mode]);

  // ---------- local mode helpers ----------
  const commitLocal = useCallback((nextName: string | null, nextCafes: Cafe[]): Result => {
    const error = saveLocal({ name: nextName, cafes: nextCafes });
    if (error) return { ok: false, error };
    setName(nextName);
    setCafes(nextCafes);
    return { ok: true };
  }, []);

  const value = useMemo<StoreValue>(() => {
    const sb = getSupabase();
    const signedIn = mode === "cloud" ? Boolean(user) : Boolean(name);

    return {
      mode,
      ready,
      signedIn,
      name,
      cafes,
      cities: groupByCity(cafes),
      authError,

      signInWithGoogle: async () => {
        if (!sb) return { ok: false, error: "Sign-in isn't set up yet." };
        const { error } = await sb.auth.signInWithOAuth({
          provider: "google",
          options: { redirectTo: `${window.location.origin}/` },
        });
        return error ? { ok: false, error: "Couldn't open Google sign-in. Please try again." } : { ok: true };
      },

      signIn: (n) => {
        commitLocal(n.trim() || "Cafe hopper", cafesRef.current);
      },

      signOut: async () => {
        if (sb) {
          await sb.auth.signOut();
          setUser(null);
          setCafes([]);
          setName(null);
          return;
        }
        commitLocal(null, cafesRef.current);
      },

      addCafe: async (cafe) => {
        if (mode === "local") return commitLocal(name, [cafe, ...cafesRef.current]);
        if (!sb || !user) return { ok: false, error: "Please sign in again." };
        try {
          const saved = await insertCafe(sb, user.id, cafe);
          setCafes((list) => [saved, ...list]);
          return { ok: true };
        } catch (err) {
          return { ok: false, error: errorText(err) };
        }
      },

      updateCafe: async (cafe) => {
        if (mode === "local") return commitLocal(name, cafesRef.current.map((c) => (c.id === cafe.id ? cafe : c)));
        const before = cafesRef.current.find((c) => c.id === cafe.id);
        if (!sb || !user || !before) return { ok: false, error: "Please sign in again." };
        try {
          const saved = await updateCafeRow(sb, user.id, cafe, before);
          setCafes((list) => list.map((c) => (c.id === cafe.id ? saved : c)));
          return { ok: true };
        } catch (err) {
          return { ok: false, error: errorText(err) };
        }
      },

      deleteCafe: async (id) => {
        if (mode === "local") return commitLocal(name, cafesRef.current.filter((c) => c.id !== id));
        const cafe = cafesRef.current.find((c) => c.id === id);
        if (!sb || !cafe) return { ok: false, error: "Please sign in again." };
        try {
          await deleteCafeRow(sb, cafe);
          setCafes((list) => list.filter((c) => c.id !== id));
          return { ok: true };
        } catch (err) {
          return { ok: false, error: errorText(err) };
        }
      },

      clearExamples: () => {
        if (mode === "local") commitLocal(name, cafesRef.current.filter((c) => !c.example));
      },

      localToImport,
      importLocal: async () => {
        const local = loadLocal();
        if (!sb || !user || !local) return { ok: false, error: "Nothing to move." };
        const toMove = local.cafes.filter((c) => !c.example);
        const moved: Cafe[] = [];
        for (const c of toMove) {
          try {
            moved.push(await insertCafe(sb, user.id, { ...c, id: crypto.randomUUID(), photoPaths: undefined }));
          } catch (err) {
            setCafes((list) => [...moved, ...list]);
            return { ok: false, error: `Moved ${moved.length} of ${toMove.length}. ${errorText(err)}` };
          }
        }
        setCafes((list) => [...moved, ...list]);
        try {
          window.localStorage.removeItem(KEY);
        } catch {
          /* ignore */
        }
        setLocalToImport(0);
        return { ok: true };
      },
      dismissImport: () => setLocalToImport(0),
    };
  }, [mode, ready, user, name, cafes, authError, localToImport, commitLocal]);

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): StoreValue {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used inside <StoreProvider>");
  return ctx;
}

/** Sends signed-out visitors back to the landing page (cloud mode only). */
export function useRequireSignIn() {
  const { mode, ready, signedIn } = useStore();
  const router = useRouter();
  useEffect(() => {
    if (mode === "cloud" && ready && !signedIn) router.replace("/");
  }, [mode, ready, signedIn, router]);
}

export function newId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  // Fallback still in UUID shape so the database accepts it.
  return "10000000-1000-4000-8000-100000000000".replace(/[018]/g, (c) =>
    (Number(c) ^ (Math.floor(Math.random() * 256) & (15 >> (Number(c) / 4)))).toString(16),
  );
}
