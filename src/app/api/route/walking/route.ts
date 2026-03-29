import { NextRequest, NextResponse } from "next/server";
import { getWalkingRoute } from "@/app/lib/osrm";

/**
 * GET /api/route/walking?waypoints=lat1,lon1;lat2,lon2;...
 * Proxies OSRM to avoid CORS and returns a walking route polyline.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const raw = searchParams.get("waypoints");

  if (!raw) {
    return NextResponse.json({ error: "waypoints query param required (lat,lon;lat,lon;...)" }, { status: 400 });
  }

  const waypoints: [number, number][] = raw.split(";").map((pair) => {
    const [lat, lon] = pair.split(",").map(Number);
    return [lat, lon] as [number, number];
  });

  if (waypoints.length < 2 || waypoints.some(([lat, lon]) => isNaN(lat) || isNaN(lon))) {
    return NextResponse.json({ error: "Need at least 2 valid lat,lon pairs" }, { status: 400 });
  }

  try {
    const result = await getWalkingRoute(waypoints);
    return NextResponse.json(result);
  } catch (err) {
    console.error("Walking route error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to fetch walking route" },
      { status: 502 }
    );
  }
}
