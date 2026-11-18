# Cafe Passport ☕🌍

**Your cafe journal, pinned on a globe.**

Cafe Passport is a cute, colourful website where you pin every cafe you visit on a 3D globe. Each city opens a journal page of polaroids with your photos, what you ordered, your rating, the vibe and a little note. Badges are passport stamps you collect as you go.

## Why

Cafe hoppers forget which cafes they've been to, what they ordered and how it felt. Instagram and Google Maps help you *discover* cafes; nothing helps you *remember your own journey* in a fun way. Built by a cafe hopper, for cafe hoppers.

## What works today (preview)

- **3D globe** (three.js): pastel toon-shaded Earth, puffy clouds, strawberry pins that drop in and bob, dotted arcs between cities in visit order. Drag to spin, scroll or pinch to zoom, tap a pin to fly there.
- **Pin a cafe:** search (Google Places when a key is set, offline example results otherwise) or paste a Google Maps link, add up to 6 photos (compressed on the device), order, stars, vibe, note and date.
- **City journal pages:** polaroids that flip in 3D, with Open in Google Maps, edit and delete.
- **Passport page:** stats and 7 badge stamps.
- **Journal:** every city as a polaroid cover.
- Works on phones and laptops, can be added to the home screen, respects reduced motion.

**Preview mode:** sign-in is simulated and cafes are saved in your browser (localStorage). The next step connects Supabase for Google sign-in and cloud saving.

## Run it

```bash
npm install
cp .env.example .env.local   # optional: add GOOGLE_MAPS_API_KEY for real search
npm run dev                  # http://localhost:3000
```

```bash
npm test        # unit tests (Vitest)
npm run lint
npm run build
```

## Tech stack

Next.js 15 (App Router) · TypeScript · Tailwind CSS 4 · three.js · Vitest · Google Places API (New), called from server routes · Supabase and Vercel next.

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

- `GOOGLE_MAPS_API_KEY` is **server only** (no `NEXT_PUBLIC_` prefix), so it never reaches the browser. Restrict it to the Places API in Google Cloud and set a budget alert.
- `.env.local` is git-ignored. Never commit real keys; `.env.example` lists the names only.

## Credits

Earth colour and water textures are derived from NASA Blue Marble imagery (public domain), via the `three-globe` example assets.
