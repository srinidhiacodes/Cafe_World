# Cafe Passport — Product Spec (for Claude Code)

> **Name:** Cafe Passport
> **Tagline:** "Your cafe journal, pinned on a globe."
> **Theme idea:** every cafe is a stamp in your passport. Badges look like passport stamps, and the profile screen looks like a passport page.

## 1. What it is
A cute, colourful, animated 3D website where a cafe lover pins every cafe they visit on a **3D Earth**. Each pin opens **polaroid memories** of their visits, with their own photos. It's a fun memory journal, not a review site and not a spending tracker.

## 2. Why (product story)
- Cafe hoppers forget which cafes they've been to, what they ordered and how it felt.
- Instagram and Google Maps help you *discover* cafes. Nothing helps you *remember your own journey* in a fun way.
- Built by a cafe hopper (me) for people like me.

## 3. Target user
Young people (20s) who love cafe hopping and travelling and like cute, aesthetic, shareable things. Mostly on phones, also on laptops.

## 4. Platform and stack
- **Website first, mobile-first and responsive.** One link works on phones and laptops.
- Make it a **PWA** ("Add to Home Screen", app icon, opens full screen like an app).
- **Next.js (React) + TypeScript + Tailwind CSS**
- 3D globe: **three.js** (or `react-three-fiber` / `globe.gl`)
- Auth + database + photo storage: **Supabase** (Google sign-in, Postgres, Storage)
- Cafe search: **Google Places API** (see 6.4), with **OpenStreetMap (Nominatim/Photon)** as a free fallback
- Hosting: **Vercel**
- UI animations: Framer Motion

## 5. Look and feel — "Strawberry Matcha" (very important)
- **Cute, cozy, colourful cafe-journal vibes.** Like a scrapbook: dotted journal paper, polaroids, washi tape, ink stamps.
- **It's a website:** design desktop-first pages (top nav: My globe · Journal · Passport) that stack into one column on phones.
- **Colours**
  - Page: cream journal paper `#FFF6EC` with a soft dot grid (`#EBD8C6`), cards `#FFFDF8`
  - Text / ink: espresso `#4A2F27`, secondary `#8A6A5C`
  - Strawberry `#F49AB0` (soft) and `#E0607E` (pins), link/ink pink `#C24E6B`
  - Matcha `#A8D5A2` / `#CDE8C4`, butter `#FFDF8A` / `#FFE7A6`, sky `#BFE3F5`, lilac `#CDB8F0` / `#E3D6F8`
  - Primary buttons: espresso background with cream text
  - Stamp inks: pink `#D94F72`, matcha `#4E8A55`, blue `#3A86B5`, lilac `#7B5CC4`, honey `#B9781A`
- **Fonts:** Fredoka (headings), Nunito (body), Caveat (handwriting: captions, notes), IBM Plex Mono (passport details, coordinates)
- **Cute 3D globe (three.js)**
  - Pastel toon-shaded Earth: sky-blue oceans, matcha-green land, butter/peach deserts, white poles, soft rim light
  - Puffy 3D clouds orbiting slowly
  - Strawberry teardrop pins with a white dot, which drop in with a bounce and bob gently
- **Motion**
  - Drag to spin with inertia, scroll/pinch to zoom, slow auto-rotate when idle
  - Tap a city → camera flies smoothly to it
  - Polaroids drop in one by one with washi tape, tilt toward the mouse, 3D flip
  - New photos "develop" like instant film
  - Coffee-bean + heart confetti when a cafe is pinned; stamps thump onto the passport page
- Respect `prefers-reduced-motion` (no auto-rotate, no confetti, instant transitions)
- Accessible: real buttons and labels, 4.5:1 text contrast, touch targets ≥ 44px
- Performance: lazy-load the globe, compressed textures, cap pixel ratio at 2

## 6. Screens and features (Version 1)

### 6.1 Welcome / sign-in
- Landing page: cute spinning globe with pins and floating polaroids + "Pin every cafe you love on your own little globe"
- **Continue with Google** (Supabase Auth). Optional: email magic link
- First time: ask "What should we call you?" → the title becomes "<Name>'s Cafe Passport"
- Sign out from the profile screen

### 6.2 Globe home (main screen)
- Full-screen 3D Earth (section 5)
- Header: "<Name>'s Cafe Passport" + chip "X cafes pinned · Y cities"
- **One pin per city**, with a floating label chip: cup icon + city name + count bubble
- Labels hide when the pin is on the back of the globe
- Tap a pin or label → camera flies to that city and the city sheet opens
- Buttons: reset view, profile/badges
- First-visit hint: "Drag to spin · Pinch to zoom · Tap a pin" (fades out)
- Floating "Pin a cafe" button
- New users start with an **empty globe** (no example cafes) and a **guided tour** (4 steps: globe, Pin a cafe, journal, passport stamps) that ends by opening "Pin a cafe"; replayable from the sidebar
- Empty state for new users: "Your globe is waiting… pin your first cafe"

### 6.3 City sheet (polaroids)
- Phone: slides up from the bottom. Desktop: slides in from the right
- Title: "<N> memories in <City>"
- Polaroids drop in one by one with a slight random tilt and tape/pin on top
- **Front:** the user's photo (or a cute drawn cup / iced glass / filter coffee if no photo), cafe name in Caveat, area · date
- Multiple photos per memory: swipe inside the polaroid
- **Tap to flip → Back:** what I ordered, rating stars, vibe tag, handwritten note, "Open in Google Maps"
- **Edit** and **Delete** (delete asks for confirmation in the page)

### 6.4 Pin a cafe (add form) — with Google Maps search
- **Search the cafe directly in the app** using **Google Places Autocomplete** (filtered to cafes / food & drink). Suggestions appear while typing.
- Picking a result calls **Place Details** and auto-fills: cafe name, area, city, country, lat/lng, Google Maps URL (`place_id` stored too)
- **Paste a Google Maps link** as a second option: read lat/lng and name from the long URL (`@lat,lng`, `!3d…!4d…`, `?q=lat,lng`). Short links (`maps.app.goo.gl`) are expanded on the server.
- **"Cafes near me"** (optional, uses the browser's location) → Nearby Search for cafes
- Fallback when Places isn't available: OpenStreetMap search, or pick a city manually
- Other fields: Photos (up to 6, optional), What did you order?, Rating (1–5 stars), Vibe (Aesthetic / Work-friendly / Budget / Date spot), A little note, Date visited (default today)
- Cafe name and location are required; show clear inline errors
- On save: close the form, fly to the city, pin pops, confetti, toast "Pinned to <City>!"
- Same city → add to that city's pin. New city → create a new pin

**Google Places rules**
- Call Places from **Next.js API routes** (server side). The Google key stays on the server in env vars and never goes in browser code.
- Use **session tokens** (one per search → pick) to keep cost down
- Request only the fields needed (field masks)
- Restrict the key to the Places API, set a **budget alert** in Google Cloud
- Debounce typing (~250 ms), minimum 3 characters

### 6.5 My passport (stats and badges)
- Profile screen styled like a passport page: name, "member since", photo/avatar, stamps
- Fun facts (no money anywhere): cafes pinned, cities explored, countries, favourite vibe, top-rated cafe, most-explored area, "Your first pin was X months ago"
- Badges look like **passport stamps** that thump onto the page when unlocked: First Pin, 5 Cafes Club, 10 Cafes Club, 3 Cities Explorer, Globetrotter (3 countries), Weekend Wanderer, Filter Kaapi Lover

## 7. Pricing
- **Version 1 is completely free.** No limits, no payments.
- Keep the code ready for a future plan (e.g. a `plan` column on `profiles`, default `free`), but build no payment screens now.

## 8. Out of scope for V1 (later ideas)
- **Paid "Pro" plan** (later): free up to ~10 pins; Pro = unlimited pins, more photos per memory, extra globe styles (Golden Hour, Neon Night), "Year in cafes" replay, story cards. Payments via Razorpay (India) or Stripe, with the pin limit checked on the server.
- Native mobile app
- Wishlist (cafes I want to visit, shown as outline pins)
- Share my globe (public read-only link + Instagram story card)
- Friends' globes
- "You're near a cafe you pinned" reminders

## 9. Data model (Supabase)
- `profiles`: id (= auth user id), display_name, plan (default `free`), created_at
- `cafes`: id, user_id, name, area, city, country, lat, lng, google_place_id, maps_url, ordered, rating (1–5), vibe, note, visited_on, created_at
- `cafe_photos`: id, cafe_id, user_id, storage_path, position, created_at
- City pins are grouped from `cafes` by city + country
- **Row Level Security:** users can only read/write their own rows
- Photos in a private Supabase Storage bucket per user, compressed on the device before upload (max ~1600px, JPEG/WebP)

## 10. Non-functional
- Fast first load on mobile (lazy-load the globe and textures)
- Works on recent Chrome, Safari (iOS) and Firefox
- API keys in environment variables; only the Supabase anon key is public
- Error states: offline, upload failed, sign-in failed, Places search failed (fall back to OpenStreetMap), location permission denied

## 11. Testing (I'm a QA, so include this)
- **Unit:** grouping cafes by city, badge rules, form validation, Maps-link parser (long links, `!3d!4d`, `?q=`, short links, junk text)
- **API:** Places routes with mocked Google responses; key never sent to the browser; errors handled
- **Playwright E2E:** sign in (mocked), search a cafe (mocked Places), add photos, pin it, see the pin appear, open the city, flip a polaroid, edit, delete
- **Manual:** phone + desktop, reduced motion, empty state, long cafe names, 50+ cafes in one city, new city pin, night side of the globe, slow 3G load

## 12. Deliverables
1. Working app on Vercel with a shareable link
2. GitHub repo with a README: what it is, screenshots, how to run, tech stack, the product story
3. `.env.example` listing: Supabase URL, Supabase anon key, Google Maps/Places API key (server only)

## 13. Reference
`index.html` is an early visual preview (dotted globe, pins, flipping polaroids, add form with confetti). Use it for the interactions and layout. The **colours and globe style are replaced** by section 5 (Strawberry Matcha, cute pastel 3D globe). Page designs: the Cafe Passport design canvas.
