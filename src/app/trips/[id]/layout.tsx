import { Metadata } from "next";
import { prisma } from "@/app/lib/prisma";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;

  try {
    const trip = await prisma.trip.findUnique({
      where: { id },
      select: { title: true, destination: true, days: true, budget: true, isPublic: true },
    });

    if (!trip || !trip.isPublic) {
      return { title: "Trip — Wanderlust" };
    }

    const description = `${trip.days}-day ${trip.budget} trip to ${trip.destination} — planned with AI on Wanderlust`;

    return {
      title: `${trip.title} — Wanderlust`,
      description,
      openGraph: {
        title: trip.title,
        description,
        type: "article",
        siteName: "Wanderlust",
      },
      twitter: {
        card: "summary_large_image",
        title: trip.title,
        description,
      },
    };
  } catch {
    return { title: "Trip — Wanderlust" };
  }
}

export default function TripLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
