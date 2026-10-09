import { describe, it, expect } from 'vitest';
import {
  getTerrainElevationM,
  checkRadarLineOfSight,
  getRouteElevationProfile,
  ThreatAwareRoutePlanner,
} from '../src';
import { ThreatIntel, GeoCoord, INITIAL_AIRBASES } from '@air-power/shared';

describe('Terrain Elevation & LOS Radar Masking Kernel', () => {
  it('returns calibrated elevations for synthetic airfields within margin', () => {
    // Ambala is ~272m
    const ambalaElev = getTerrainElevationM(30.368, 76.817);
    expect(ambalaElev).toBeCloseTo(272, 0);

    // Bareilly is ~172m
    const bareillyElev = getTerrainElevationM(28.422, 79.450);
    expect(bareillyElev).toBeCloseTo(172, 0);

    // Jodhpur is ~219m
    const jodhpurElev = getTerrainElevationM(26.251, 73.048);
    expect(jodhpurElev).toBeCloseTo(219, 0);
  });

  it('correctly models northern high mountains vs southern plains', () => {
    const plainsElev = getTerrainElevationM(26.0, 72.0); // Desert
    const mountainElev = getTerrainElevationM(33.5, 75.5); // High mountain ridge

    expect(plainsElev).toBeLessThan(350);
    expect(mountainElev).toBeGreaterThan(2000);
  });

  it('detects radar horizon masking beyond 4/3 Earth curvature distance', () => {
    // Radar at ground level (200m) with 15m mast
    const radar: GeoCoord = { lat: 28.0, lon: 74.0, altM: 215 };
    // Aircraft very far away (450 km away) at low altitude (1000m)
    // Radar horizon for 215m + 1000m is ~ sqrt(2*8494*0.215) + sqrt(2*8494*1.0) = ~60 + 130 = ~190 km
    const farAc: GeoCoord = { lat: 32.0, lon: 74.0, altM: 1000 };

    const los = checkRadarLineOfSight(radar, farAc, 15);
    expect(los.isMasked).toBe(true);
    expect(los.distanceKm).toBeGreaterThan(los.radarHorizonKm);
  });

  it('allows line of sight when high altitude aircraft is well within radar horizon', () => {
    const radar: GeoCoord = { lat: 28.0, lon: 74.0, altM: 200 };
    // Aircraft 60 km away at 10,000m altitude over flat desert
    const nearAc: GeoCoord = { lat: 28.5, lon: 74.0, altM: 10000 };

    const los = checkRadarLineOfSight(radar, nearAc, 15);
    expect(los.isMasked).toBe(false);
    expect(los.clearanceM).toBeGreaterThan(0);
  });

  it('detects mountain terrain occlusion when flying low behind a ridge', () => {
    // Radar in valley south of ridgeline
    const radar: GeoCoord = { lat: 31.8, lon: 75.0, altM: 300 };
    // Aircraft behind high ridge at lat 33.2, lon 75.0 at low altitude
    const lowAc: GeoCoord = { lat: 33.2, lon: 75.0, altM: 800 };

    const los = checkRadarLineOfSight(radar, lowAc, 15);
    expect(los.isMasked).toBe(true);
  });

  it('generates consistent elevation profiles along route', () => {
    const waypoints: GeoCoord[] = [
      { lat: 30.368, lon: 76.817, altM: 9000 },
      { lat: 32.000, lon: 75.500, altM: 9000 },
      { lat: 33.000, lon: 74.500, altM: 9000 },
    ];
    const profile = getRouteElevationProfile(waypoints, 20);
    expect(profile.length).toBe(21);
    expect(profile[0].distanceKm).toBe(0);
    expect(profile[profile.length - 1].distanceKm).toBeGreaterThan(300);
    expect(profile[0].flightAltM).toBe(9000);
  });
});

describe('ThreatAwareRoutePlanner (Route A vs Route B)', () => {
  const origin = INITIAL_AIRBASES[0].location; // Ambala (30.368, 76.817)
  const target: GeoCoord = { lat: 32.45, lon: 74.12, altM: 450 }; // Tactical target

  const threats: ThreatIntel[] = [
    {
      id: 'THREAT_SAM_01',
      name: 'Long-Range SAM Complex (HQ-9 / S-400 equivalent)',
      type: 'LONG_RANGE_SAM',
      location: { lat: 31.80, lon: 75.00, altM: 400 },
      detectionRadiusKm: 280,
      engagementRadiusKm: 160,
      lethalityScore: 92,
      confidence: 95,
      sourceSystem: 'SATELLITE_ELINT',
      firstDetectedAt: new Date().toISOString(),
      lastUpdatedAt: new Date().toISOString(),
      active: true,
    },
    {
      id: 'THREAT_SAM_02',
      name: 'Medium SAM (HQ-16)',
      type: 'MEDIUM_RANGE_SAM',
      location: { lat: 32.10, lon: 74.60, altM: 350 },
      detectionRadiusKm: 120,
      engagementRadiusKm: 60,
      lethalityScore: 78,
      confidence: 90,
      sourceSystem: 'AIRBORNE_RADAR',
      firstDetectedAt: new Date().toISOString(),
      lastUpdatedAt: new Date().toISOString(),
      active: true,
    },
  ];

  it('plans Route A and Route B with distinct tactical flight envelopes', () => {
    const planner = new ThreatAwareRoutePlanner();
    const comparison = planner.planAndCompareRoutes(origin, target, threats, 'RAFALE_CLASS');

    expect(comparison.routeA).toBeDefined();
    expect(comparison.routeB).toBeDefined();

    // Route A is direct high-altitude
    expect(comparison.routeA.type).toBe('DIRECT_HIGH_ALTITUDE');
    expect(comparison.routeA.maxAltitudeM).toBeGreaterThanOrEqual(9000);

    // Route B is low-level terrain-masked
    expect(comparison.routeB.type).toBe('TERRAIN_MASKED_LOW_LEVEL');
    expect(comparison.routeB.maxAltitudeM).toBeLessThan(5000);

    // Route B delivers significant risk reduction
    expect(comparison.riskReductionPercent).toBeGreaterThan(25);
    expect(comparison.routeB.averageRiskScore).toBeLessThan(comparison.routeA.averageRiskScore);

    // Route B has higher terrain masking percentage
    expect(comparison.routeB.terrainMaskingPercent).toBeGreaterThan(comparison.routeA.terrainMaskingPercent);

    // Fuel and time deltas are quantified
    expect(comparison.fuelDeltaKg).toBeGreaterThanOrEqual(0);
    expect(comparison.timeDeltaMinutes).toBeGreaterThanOrEqual(0);
    expect(comparison.recommendationRationale).toContain('Route');
  });

  it('populates valid waypoints with telemetry for each route', () => {
    const planner = new ThreatAwareRoutePlanner();
    const comparison = planner.planAndCompareRoutes(origin, target, threats, 'SU30_CLASS');

    for (let i = 0; i < comparison.routeB.waypoints.length; i++) {
      const wp = comparison.routeB.waypoints[i];
      expect(wp.lat).toBeGreaterThan(28);
      expect(wp.lon).toBeGreaterThan(70);
      expect(wp.altM).toBeGreaterThanOrEqual(wp.terrainAltM);
      if (i > 0 && i < comparison.routeB.waypoints.length - 1) {
        expect(wp.clearanceAboveGroundM).toBeGreaterThanOrEqual(250);
      }
      expect(wp.pointRiskScore).toBeGreaterThanOrEqual(0);
      expect(wp.pointRiskScore).toBeLessThanOrEqual(100);
    }
  });
});
