/**
 * Digital Elevation Model (DEM) & Line-of-Sight (LOS) Radar Masking Kernel
 * Synthetic Western & Northern Theater (Lat 25.5°N - 34.0°N, Lon 70.0°E - 81.0°E)
 * 
 * Provides:
 * 1. Continuous deterministic terrain elevation query using multi-scale harmonic wavelets
 *    calibrated to known synthetic airfield elevations.
 * 2. 4/3 Earth-radius atmospheric refraction line-of-sight (LOS) occlusion checks
 *    determining if a ground-based SAM / radar site has direct line of sight to an aircraft.
 * 3. Elevation transects for 3D flight profiles.
 */

import { GeoCoord } from '@air-power/shared';
import { haversineDistanceKm, interpolateWaypoint } from '@air-power/shared';

// Standard 4/3 effective Earth radius for microwave radar refraction
export const EFFECTIVE_EARTH_RADIUS_KM = (4 / 3) * 6371; // ~8494.67 km

/**
 * Airfield elevation anchor points for calibration (in meters MSL)
 */
const ELEVATION_ANCHORS: Array<{ lat: number; lon: number; altM: number; weight: number }> = [
  { lat: 30.368, lon: 76.817, altM: 272, weight: 0.15 }, // Ambala
  { lat: 28.422, lon: 79.450, altM: 172, weight: 0.15 }, // Bareilly
  { lat: 30.749, lon: 75.633, altM: 240, weight: 0.15 }, // Halwara
  { lat: 26.251, lon: 73.048, altM: 219, weight: 0.15 }, // Jodhpur
  { lat: 31.433, lon: 75.758, altM: 233, weight: 0.15 }, // Adampur
  { lat: 26.293, lon: 78.228, altM: 188, weight: 0.15 }, // Gwalior
];

/**
 * Returns deterministic synthetic terrain elevation in meters above MSL for any coordinate.
 * Accurately models the transition from southern desert plains (150-250m) to central plains (200-300m)
 * to northern Shivalik foothills (600-1500m) and high mountain ridgelines (2500-5200m).
 */
export function getTerrainElevationM(lat: number, lon: number): number {
  // Base geographic gradient: rises sharply north of 31.5°N into the mountain ranges
  let baseElevation = 210;

  if (lat > 31.2) {
    // Foothills to high mountains
    const latFactor = (lat - 31.2) / 2.8; // 0 to 1 as lat goes 31.2 -> 34.0
    const mountainBase = 600 + Math.pow(latFactor, 1.8) * 3600;

    // Mountain ridge and valley modulation (Pir Panjal / Zanskar synthetic ridgelines)
    const ridge1 = Math.sin(lat * 12.4 + lon * 7.1) * 750;
    const ridge2 = Math.cos(lat * 21.8 - lon * 14.3) * 450;
    const valleyCut = Math.abs(Math.sin((lat - 32.2) * 8.5 + (lon - 74.5) * 6.2)) * -600;

    baseElevation = mountainBase + ridge1 + ridge2 + valleyCut;
  } else if (lat > 29.5) {
    // Indo-Gangetic Plains to Siwalik transition
    const latFactor = (lat - 29.5) / 1.7;
    const hillMod = Math.sin(lat * 8.0 + lon * 4.5) * 60;
    baseElevation = 220 + latFactor * 280 + hillMod;
  } else {
    // Thar Desert / Semi-arid plateau: low dunes and ridges (Aravalli foothills toward east)
    const aravalliRidge = Math.exp(-Math.pow((lon - 76.5) / 1.2, 2)) * 320;
    const duneMod = Math.sin(lat * 14.0 + lon * 11.0) * 35;
    baseElevation = 180 + aravalliRidge + duneMod;
  }

  // Soft blending with exact airfield anchors when close
  for (const anchor of ELEVATION_ANCHORS) {
    const dLat = lat - anchor.lat;
    const dLon = lon - anchor.lon;
    const distSq = dLat * dLat + dLon * dLon;
    if (distSq < 0.04) {
      // Within ~20 km of anchor
      const factor = Math.exp(-distSq / 0.008);
      baseElevation = baseElevation * (1 - factor) + anchor.altM * factor;
    }
  }

  return Math.max(80, Math.round(baseElevation * 10) / 10);
}

/**
 * Result of a Line-of-Sight radar occlusion calculation
 */
export interface LosRadarResult {
  isMasked: boolean;
  clearanceM: number;           // Minimum vertical clearance of ray above terrain (negative if obstructed)
  obstructionPoint?: GeoCoord;  // First terrain peak that blocks the ray
  distanceKm: number;           // Distance between radar and aircraft
  radarHorizonKm: number;       // Radar optical/microwave horizon distance
  slantRangeKm: number;
}

/**
 * Evaluates whether an aircraft at `aircraftCoord` is terrain-masked from a threat radar at `radarCoord`.
 * 
 * Uses standard 4/3 effective Earth radius to account for atmospheric refraction,
 * and steps along the great circle arc between radar and aircraft to detect terrain intersections.
 * 
 * @param radarCoord Ground location of threat radar (with altM = antenna height MSL or ground elevation + mast height)
 * @param aircraftCoord Aircraft 3D location (lat, lon, altM MSL)
 * @param radarMastHeightM Height of radar antenna above local ground (default 15m)
 * @param sampleSteps Number of intermediate terrain samples (default 24)
 */
export function checkRadarLineOfSight(
  radarCoord: GeoCoord,
  aircraftCoord: GeoCoord,
  radarMastHeightM = 15,
  sampleSteps = 24
): LosRadarResult {
  const groundAltM = getTerrainElevationM(radarCoord.lat, radarCoord.lon);
  const radarTotalAltM = Math.max(radarCoord.altM ?? groundAltM, groundAltM) + radarMastHeightM;
  const acAltM = aircraftCoord.altM ?? 5000;

  const totalDistKm = haversineDistanceKm(radarCoord, aircraftCoord);

  // Radar horizon distance in km: d = sqrt(2 * R_eff * h_radar) + sqrt(2 * R_eff * h_ac)
  const hRadarKm = radarTotalAltM / 1000;
  const hAcKm = acAltM / 1000;
  const horizonRadarKm = Math.sqrt(2 * EFFECTIVE_EARTH_RADIUS_KM * hRadarKm);
  const horizonAcKm = Math.sqrt(2 * EFFECTIVE_EARTH_RADIUS_KM * hAcKm);
  const totalHorizonKm = horizonRadarKm + horizonAcKm;

  // If aircraft is beyond the combined 4/3 Earth curvature horizon, it is inherently masked!
  if (totalDistKm > totalHorizonKm) {
    return {
      isMasked: true,
      clearanceM: -Math.round((totalDistKm - totalHorizonKm) * 80),
      distanceKm: Math.round(totalDistKm * 10) / 10,
      radarHorizonKm: Math.round(totalHorizonKm * 10) / 10,
      slantRangeKm: Math.round(Math.sqrt(totalDistKm * totalDistKm + Math.pow((acAltM - radarTotalAltM) / 1000, 2)) * 10) / 10,
    };
  }

  // Ray-sampling along path: check if any intermediate terrain crest cuts the straight-line ray
  let minClearanceM = Infinity;
  let obstructionPoint: GeoCoord | undefined;
  let isMasked = false;

  for (let step = 1; step < sampleSteps; step++) {
    const fraction = step / sampleSteps;
    const pt = interpolateWaypoint(radarCoord, aircraftCoord, fraction);
    const stepDistKm = fraction * totalDistKm;

    // Linear interpolation of altitude along the ray
    const rayUncorrectedAltM = radarTotalAltM + (acAltM - radarTotalAltM) * fraction;

    // Curvature drop for intermediate point: h_drop = (d1 * d2) / (2 * R_eff)
    const d1 = stepDistKm;
    const d2 = totalDistKm - stepDistKm;
    const curvatureDropM = ((d1 * d2) / (2 * EFFECTIVE_EARTH_RADIUS_KM)) * 1000;

    const effectiveRayAltM = rayUncorrectedAltM - curvatureDropM;
    const terrainM = getTerrainElevationM(pt.lat, pt.lon);

    const clearanceM = effectiveRayAltM - terrainM;

    if (clearanceM < minClearanceM) {
      minClearanceM = clearanceM;
    }

    if (clearanceM <= 0 && !isMasked) {
      isMasked = true;
      obstructionPoint = { lat: pt.lat, lon: pt.lon, altM: terrainM };
    }
  }

  return {
    isMasked,
    clearanceM: Math.round(minClearanceM),
    obstructionPoint,
    distanceKm: Math.round(totalDistKm * 10) / 10,
    radarHorizonKm: Math.round(totalHorizonKm * 10) / 10,
    slantRangeKm: Math.round(Math.sqrt(totalDistKm * totalDistKm + Math.pow((acAltM - radarTotalAltM) / 1000, 2)) * 10) / 10,
  };
}

/**
 * Samples elevation along a flight route to produce an elevation profile
 */
export function getRouteElevationProfile(
  waypoints: GeoCoord[],
  samples = 50
): Array<{ distanceKm: number; terrainAltM: number; flightAltM: number; lat: number; lon: number }> {
  if (waypoints.length < 2) return [];

  const profile: Array<{ distanceKm: number; terrainAltM: number; flightAltM: number; lat: number; lon: number }> = [];
  let cumulativeDist = 0;

  // Compute segment lengths
  const segmentLengths: number[] = [];
  let totalLength = 0;
  for (let i = 0; i < waypoints.length - 1; i++) {
    const d = haversineDistanceKm(waypoints[i], waypoints[i + 1]);
    segmentLengths.push(d);
    totalLength += d;
  }

  if (totalLength === 0) return [];

  for (let s = 0; s <= samples; s++) {
    const targetDist = (s / samples) * totalLength;

    // Find which segment contains this target distance
    let distSoFar = 0;
    let segIdx = 0;
    for (let i = 0; i < segmentLengths.length; i++) {
      if (distSoFar + segmentLengths[i] >= targetDist || i === segmentLengths.length - 1) {
        segIdx = i;
        break;
      }
      distSoFar += segmentLengths[i];
    }

    const segLen = segmentLengths[segIdx] || 1e-6;
    const segFrac = Math.max(0, Math.min(1, (targetDist - distSoFar) / segLen));
    const p1 = waypoints[segIdx];
    const p2 = waypoints[segIdx + 1];

    const pt = interpolateWaypoint(p1, p2, segFrac);
    const terrainAltM = getTerrainElevationM(pt.lat, pt.lon);
    const flightAltM = pt.altM ?? 5000;

    profile.push({
      distanceKm: Math.round(targetDist * 10) / 10,
      terrainAltM: Math.round(terrainAltM),
      flightAltM: Math.round(flightAltM),
      lat: Math.round(pt.lat * 1000) / 1000,
      lon: Math.round(pt.lon * 1000) / 1000,
    });
  }

  return profile;
}
