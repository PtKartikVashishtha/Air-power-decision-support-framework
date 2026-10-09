import { describe, it, expect } from 'vitest';
import {
  generateSortieCotEvent,
  generateThreatCotEvent,
  generateTargetCotEvent,
  generateAirbaseCotEvent,
  generateFullCoTFeed,
  parseCotXml,
  generateTheatreGeoJson,
  generateCampaignKml,
  getOpenApiSpec,
} from '@air-power/shared';
import { generateSyntheticScenario } from '../src/synthetic-data';

describe('T1-F: Tactical Interoperability & Formats (CoT, GeoJSON, KML, OpenAPI)', () => {
  const scenario = generateSyntheticScenario(42);
  const sampleBase = scenario.bases[0];
  const sampleTarget = scenario.targetRequests[0];
  const sampleThreat = scenario.threats[0];

  const sampleSortie = {
    sortieId: 'S001',
    callsign: 'GARUDA-01',
    packageId: 'PKG-01',
    targetRequestId: sampleTarget.id,
    role: 'OMNIROLE_STRIKE' as const,
    aircraftTail: 'SB021',
    pilotId: 'P01',
    originBaseId: sampleBase.id,
    recoveryBaseId: sampleBase.id,
    munitionLoadout: [{ munitionId: 'BRAHMOS_ALCM', count: 1 }],
    depTimeMinutes: 30,
    totMinutes: 75,
    recoveryTimeMinutes: 120,
    fuelPlannedKg: 6800,
    routeWaypoints: [
      sampleBase.location,
      { lat: 31.0, lon: 75.5, altM: 6500 },
      sampleTarget.location,
      sampleBase.location,
    ],
    expectedRiskScore: 14.5,
    status: 'SCHEDULED' as const,
    isFrozen: false,
  };

  const samplePlan = {
    id: 'PLAN-001',
    name: 'Day 1 Alpha',
    description: 'Initial strike package',
    doctrineFocus: 'MAX_EFFECT' as const,
    sorties: [sampleSortie],
    kpis: {
      coveredTargetsCount: 1,
      totalTargetsCount: 1,
      priorityCoveragePercent: 100,
      totalExpectedLossScore: 14.5,
      totalFuelKg: 6800,
      solveTimeMs: 42,
    },
  };

  it('generates compliant Cursor-on-Target (CoT 2.0) XML for sorties, threats, and bases', () => {
    const sortieXml = generateSortieCotEvent(sampleSortie, sampleBase, sampleTarget, 0);
    expect(sortieXml).toContain('<event version="2.0" uid="AP-SRT-S001" type="a-f-A-M-F"');
    expect(sortieXml).toContain('<point lat="');
    expect(sortieXml).toContain('<contact callsign="GARUDA-01"');
    expect(sortieXml).toContain('<airpower packageId="PKG-01"');
    expect(sortieXml).toContain('BRAHMOS_ALCM:1');

    const threatXml = generateThreatCotEvent(sampleThreat);
    expect(threatXml).toContain(`uid="AP-THR-${sampleThreat.id}"`);
    expect(threatXml).toContain('type="a-h-G-U-c"');
    expect(threatXml).toContain(`engagementRadiusKm="${sampleThreat.engagementRadiusKm}"`);

    const baseXml = generateAirbaseCotEvent(sampleBase);
    expect(baseXml).toContain(`uid="AP-BASE-${sampleBase.id}"`);
    expect(baseXml).toContain('type="a-f-G-I-U-T-A"');
    expect(baseXml).toContain(`name="${sampleBase.name}"`);

    const feedXml = generateFullCoTFeed({
      plan: samplePlan,
      bases: scenario.bases,
      targets: scenario.targetRequests,
      threats: scenario.threats,
      simTimeMinutes: 0,
    });
    expect(feedXml).toContain('<?xml version="1.0" encoding="UTF-8" standalone="yes"?>');
    expect(feedXml).toContain('<events count="');
    expect(feedXml).toContain('</events>');
  });

  it('parses inbound Cursor-on-Target XML messages into structured CoT event objects', () => {
    const rawXml = generateSortieCotEvent(sampleSortie, sampleBase, sampleTarget, 15);
    const parsed = parseCotXml(rawXml);

    expect(parsed.success).toBe(true);
    expect(parsed.event).toBeDefined();
    expect(parsed.event?.uid).toBe('AP-SRT-S001');
    expect(parsed.event?.type).toBe('a-f-A-M-F');
    expect(parsed.event?.detail.callsign).toBe('GARUDA-01');
    expect(parsed.event?.detail.packageId).toBe('PKG-01');
    expect(parsed.event?.detail.fuelTotalKg).toBe(6800);
    expect(parsed.event?.point.lat).toBeCloseTo(31.0, 1);
    expect(parsed.event?.point.lon).toBeCloseTo(75.5, 1);

    // Malformed XML check
    const badParsed = parseCotXml('not an xml');
    expect(badParsed.success).toBe(false);
    expect(badParsed.error).toContain('Malformed CoT message');
  });

  it('generates valid RFC 7946 Theatre GeoJSON FeatureCollection', () => {
    const geoJson = generateTheatreGeoJson({
      plan: samplePlan,
      bases: scenario.bases,
      targets: scenario.targetRequests,
      threats: scenario.threats,
      airspaceZones: scenario.airspaceZones,
    });

    expect(geoJson.type).toBe('FeatureCollection');
    expect(geoJson.features.length).toBeGreaterThan(10);

    const sortieFeature = geoJson.features.find((f) => f.properties.featureType === 'SORTIE_TRACK');
    expect(sortieFeature).toBeDefined();
    expect(sortieFeature?.geometry.type).toBe('LineString');
    expect(sortieFeature?.properties.callsign).toBe('GARUDA-01');

    const threatMez = geoJson.features.find((f) => f.properties.featureType === 'THREAT_MEZ');
    expect(threatMez).toBeDefined();
    expect(threatMez?.geometry.type).toBe('Polygon');
    expect(threatMez?.geometry.coordinates[0].length).toBeGreaterThan(10); // Closed ring polygon

    const basePoint = geoJson.features.find((f) => f.properties.featureType === 'AIRBASE');
    expect(basePoint).toBeDefined();
    expect(basePoint?.geometry.type).toBe('Point');
  });

  it('generates valid KML 2.2 campaign overlay with Placemarks and styling', () => {
    const kml = generateCampaignKml({
      plan: samplePlan,
      bases: scenario.bases,
      targets: scenario.targetRequests,
      threats: scenario.threats,
    });

    expect(kml).toContain('<?xml version="1.0" encoding="UTF-8"?>');
    expect(kml).toContain('<kml xmlns="http://www.opengis.net/kml/2.2">');
    expect(kml).toContain('<Folder>');
    expect(kml).toContain('<name>Airbases &amp; Strategic Hubs</name>');
    expect(kml).toContain('<name>ATO Active Sortie Flight Paths</name>');
    expect(kml).toContain('<LineString>');
    expect(kml).toContain('</kml>');
  });

  it('exports valid OpenAPI 3.0.3 specification with Joint C2 endpoints', () => {
    const spec = getOpenApiSpec();
    expect(spec.openapi).toBe('3.0.3');
    expect((spec.info as any).title).toContain('AIR POWER');
    expect((spec.paths as any)['/api/interop/cot/sorties.xml']).toBeDefined();
    expect((spec.paths as any)['/api/interop/geojson/theatre.json']).toBeDefined();
    expect((spec.paths as any)['/api/interop/kml/campaign.kml']).toBeDefined();
    expect((spec.paths as any)['/api/interop/openapi.json']).toBeDefined();
    expect((spec.paths as any)['/api/interop/cot/ingest']).toBeDefined();
  });
});
