"use client";

import type { SupabaseClient } from "@supabase/supabase-js";
import { PHOTO_BUCKET } from "./supabase";
import type { Cafe, DrinkKind, Vibe } from "./types";

/**
 * Database + storage calls for cloud mode. Row Level Security in
 * supabase/schema.sql makes sure each person only touches their own rows.
 */

interface CafeRow {
  id: string;
  name: string;
  area: string;
  city: string;
  country: string;
  lat: number;
  lng: number;
  google_place_id: string | null;
  maps_url: string | null;
  ordered: string;
  rating: number;
  vibe: Vibe;
  note: string;
  kind: DrinkKind;
  visited_on: string;
  cafe_photos: { storage_path: string; position: number }[];
}

const COLUMNS =
  "id,name,area,city,country,lat,lng,google_place_id,maps_url,ordered,rating,vibe,note,kind,visited_on,cafe_photos(storage_path,position)";
const SIGNED_URL_SECONDS = 60 * 60 * 6;

export class CloudError extends Error {}

function friendly(action: string, err: { message?: string } | null): CloudError {
  const msg = err?.message ?? "";
  if (/network|fetch/i.test(msg)) return new CloudError(`Couldn't ${action}: you seem to be offline. Check your connection and try again.`);
  if (/jwt|auth|permission|row-level/i.test(msg)) return new CloudError(`Couldn't ${action}: please sign in again.`);
  if (/payload|too large|size/i.test(msg)) return new CloudError(`Couldn't ${action}: a photo is too large. Try a smaller one.`);
  return new CloudError(`Couldn't ${action}. Please try again in a moment.`);
}

async function signedUrls(sb: SupabaseClient, paths: string[]): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  if (!paths.length) return out;
  const { data, error } = await sb.storage.from(PHOTO_BUCKET).createSignedUrls(paths, SIGNED_URL_SECONDS);
  if (error) throw friendly("load your photos", error);
  for (const d of data ?? []) if (d.path && d.signedUrl) out.set(d.path, d.signedUrl);
  return out;
}

export async function fetchCafes(sb: SupabaseClient): Promise<Cafe[]> {
  const { data, error } = await sb.from("cafes").select(COLUMNS).order("visited_on", { ascending: false });
  if (error) throw friendly("load your cafes", error);
  const rows = (data ?? []) as CafeRow[];
  const allPaths = rows.flatMap((r) => r.cafe_photos.map((p) => p.storage_path));
  const urls = await signedUrls(sb, allPaths);
  return rows.map((r) => {
    const photos = [...r.cafe_photos].sort((a, b) => a.position - b.position);
    return {
      id: r.id,
      name: r.name,
      area: r.area,
      city: r.city,
      country: r.country,
      lat: r.lat,
      lon: r.lng,
      visitedOn: r.visited_on,
      ordered: r.ordered,
      rating: r.rating,
      vibe: r.vibe,
      note: r.note,
      kind: r.kind,
      mapsUrl: r.maps_url ?? undefined,
      googlePlaceId: r.google_place_id ?? undefined,
      photoPaths: photos.map((p) => p.storage_path),
      photos: photos.map((p) => urls.get(p.storage_path) ?? ""),
    };
  });
}

function toRow(cafe: Cafe) {
  return {
    id: cafe.id,
    name: cafe.name,
    area: cafe.area,
    city: cafe.city,
    country: cafe.country,
    lat: cafe.lat,
    lng: cafe.lon,
    google_place_id: cafe.googlePlaceId ?? null,
    maps_url: cafe.mapsUrl && cafe.mapsUrl.startsWith("https://") ? cafe.mapsUrl : null,
    ordered: cafe.ordered,
    rating: cafe.rating,
    vibe: cafe.vibe,
    note: cafe.note,
    kind: cafe.kind,
    visited_on: cafe.visitedOn,
  };
}

async function uploadPhoto(sb: SupabaseClient, userId: string, cafeId: string, dataUrl: string): Promise<string> {
  const blob = await (await fetch(dataUrl)).blob();
  const path = `${userId}/${cafeId}/${crypto.randomUUID()}.jpg`;
  const { error } = await sb.storage.from(PHOTO_BUCKET).upload(path, blob, { contentType: "image/jpeg", upsert: false });
  if (error) throw friendly("upload a photo", error);
  return path;
}

/**
 * Saves the cafe's photo list. Existing photos keep their stored file; new ones
 * (data: URLs) are uploaded; removed ones are deleted. Returns the final paths.
 */
async function syncPhotos(sb: SupabaseClient, userId: string, cafe: Cafe, before?: Cafe): Promise<string[]> {
  const oldPaths = before?.photoPaths ?? [];
  const oldByUrl = new Map((before?.photos ?? []).map((u, i) => [u, oldPaths[i]]));
  const paths: string[] = [];
  for (const src of cafe.photos) {
    const kept = oldByUrl.get(src);
    paths.push(kept ?? (await uploadPhoto(sb, userId, cafe.id, src)));
  }
  const removed = oldPaths.filter((p) => !paths.includes(p));

  if (before) {
    const { error } = await sb.from("cafe_photos").delete().eq("cafe_id", cafe.id);
    if (error) throw friendly("update your photos", error);
  }
  if (paths.length) {
    const { error } = await sb.from("cafe_photos").insert(paths.map((storage_path, position) => ({ cafe_id: cafe.id, storage_path, position })));
    if (error) throw friendly("save your photos", error);
  }
  if (removed.length) await sb.storage.from(PHOTO_BUCKET).remove(removed);
  return paths;
}

export async function insertCafe(sb: SupabaseClient, userId: string, cafe: Cafe): Promise<Cafe> {
  const { error } = await sb.from("cafes").insert(toRow(cafe));
  if (error) throw friendly("save this cafe", error);
  try {
    const photoPaths = await syncPhotos(sb, userId, cafe);
    return { ...cafe, photoPaths, example: undefined };
  } catch (err) {
    // Don't leave a cafe behind with half its photos.
    await sb.from("cafes").delete().eq("id", cafe.id);
    throw err;
  }
}

export async function updateCafeRow(sb: SupabaseClient, userId: string, cafe: Cafe, before: Cafe): Promise<Cafe> {
  const row = toRow(cafe);
  const { error } = await sb.from("cafes").update(row).eq("id", cafe.id);
  if (error) throw friendly("save your changes", error);
  const photoPaths = await syncPhotos(sb, userId, cafe, before);
  return { ...cafe, photoPaths };
}

export async function deleteCafeRow(sb: SupabaseClient, cafe: Cafe): Promise<void> {
  const { error } = await sb.from("cafes").delete().eq("id", cafe.id);
  if (error) throw friendly("delete this cafe", error);
  if (cafe.photoPaths?.length) await sb.storage.from(PHOTO_BUCKET).remove(cafe.photoPaths);
}

export async function fetchDisplayName(sb: SupabaseClient, userId: string): Promise<string | null> {
  const { data } = await sb.from("profiles").select("display_name").eq("id", userId).maybeSingle();
  return (data?.display_name as string | null) || null;
}
