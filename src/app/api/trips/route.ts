import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/lib/auth";
import { prisma } from "@/app/lib/prisma";
import { createTripSchema } from "@/app/lib/validations";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const trips = await prisma.trip.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    include: { savedPlaces: true },
  });

  return NextResponse.json({ trips });
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = createTripSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }
  const { title, destination, destinationLat, destinationLon, days, budget, itinerary, places, isPublic } = parsed.data;

  const trip = await prisma.trip.create({
    data: {
      userId: session.user.id,
      title: title || `Trip to ${destination}`,
      destination,
      destinationLat: parseFloat(String(destinationLat)),
      destinationLon: parseFloat(String(destinationLon)),
      days: parseInt(String(days)),
      budget: budget || "moderate",
      itinerary,
      isPublic: isPublic ?? false,
      savedPlaces: places?.length
        ? {
            create: places.map((p: { name: string; lat: number; lon: number; type?: string; category?: string; address?: string }) => ({
              name: p.name,
              lat: p.lat,
              lon: p.lon,
              type: p.type,
              category: p.category,
              address: p.address,
            })),
          }
        : undefined,
    },
    include: { savedPlaces: true },
  });

  return NextResponse.json({ trip }, { status: 201 });
}
