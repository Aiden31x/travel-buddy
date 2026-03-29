/**
 * Haversine distance utilities + nearest-neighbor route optimizer
 */

const EARTH_RADIUS_KM = 6371;

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

export function haversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return EARTH_RADIUS_KM * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export interface Waypoint {
  name: string;
  lat: number;
  lon: number;
  [key: string]: unknown;
}

/**
 * Total walking distance through an ordered list of waypoints (km).
 */
export function totalDistance(points: Waypoint[]): number {
  let dist = 0;
  for (let i = 1; i < points.length; i++) {
    dist += haversineDistance(
      points[i - 1].lat,
      points[i - 1].lon,
      points[i].lat,
      points[i].lon
    );
  }
  return dist;
}

/**
 * Nearest-neighbor heuristic for TSP.
 * Starts from the first point and greedily picks the closest unvisited next.
 */
export function optimizeRoute<T extends Waypoint>(points: T[]): T[] {
  if (points.length <= 2) return [...points];

  const remaining = [...points];
  const optimized: T[] = [remaining.shift()!];

  while (remaining.length > 0) {
    const last = optimized[optimized.length - 1];
    let nearestIdx = 0;
    let nearestDist = Infinity;

    for (let i = 0; i < remaining.length; i++) {
      const d = haversineDistance(last.lat, last.lon, remaining[i].lat, remaining[i].lon);
      if (d < nearestDist) {
        nearestDist = d;
        nearestIdx = i;
      }
    }

    optimized.push(remaining.splice(nearestIdx, 1)[0]);
  }

  return optimized;
}
