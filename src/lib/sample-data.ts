import type { Cafe, PlaceResult } from "./types";

/** Made-up example cafes so a new globe isn't empty in preview mode. */
export const SAMPLE_CAFES: Cafe[] = [
  { id: "ex-1", name: "Desert Bean", area: "Al Seef", city: "Dubai", country: "UAE", lat: 25.26, lon: 55.3, visitedOn: "2026-03-07", ordered: "Saffron latte", rating: 5, vibe: "Date spot", note: "Golden hour by the creek.", photos: [], kind: "cup", example: true },
  { id: "ex-2", name: "Little Kopi", area: "Tiong Bahru", city: "Singapore", country: "Singapore", lat: 1.285, lon: 103.83, visitedOn: "2026-05-14", ordered: "Kopi C + kaya toast", rating: 4, vibe: "Budget", note: "The kopi aunty was so sweet.", photos: [], kind: "filter", example: true },
  { id: "ex-3", name: "Matcha Moon", area: "Assagao", city: "Goa", country: "India", lat: 15.6, lon: 73.78, visitedOn: "2026-07-04", ordered: "Iced matcha + banana bread", rating: 5, vibe: "Aesthetic", note: "Best trip. Want to go back!", photos: [], kind: "iced", example: true },
  { id: "ex-4", name: "Brew & Bloom", area: "Koramangala", city: "Bengaluru", country: "India", lat: 12.935, lon: 77.62, visitedOn: "2026-08-16", ordered: "Iced mocha", rating: 3, vibe: "Work-friendly", note: "Good wifi, a bit loud.", photos: [], kind: "iced", example: true },
  { id: "ex-5", name: "Monsoon Mornings", area: "Indiranagar", city: "Bengaluru", country: "India", lat: 12.97, lon: 77.64, visitedOn: "2026-08-30", ordered: "Hazelnut latte", rating: 4, vibe: "Aesthetic", note: "Plants everywhere. So calm.", photos: [], kind: "cup", example: true },
  { id: "ex-6", name: "The Reading Room", area: "Nungambakkam", city: "Chennai", country: "India", lat: 13.06, lon: 80.24, visitedOn: "2026-09-06", ordered: "Cappuccino", rating: 4, vibe: "Work-friendly", note: "Finished my whole resume here.", photos: [], kind: "cup", example: true },
  { id: "ex-7", name: "Sunday Brew", area: "Adyar", city: "Chennai", country: "India", lat: 13.0, lon: 80.255, visitedOn: "2026-09-21", ordered: "Cold brew tonic", rating: 4, vibe: "Date spot", note: "Fairy lights + rain = perfect evening.", photos: [], kind: "iced", example: true },
  { id: "ex-8", name: "Kaapi Corner", area: "Mylapore", city: "Chennai", country: "India", lat: 13.034, lon: 80.27, visitedOn: "2026-09-28", ordered: "Filter kaapi + ghee podi idli", rating: 5, vibe: "Budget", note: "Tastes exactly like home.", photos: [], kind: "filter", example: true },
  { id: "ex-9", name: "Little Bean Co.", area: "Besant Nagar", city: "Chennai", country: "India", lat: 13.0, lon: 80.27, visitedOn: "2026-10-12", ordered: "Iced Spanish latte + cheesecake", rating: 5, vibe: "Aesthetic", note: "Sat by the window for hours. Coming back for the cheesecake!", photos: [], kind: "cup", example: true },
];

/**
 * Offline search results used when no Google Maps key is configured.
 * Made-up cafe names in real cities.
 */
export const SAMPLE_PLACES: PlaceResult[] = [
  { id: "sample-chennai-1", name: "Marina Morning Roasters", area: "Besant Nagar", city: "Chennai", country: "India", lat: 13.0, lon: 80.267 },
  { id: "sample-chennai-2", name: "Kaapi & Kadhai", area: "Mylapore", city: "Chennai", country: "India", lat: 13.033, lon: 80.268 },
  { id: "sample-pondy", name: "Rue Romain Cafe", area: "White Town", city: "Puducherry", country: "India", lat: 11.933, lon: 79.835 },
  { id: "sample-mumbai", name: "Bandra Bean Studio", area: "Bandra West", city: "Mumbai", country: "India", lat: 19.06, lon: 72.83 },
  { id: "sample-kochi", name: "Fort Kochi Brew House", area: "Fort Kochi", city: "Kochi", country: "India", lat: 9.965, lon: 76.242 },
  { id: "sample-hyd", name: "Irani Chai Corner", area: "Charminar", city: "Hyderabad", country: "India", lat: 17.361, lon: 78.474 },
  { id: "sample-blr", name: "Filter Coffee Club", area: "Basavanagudi", city: "Bengaluru", country: "India", lat: 12.942, lon: 77.575 },
  { id: "sample-tokyo", name: "Kissa Hoshi", area: "Shimokitazawa", city: "Tokyo", country: "Japan", lat: 35.661, lon: 139.668 },
  { id: "sample-seoul", name: "Cloud Nine Dessert Cafe", area: "Yeonnam-dong", city: "Seoul", country: "South Korea", lat: 37.562, lon: 126.925 },
  { id: "sample-paris", name: "Café des Petits Matins", area: "Le Marais", city: "Paris", country: "France", lat: 48.859, lon: 2.362 },
  { id: "sample-lisbon", name: "Pastel & Pour", area: "Alfama", city: "Lisbon", country: "Portugal", lat: 38.711, lon: -9.13 },
  { id: "sample-melb", name: "Laneway Flat White", area: "Degraves St", city: "Melbourne", country: "Australia", lat: -37.817, lon: 144.965 },
  { id: "sample-nyc", name: "Stoop Coffee Club", area: "Brooklyn", city: "New York", country: "USA", lat: 40.68, lon: -73.97 },
  { id: "sample-bali", name: "Rice Terrace Roastery", area: "Ubud", city: "Bali", country: "Indonesia", lat: -8.507, lon: 115.263 },
  { id: "sample-ist", name: "Bosphorus Kahve", area: "Karaköy", city: "Istanbul", country: "Turkey", lat: 41.024, lon: 28.977 },
];

/** Known cities, used to name the city for a pasted Maps link. */
export const KNOWN_CITIES: { city: string; country: string; lat: number; lon: number }[] = [
  { city: "Chennai", country: "India", lat: 13.08, lon: 80.27 },
  { city: "Bengaluru", country: "India", lat: 12.97, lon: 77.59 },
  { city: "Mumbai", country: "India", lat: 19.07, lon: 72.88 },
  { city: "Delhi", country: "India", lat: 28.61, lon: 77.21 },
  { city: "Hyderabad", country: "India", lat: 17.39, lon: 78.49 },
  { city: "Kolkata", country: "India", lat: 22.57, lon: 88.36 },
  { city: "Kochi", country: "India", lat: 9.93, lon: 76.27 },
  { city: "Puducherry", country: "India", lat: 11.93, lon: 79.83 },
  { city: "Goa", country: "India", lat: 15.5, lon: 73.83 },
  { city: "Dubai", country: "UAE", lat: 25.2, lon: 55.27 },
  { city: "Singapore", country: "Singapore", lat: 1.35, lon: 103.82 },
  { city: "Bangkok", country: "Thailand", lat: 13.75, lon: 100.5 },
  { city: "Bali", country: "Indonesia", lat: -8.4, lon: 115.19 },
  { city: "Tokyo", country: "Japan", lat: 35.68, lon: 139.69 },
  { city: "Seoul", country: "South Korea", lat: 37.57, lon: 126.98 },
  { city: "Istanbul", country: "Turkey", lat: 41.01, lon: 28.98 },
  { city: "Paris", country: "France", lat: 48.86, lon: 2.35 },
  { city: "London", country: "UK", lat: 51.51, lon: -0.13 },
  { city: "Rome", country: "Italy", lat: 41.9, lon: 12.5 },
  { city: "Lisbon", country: "Portugal", lat: 38.72, lon: -9.14 },
  { city: "New York", country: "USA", lat: 40.71, lon: -74.01 },
  { city: "San Francisco", country: "USA", lat: 37.77, lon: -122.42 },
  { city: "Melbourne", country: "Australia", lat: -37.81, lon: 144.96 },
  { city: "Sydney", country: "Australia", lat: -33.87, lon: 151.21 },
];
