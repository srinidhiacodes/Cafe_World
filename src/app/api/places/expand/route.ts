import { NextResponse, type NextRequest } from "next/server";
import { expandShortLink } from "@/lib/places-server";

/** Turns a maps.app.goo.gl short link into the full Google Maps link. */
export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get("url") ?? "";
  try {
    const long = await expandShortLink(url);
    if (!long) return NextResponse.json({ error: "Couldn't open that short link. Paste the full Google Maps link instead." }, { status: 400 });
    return NextResponse.json({ url: long });
  } catch {
    return NextResponse.json({ error: "Couldn't open that short link. Paste the full Google Maps link instead." }, { status: 400 });
  }
}
