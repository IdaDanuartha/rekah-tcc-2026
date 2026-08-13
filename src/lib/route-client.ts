// Routing jalan nyata via OSRM demo server (gratis, CORS terbuka).
// Dipakai di klien: gambar rute mengikuti jalan + ETA berbasis durasi jalan.

export interface RoadRoute {
  coords: [number, number][]; // [lat, lng] urut sepanjang jalan
  durationSec: number;
  distanceKm: number;
}

// OSRM pakai urutan lng,lat.
export async function fetchRoadRoute(
  from: [number, number],
  to: [number, number],
): Promise<RoadRoute | null> {
  try {
    const url = `https://router.project-osrm.org/route/v1/driving/${from[1]},${from[0]};${to[1]},${to[0]}?overview=full&geometries=geojson`;
    const r = await fetch(url);
    if (!r.ok) return null;
    const j = await r.json();
    const route = j?.routes?.[0];
    if (!route?.geometry?.coordinates) return null;
    const coords = (route.geometry.coordinates as [number, number][]).map(
      ([lng, lat]) => [lat, lng] as [number, number],
    );
    return { coords, durationSec: route.duration, distanceKm: route.distance / 1000 };
  } catch {
    return null;
  }
}

// Ambil setiap ke-n titik agar animasi demo tak terlalu banyak langkah.
export function sampleCoords(coords: [number, number][], max = 60): [number, number][] {
  if (coords.length <= max) return coords;
  const step = Math.ceil(coords.length / max);
  const out: [number, number][] = [];
  for (let i = 0; i < coords.length; i += step) out.push(coords[i]);
  const last = coords[coords.length - 1];
  if (out[out.length - 1] !== last) out.push(last);
  return out;
}
