import { z } from "zod";

export const tripPlanSchema = z.object({
  destination: z.object({
    name: z.string().min(1),
    lat: z.string(),
    lon: z.string(),
  }),
  places: z
    .array(
      z.object({
        name: z.string().min(1),
        lat: z.string(),
        lon: z.string(),
        type: z.string().optional(),
      })
    )
    .min(1)
    .max(20),
  days: z.number().int().min(1).max(30),
  budget: z.enum(["low", "moderate", "luxury"]),
});

export const createTripSchema = z.object({
  title: z.string().optional(),
  destination: z.string().min(1),
  destinationLat: z.union([z.string(), z.number()]),
  destinationLon: z.union([z.string(), z.number()]),
  days: z.union([z.string(), z.number()]),
  budget: z.string().default("moderate"),
  itinerary: z.any(),
  isPublic: z.boolean().optional().default(false),
  places: z
    .array(
      z.object({
        name: z.string(),
        lat: z.coerce.number(),
        lon: z.coerce.number(),
        type: z.string().optional(),
        category: z.string().optional(),
        address: z.string().optional(),
      })
    )
    .optional(),
});

export const updateTripSchema = z.object({
  title: z.string().optional(),
  isPublic: z.boolean().optional(),
  itinerary: z.any().optional(),
  days: z.number().optional(),
  budget: z.string().optional(),
});
