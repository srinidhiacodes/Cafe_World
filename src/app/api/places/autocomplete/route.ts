import { NextResponse, type NextRequest } from "next/server";
import { autocomplete, placesMode } from "@/lib/places-server";

export async function GET(req: NextRequest) {
  const q = (req.nextUrl.searchParams.get("q") ?? "").trim();
  const session = req.nextUrl.searchParams.get("session") ?? undefined;
  if (q.length < 2 || q.length > 100) {
    return NextResponse.json({ mode: placesMode(), suggestions: [] });
  }
  try {
    const suggestions = await autocomplete(q, session);
    return NextResponse.json({ mode: placesMode(), suggestions });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Search isn't working right now. Paste a Google Maps link instead." }, { status: 502 });
  }
}
