# Cafe Passport ☕🌍

**Your cafe journal, pinned on a globe.**

Cafe Passport is a cute, colourful website where you pin every cafe you visit on a 3D globe. Each city opens a journal page of polaroids with your photos, what you ordered, your rating, the vibe and a little note. Badges are passport stamps you collect as you go.

## Why

Cafe hoppers forget which cafes they've been to, what they ordered and how it felt. Instagram and Google Maps help you *discover* cafes; nothing helps you *remember your own journey* in a fun way. Built by a cafe hopper, for cafe hoppers.

## What works today (preview)

- **3D globe** (three.js): pastel toon-shaded Earth, puffy clouds, strawberry pins that drop in and bob. Drag to spin, scroll or pinch to zoom, tap a pin to fly there.
- **New users start with an empty globe** and a 4-step guided tour (replay it any time from the sidebar).
- **Pin a cafe:** search cafes (free OpenStreetMap search by default, Google Places if you add a key) or paste a Google Maps link, add up to 6 photos (compressed on the device), order, stars, vibe, note and date.
- **City journal pages:** polaroids that flip in 3D, with Open in Google Maps, edit and delete.
- **Passport page:** stats and 7 badge stamps.
- **Journal:** every city as a polaroid cover.
- Works on phones and laptops, can be added to the home screen, respects reduced motion.

- **Accounts (Supabase):** Google sign-in; cafes and photos saved to your account, private to you (Row Level Security + a private photo bucket). Cafes saved in the browser before signing in can be moved into the account.

Without Supabase keys the site runs in **preview mode**: sign-in just asks your name and cafes are saved in your browser.

## Run it

```bash
npm install
cp .env.example .env.local   # add your Supabase URL + publishable key (optional)
npm run dev                  # http://localhost:3000
```

```bash
npm test        # unit tests (Vitest)
npm run lint
npm run build
```

## Tech stack

Next.js 15 (App Router) · TypeScript · Tailwind CSS 4 · three.js · Vitest · Supabase (auth, Postgres, storage) · OpenStreetMap Photon search (or Google Places) via server routes · Vercel + Web Analytics.

## Project map

| Path | What it is |
|---|---|
| `src/components/Globe.tsx` | The 3D globe |
| `src/components/PinCafeDialog.tsx` | The "Pin a cafe" form |
| `src/components/Polaroid.tsx` | Flipping polaroid card |
| `src/app/api/places/*` | Server routes for Google Places (the key stays on the server) |
| `src/lib/` | Grouping by city, badges, Maps-link parser, validation, storage |
| `docs/SPEC.md` | Full product spec |

## Keys and secrets

- Database setup: run `supabase/schema.sql` in the Supabase SQL Editor, then expose the 3 tables under Data API.
- `GOOGLE_MAPS_API_KEY` is optional and **server only** (no `NEXT_PUBLIC_` prefix), so it never reaches the browser. Restrict it to the Places API in Google Cloud and set a budget alert.
- `.env.local` is git-ignored. Never commit real keys; `.env.example` lists the names only.

## Credits

Earth colour and water textures are derived from NASA Blue Marble imagery (public domain), via the `three-globe` example assets.
