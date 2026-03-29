/**
 * OSRM (Open Source Routing Machine) walking route helper.
 * Uses the free public demo server — no API key needed.
 */

const OSRM_BASE = 'https://router.project-osrm.org';

export interface RouteResult {
  coordinates: [number, number][]; // [lat, lng] pairs for Leaflet polyline
  distance: number; // metres
  duration: number; // seconds
}

/**
 * Fetch a walking route between an ordered list of waypoints.
 * @param waypoints Array of [lat, lon] pairs (minimum 2)
 */
export async function getWalkingRoute(
  waypoints: [number, number][]
): Promise<RouteResult> {
  if (waypoints.length < 2) {
    throw new Error('Need at least 2 waypoints for a route');
  }

  // OSRM expects lon,lat (not lat,lon)
  const coords = waypoints.map(([lat, lon]) => `${lon},${lat}`).join(';');
  const url = `${OSRM_BASE}/route/v1/foot/${coords}?overview=full&geometries=geojson`;

  const res = await fetch(url);

  if (!res.ok) {
    throw new Error(`OSRM error (${res.status}): ${await res.text()}`);
  }

  const data = await res.json();

  if (data.code !== 'Ok' || !data.routes?.length) {
    throw new Error(`OSRM returned no routes: ${data.code}`);
  }

  const route = data.routes[0];

  // GeoJSON coordinates are [lon, lat] — flip to [lat, lon] for Leaflet
  const coordinates: [number, number][] = route.geometry.coordinates.map(
    ([lon, lat]: [number, number]) => [lat, lon] as [number, number]
  );

  return {
    coordinates,
    distance: route.distance,
    duration: route.duration,
  };
}
