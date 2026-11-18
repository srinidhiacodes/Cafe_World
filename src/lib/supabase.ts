"use client";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/** True when Supabase keys are configured (cloud mode). Otherwise the app runs in browser-only preview mode. */
export const cloudEnabled = Boolean(URL && KEY);

let client: SupabaseClient | null = null;

/** The browser Supabase client, or null on the server / without keys. */
export function getSupabase(): SupabaseClient | null {
  if (!cloudEnabled || typeof window === "undefined") return null;
  if (!client) {
    client = createClient(URL!, KEY!, {
      auth: { flowType: "pkce", persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
    });
  }
  return client;
}

export const PHOTO_BUCKET = "cafe-photos";
