import { NextResponse, type NextRequest } from "next/server";
import { placeDetails } from "@/lib/places-server";

export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id") ?? "";
  const session = req.nextUrl.searchParams.get("session") ?? undefined;
  if (!/^[\w-]{1,300}$/.test(id)) {
    return NextResponse.json({ error: "Unknown place." }, { status: 400 });
  }
  try {
    const place = await placeDetails(id, session);
    if (!place) return NextResponse.json({ error: "Couldn't find that cafe. Try another result." }, { status: 404 });
    return NextResponse.json({ place });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Couldn't load that cafe right now. Try again in a moment." }, { status: 502 });
  }
}
