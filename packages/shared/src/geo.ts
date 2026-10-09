import { GeoCoord, ThreatIntel } from './schemas';

const EARTH_RADIUS_KM = 6371;

export function haversineDistanceKm(p1: GeoCoord, p2: GeoCoord): number {
  const dLat = ((p2.lat - p1.lat) * Math.PI) / 180;
  const dLon = ((p2.lon - p1.lon) * Math.PI) / 180;
  const lat1 = (p1.lat * Math.PI) / 180;
  const lat2 = (p2.lat * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(lat1) * Math.cos(lat2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_KM * c;
}

export function initialBearingDeg(p1: GeoCoord, p2: GeoCoord): number {
  const lat1 = (p1.lat * Math.PI) / 180;
  const lat2 = (p2.lat * Math.PI) / 180;
  const dLon = ((p2.lon - p1.lon) * Math.PI) / 180;

  const y = Math.sin(dLon) * Math.cos(lat2);
  const x =
    Math.cos(lat1) * Math.sin(lat2) -
    Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);
  const brng = (Math.atan2(y, x) * 180) / Math.PI;
  return (brng + 360) % 360;
}

export function interpolateWaypoint(p1: GeoCoord, p2: GeoCoord, fraction: number): GeoCoord {
  return {
    lat: p1.lat + (p2.lat - p1.lat) * fraction,
    lon: p1.lon + (p2.lon - p1.lon) * fraction,
    altM: p1.altM + (p2.altM - p1.altM) * fraction,
  };
}

/**
 * Calculates point threat score from active SAM / threat systems
 * Returns normalized risk index [0..100]
 */
export function calculatePointThreatRisk(coord: GeoCoord, threats: ThreatIntel[]): number {
  let maxRisk = 0;
  for (const t of threats) {
    if (!t.active) continue;
    const dist = haversineDistanceKm(coord, t.location);
    if (dist <= t.engagementRadiusKm) {
      // Within lethal engagement zone
      const proximityFactor = 1 - dist / t.engagementRadiusKm;
      const risk = (t.lethalityScore * 0.7 + proximityFactor * 30) * (t.confidence / 100);
      if (risk > maxRisk) maxRisk = risk;
    } else if (dist <= t.detectionRadiusKm) {
      // Within radar detection zone
      const radarFactor = 1 - dist / t.detectionRadiusKm;
      const risk = (radarFactor * 25) * (t.confidence / 100);
      if (risk > maxRisk) maxRisk = risk;
    }
  }
  return Math.min(100, Math.round(maxRisk * 10) / 10);
}

/**
 * Samples route points to estimate aggregate mission flight risk [0..100]
 */
export function calculateRouteRisk(waypoints: GeoCoord[], threats: ThreatIntel[]): number {
  if (waypoints.length < 2) return 0;
  let totalSampleRisk = 0;
  let sampleCount = 0;

  for (let i = 0; i < waypoints.length - 1; i++) {
    const start = waypoints[i];
    const end = waypoints[i + 1];
    const segmentDist = haversineDistanceKm(start, end);
    const steps = Math.max(3, Math.ceil(segmentDist / 40)); // sample every ~40 km

    for (let s = 0; s <= steps; s++) {
      const pt = interpolateWaypoint(start, end, s / steps);
      totalSampleRisk += calculatePointThreatRisk(pt, threats);
      sampleCount++;
    }
  }

  return sampleCount === 0 ? 0 : Math.min(100, Math.round((totalSampleRisk / sampleCount) * 10) / 10);
}

/**
 * Ray casting algorithm for point-in-polygon check (Airspace zones / ROZ / MEZ)
 */
export function isPointInPolygon(point: GeoCoord, polygon: GeoCoord[]): boolean {
  if (polygon.length < 3) return false;
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].lon, yi = polygon[i].lat;
    const xj = polygon[j].lon, yj = polygon[j].lat;

    const intersect =
      yi > point.lat !== yj > point.lat &&
      point.lon < ((xj - xi) * (point.lat - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}
