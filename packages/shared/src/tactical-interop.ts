import {
  Airbase,
  AirspaceZone,
  GeoCoord,
  PlanCOA,
  Sortie,
  TargetRequest,
  ThreatIntel,
} from './schemas';

// ============================================================================
// 1. CURSOR-ON-TARGET (CoT) XML SCHEMA (MIL-STD / ATAK / WinTAK / Joint C2)
// ============================================================================

export interface CotPoint {
  lat: number;
  lon: number;
  hae: number; // Height Above Ellipsoid (meters)
  ce: number;  // Circular error (meters)
  le: number;  // Linear error (meters)
}

export interface CotDetail {
  callsign?: string;
  role?: string;
  packageId?: string;
  targetId?: string;
  aircraftTail?: string;
  originBase?: string;
  recoveryBase?: string;
  fuelTotalKg?: number;
  riskScore?: number;
  remarks?: string;
  threatType?: string;
  lethalityScore?: number;
}

export interface CotEvent {
  version: string;
  uid: string;
  type: string;
  how: string;
  time: string;
  start: string;
  stale: string;
  point: CotPoint;
  detail: CotDetail;
}

export function formatCotTimestamp(date: Date = new Date()): string {
  return date.toISOString().replace(/\.\d{3}Z$/, 'Z');
}

/**
 * Generates an authentic Cursor-on-Target 2.0 XML element for an active air sortie.
 * Type: a-f-A-M-F (Atom - Friendly - Air - Military - Fixed Wing)
 */
export function generateSortieCotEvent(
  sortie: Sortie,
  base?: Airbase,
  target?: TargetRequest,
  simTimeMinutes: number = 0
): string {
  const now = new Date(Date.UTC(2026, 9, 10, 6, 0, 0) + simTimeMinutes * 60000);
  const timeStr = formatCotTimestamp(now);
  const startStr = timeStr;
  const staleDate = new Date(now.getTime() + 120 * 60000);
  const staleStr = formatCotTimestamp(staleDate);

  // Position: either current interpolated waypoint, target, or origin base
  const coord =
    sortie.routeWaypoints.length > 0
      ? sortie.routeWaypoints[Math.min(1, sortie.routeWaypoints.length - 1)]
      : target?.location || base?.location || { lat: 30.0, lon: 76.0, altM: 5000 };

  const hae = coord.altM || 6000;
  const munStr = sortie.munitionLoadout.map((m) => `${m.munitionId}:${m.count}`).join(';');

  return `<event version="2.0" uid="AP-SRT-${sortie.sortieId}" type="a-f-A-M-F" how="m-g" time="${timeStr}" start="${startStr}" stale="${staleStr}">
  <point lat="${coord.lat.toFixed(6)}" lon="${coord.lon.toFixed(6)}" hae="${hae.toFixed(1)}" ce="15.0" le="10.0"/>
  <detail>
    <contact callsign="${escapeXml(sortie.callsign)}" endpoint=""/>
    <airpower packageId="${escapeXml(sortie.packageId)}" targetId="${escapeXml(sortie.targetRequestId)}" role="${escapeXml(sortie.role)}" airframeTail="${escapeXml(sortie.aircraftTail)}" pilotId="${escapeXml(sortie.pilotId)}" originBase="${escapeXml(sortie.originBaseId)}" recoveryBase="${escapeXml(sortie.recoveryBaseId)}" fuelKg="${sortie.fuelPlannedKg}" riskScore="${sortie.expectedRiskScore}" munitions="${escapeXml(munStr)}"/>
    <remarks>Air Power ATO Sortie ${sortie.sortieId} [TOT: ${sortie.totMinutes}m | Status: ${sortie.status}]</remarks>
  </detail>
</event>`;
}

/**
 * Generates a Cursor-on-Target 2.0 XML element for a Hostile Threat / SAM system.
 * Type: a-h-G-U-c (Atom - Hostile - Ground - Unit - Combat / Air Defense)
 */
export function generateThreatCotEvent(threat: ThreatIntel): string {
  const timeStr = formatCotTimestamp(new Date());
  const staleStr = formatCotTimestamp(new Date(Date.now() + 360 * 60000));
  const hae = threat.location.altM || 250;

  return `<event version="2.0" uid="AP-THR-${threat.id}" type="a-h-G-U-c" how="m-r" time="${timeStr}" start="${timeStr}" stale="${staleStr}">
  <point lat="${threat.location.lat.toFixed(6)}" lon="${threat.location.lon.toFixed(6)}" hae="${hae.toFixed(1)}" ce="${threat.detectionRadiusKm * 100}" le="50.0"/>
  <detail>
    <contact callsign="${escapeXml(threat.name)}"/>
    <threat type="${escapeXml(threat.type)}" engagementRadiusKm="${threat.engagementRadiusKm}" detectionRadiusKm="${threat.detectionRadiusKm}" lethality="${threat.lethalityScore}" confidence="${threat.confidence}" sourceSystem="${escapeXml(threat.sourceSystem)}" active="${threat.active}"/>
    <remarks>Hostile Air Defense MEZ: ${escapeXml(threat.name)} (${threat.engagementRadiusKm}km lethal radius)</remarks>
  </detail>
</event>`;
}

/**
 * Generates a Cursor-on-Target 2.0 XML element for a Ground Target Request.
 * Type: a-u-G (Atom - Unknown/Pending - Ground)
 */
export function generateTargetCotEvent(target: TargetRequest): string {
  const timeStr = formatCotTimestamp(new Date());
  const staleStr = formatCotTimestamp(new Date(Date.now() + 240 * 60000));
  const hae = target.location.altM || 300;

  return `<event version="2.0" uid="AP-TGT-${target.id}" type="a-u-G" how="m-p" time="${timeStr}" start="${timeStr}" stale="${staleStr}">
  <point lat="${target.location.lat.toFixed(6)}" lon="${target.location.lon.toFixed(6)}" hae="${hae.toFixed(1)}" ce="10.0" le="10.0"/>
  <detail>
    <contact callsign="${escapeXml(target.name)}"/>
    <target category="${escapeXml(target.category)}" priority="${target.priority}" isTimeSensitive="${target.isTimeSensitive}" status="${target.status}"/>
    <remarks>Air Power Strike Objective: ${escapeXml(target.name)} [Priority: ${target.priority}/100]</remarks>
  </detail>
</event>`;
}

/**
 * Generates a Cursor-on-Target 2.0 XML element for an Airbase Installation.
 * Type: a-f-G-I-U-T-A (Atom - Friendly - Ground - Installation - Airfield)
 */
export function generateAirbaseCotEvent(base: Airbase): string {
  const timeStr = formatCotTimestamp(new Date());
  const staleStr = formatCotTimestamp(new Date(Date.now() + 1440 * 60000));
  const hae = base.location.altM || 220;

  return `<event version="2.0" uid="AP-BASE-${base.id}" type="a-f-G-I-U-T-A" how="m-g" time="${timeStr}" start="${timeStr}" stale="${staleStr}">
  <point lat="${base.location.lat.toFixed(6)}" lon="${base.location.lon.toFixed(6)}" hae="${hae.toFixed(1)}" ce="5.0" le="5.0"/>
  <detail>
    <contact callsign="${escapeXml(base.icao)}"/>
    <airbase id="${escapeXml(base.id)}" name="${escapeXml(base.name)}" runways="${base.runways}" weather="${base.currentWeatherStatus}" sector="${escapeXml(base.sector)}"/>
    <remarks>Forward Operating Base: ${escapeXml(base.name)} (${base.icao})</remarks>
  </detail>
</event>`;
}

/**
 * Generates an aggregated CoT XML feed containing all campaign entities.
 */
export function generateFullCoTFeed(params: {
  plan?: PlanCOA;
  bases: Airbase[];
  targets: TargetRequest[];
  threats: ThreatIntel[];
  simTimeMinutes?: number;
}): string {
  const { plan, bases, targets, threats, simTimeMinutes = 0 } = params;
  const baseMap = new Map(bases.map((b) => [b.id, b]));
  const targetMap = new Map(targets.map((t) => [t.id, t]));

  const events: string[] = [];

  // Bases
  for (const b of bases) {
    events.push(generateAirbaseCotEvent(b));
  }

  // Threats
  for (const t of threats) {
    events.push(generateThreatCotEvent(t));
  }

  // Targets
  for (const tgt of targets) {
    events.push(generateTargetCotEvent(tgt));
  }

  // Active Sorties
  if (plan) {
    for (const s of plan.sorties) {
      events.push(
        generateSortieCotEvent(
          s,
          baseMap.get(s.originBaseId),
          targetMap.get(s.targetRequestId),
          simTimeMinutes
        )
      );
    }
  }

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<events count="${events.length}">\n${events.join('\n')}\n</events>`;
}

/**
 * Robust XML parser for Cursor-on-Target (CoT) messages (zero external dependencies).
 */
export function parseCotXml(xmlString: string): {
  success: boolean;
  event?: CotEvent;
  error?: string;
} {
  try {
    const trimmed = xmlString.trim();
    if (!trimmed.includes('<event') || !trimmed.includes('</event>')) {
      return { success: false, error: 'Malformed CoT message: missing <event> root element' };
    }

    const eventMatch = /<event\s+([^>]+)>/i.exec(trimmed);
    if (!eventMatch) {
      return { success: false, error: 'Failed to parse <event> tag attributes' };
    }

    const eventAttrs = parseXmlAttributes(eventMatch[1]);
    const pointMatch = /<point\s+([^>]+)\/?>/i.exec(trimmed);
    if (!pointMatch) {
      return { success: false, error: 'Missing mandatory <point> element in CoT message' };
    }

    const pointAttrs = parseXmlAttributes(pointMatch[1]);
    const point: CotPoint = {
      lat: parseFloat(pointAttrs.lat || '0'),
      lon: parseFloat(pointAttrs.lon || '0'),
      hae: parseFloat(pointAttrs.hae || '0'),
      ce: parseFloat(pointAttrs.ce || '10.0'),
      le: parseFloat(pointAttrs.le || '10.0'),
    };

    if (isNaN(point.lat) || isNaN(point.lon)) {
      return { success: false, error: 'Invalid numeric coordinates in <point> tag' };
    }

    // Detail parsing
    const detail: CotDetail = {};
    const contactMatch = /<contact\s+([^>]+)\/?>/i.exec(trimmed);
    if (contactMatch) {
      const cAttrs = parseXmlAttributes(contactMatch[1]);
      detail.callsign = cAttrs.callsign;
    }

    const airpowerMatch = /<airpower\s+([^>]+)\/?>/i.exec(trimmed);
    if (airpowerMatch) {
      const aAttrs = parseXmlAttributes(airpowerMatch[1]);
      detail.packageId = aAttrs.packageId;
      detail.targetId = aAttrs.targetId;
      detail.role = aAttrs.role;
      detail.aircraftTail = aAttrs.airframeTail;
      detail.originBase = aAttrs.originBase;
      detail.recoveryBase = aAttrs.recoveryBase;
      if (aAttrs.fuelKg) detail.fuelTotalKg = parseFloat(aAttrs.fuelKg);
      if (aAttrs.riskScore) detail.riskScore = parseFloat(aAttrs.riskScore);
    }

    const remarksMatch = /<remarks>([^<]*)<\/remarks>/i.exec(trimmed);
    if (remarksMatch) {
      detail.remarks = remarksMatch[1];
    }

    const threatMatch = /<threat\s+([^>]+)\/?>/i.exec(trimmed);
    if (threatMatch) {
      const tAttrs = parseXmlAttributes(threatMatch[1]);
      detail.threatType = tAttrs.type;
      if (tAttrs.lethality) detail.lethalityScore = parseFloat(tAttrs.lethality);
    }

    const event: CotEvent = {
      version: eventAttrs.version || '2.0',
      uid: eventAttrs.uid || `AP-INGEST-${Date.now()}`,
      type: eventAttrs.type || 'a-u-G',
      how: eventAttrs.how || 'm-g',
      time: eventAttrs.time || formatCotTimestamp(),
      start: eventAttrs.start || formatCotTimestamp(),
      stale: eventAttrs.stale || formatCotTimestamp(new Date(Date.now() + 3600000)),
      point,
      detail,
    };

    return { success: true, event };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return { success: false, error: `CoT XML parse error: ${message}` };
  }
}

// ============================================================================
// 2. TACTICAL GeoJSON FEATURECOLLECTION (RFC 7946)
// ============================================================================

export interface GeoJsonGeometry {
  type: 'Point' | 'LineString' | 'Polygon';
  coordinates: any;
}

export interface GeoJsonFeature {
  type: 'Feature';
  id?: string;
  geometry: GeoJsonGeometry;
  properties: Record<string, any>;
}

export interface GeoJsonFeatureCollection {
  type: 'FeatureCollection';
  features: GeoJsonFeature[];
}

/**
 * Computes circular polygon coordinates for radar / SAM engagement domes.
 */
export function generateCircleCoordinates(
  center: GeoCoord,
  radiusKm: number,
  steps: number = 32
): [number, number][] {
  const coords: [number, number][] = [];
  const dLat = (radiusKm / 6371) * (180 / Math.PI);
  const dLon = dLat / Math.cos((center.lat * Math.PI) / 180);

  for (let i = 0; i <= steps; i++) {
    const theta = (i / steps) * 2 * Math.PI;
    const lat = center.lat + (radiusKm / 6371) * (180 / Math.PI) * Math.sin(theta);
    const lon = center.lon + dLon * Math.cos(theta);
    coords.push([lon, lat]);
  }
  return coords;
}

/**
 * Generates an RFC 7946 GeoJSON FeatureCollection of all theatre assets,
 * routes, bases, target objectives, and threat MEZs.
 */
export function generateTheatreGeoJson(params: {
  plan?: PlanCOA;
  bases: Airbase[];
  targets: TargetRequest[];
  threats: ThreatIntel[];
  airspaceZones?: AirspaceZone[];
}): GeoJsonFeatureCollection {
  const { plan, bases, targets, threats, airspaceZones = [] } = params;
  const features: GeoJsonFeature[] = [];

  // 1. Airbases
  for (const b of bases) {
    features.push({
      type: 'Feature',
      id: `BASE-${b.id}`,
      geometry: {
        type: 'Point',
        coordinates: [b.location.lon, b.location.lat, b.location.altM || 0],
      },
      properties: {
        featureType: 'AIRBASE',
        id: b.id,
        name: b.name,
        icao: b.icao,
        runways: b.runways,
        currentWeather: b.currentWeatherStatus,
        sector: b.sector,
        markerColor: '#0052cc',
      },
    });
  }

  // 2. Target Requests
  for (const tgt of targets) {
    features.push({
      type: 'Feature',
      id: `TGT-${tgt.id}`,
      geometry: {
        type: 'Point',
        coordinates: [tgt.location.lon, tgt.location.lat, tgt.location.altM || 0],
      },
      properties: {
        featureType: 'TARGET',
        id: tgt.id,
        name: tgt.name,
        category: tgt.category,
        priority: tgt.priority,
        isTimeSensitive: tgt.isTimeSensitive,
        status: tgt.status,
        markerColor: tgt.priority > 75 ? '#dc2626' : '#ea580c',
      },
    });
  }

  // 3. SAM Threats (MEZ Polygons & Radar Centers)
  for (const thr of threats) {
    const ring = generateCircleCoordinates(thr.location, thr.engagementRadiusKm, 24);
    features.push({
      type: 'Feature',
      id: `THR-MEZ-${thr.id}`,
      geometry: {
        type: 'Polygon',
        coordinates: [ring],
      },
      properties: {
        featureType: 'THREAT_MEZ',
        id: thr.id,
        name: thr.name,
        threatType: thr.type,
        engagementRadiusKm: thr.engagementRadiusKm,
        detectionRadiusKm: thr.detectionRadiusKm,
        lethalityScore: thr.lethalityScore,
        confidence: thr.confidence,
        active: thr.active,
        fillColor: '#b91c1c',
        fillOpacity: 0.25,
      },
    });

    features.push({
      type: 'Feature',
      id: `THR-RADAR-${thr.id}`,
      geometry: {
        type: 'Point',
        coordinates: [thr.location.lon, thr.location.lat, thr.location.altM || 0],
      },
      properties: {
        featureType: 'THREAT_RADAR',
        id: thr.id,
        name: thr.name,
        threatType: thr.type,
        lethalityScore: thr.lethalityScore,
      },
    });
  }

  // 4. Airspace Zones
  for (const z of airspaceZones) {
    const polyCoords = z.polygon.map((p) => [p.lon, p.lat]);
    // Ensure ring closure
    if (polyCoords.length > 0) {
      polyCoords.push([polyCoords[0][0], polyCoords[0][1]]);
    }

    features.push({
      type: 'Feature',
      id: `ZONE-${z.id}`,
      geometry: {
        type: 'Polygon',
        coordinates: [polyCoords],
      },
      properties: {
        featureType: 'AIRSPACE_ZONE',
        id: z.id,
        name: z.name,
        zoneType: z.type,
        lowerAltitudeFt: z.lowerAltitudeFt,
        upperAltitudeFt: z.upperAltitudeFt,
        controllingUnit: z.controllingUnit,
      },
    });
  }

  // 5. Sortie Flight Tracks
  if (plan) {
    for (const s of plan.sorties) {
      const lineCoords = s.routeWaypoints.map((w) => [w.lon, w.lat, w.altM || 5000]);
      features.push({
        type: 'Feature',
        id: `SRT-${s.sortieId}`,
        geometry: {
          type: 'LineString',
          coordinates: lineCoords,
        },
        properties: {
          featureType: 'SORTIE_TRACK',
          sortieId: s.sortieId,
          callsign: s.callsign,
          packageId: s.packageId,
          role: s.role,
          aircraftTail: s.aircraftTail,
          pilotId: s.pilotId,
          totMinutes: s.totMinutes,
          expectedRiskScore: s.expectedRiskScore,
          strokeColor: s.role === 'SEAD_DEAD' ? '#f59e0b' : '#3b82f6',
        },
      });
    }
  }

  return {
    type: 'FeatureCollection',
    features,
  };
}

// ============================================================================
// 3. TACTICAL KML EXPORTER (KML 2.2 / Google Earth / FalconView)
// ============================================================================

export function generateCampaignKml(params: {
  plan?: PlanCOA;
  bases: Airbase[];
  targets: TargetRequest[];
  threats: ThreatIntel[];
  airspaceZones?: AirspaceZone[];
}): string {
  const { plan, bases, targets, threats, airspaceZones = [] } = params;

  const basePlacemarks = bases
    .map(
      (b) => `      <Placemark>
        <name>${escapeXml(b.name)} (${escapeXml(b.icao)})</name>
        <description>FOB Runway Count: ${b.runways} | Weather: ${b.currentWeatherStatus} | Sector: ${escapeXml(b.sector)}</description>
        <styleUrl>#baseStyle</styleUrl>
        <Point>
          <altitudeMode>clampToGround</altitudeMode>
          <coordinates>${b.location.lon},${b.location.lat},${b.location.altM || 0}</coordinates>
        </Point>
      </Placemark>`
    )
    .join('\n');

  const targetPlacemarks = targets
    .map(
      (t) => `      <Placemark>
        <name>${escapeXml(t.name)}</name>
        <description>Target Category: ${escapeXml(t.category)} | Priority: ${t.priority}/100 | TST: ${t.isTimeSensitive}</description>
        <styleUrl>#targetStyle</styleUrl>
        <Point>
          <altitudeMode>clampToGround</altitudeMode>
          <coordinates>${t.location.lon},${t.location.lat},${t.location.altM || 0}</coordinates>
        </Point>
      </Placemark>`
    )
    .join('\n');

  const threatPlacemarks = threats
    .map((thr) => {
      const ring = generateCircleCoordinates(thr.location, thr.engagementRadiusKm, 24);
      const kmlRing = ring.map(([lon, lat]) => `${lon},${lat},0`).join(' ');
      return `      <Placemark>
        <name>MEZ: ${escapeXml(thr.name)}</name>
        <description>Threat: ${escapeXml(thr.type)} | Lethality: ${thr.lethalityScore} | Engagement: ${thr.engagementRadiusKm}km</description>
        <styleUrl>#threatMezStyle</styleUrl>
        <Polygon>
          <altitudeMode>clampToGround</altitudeMode>
          <outerBoundaryIs>
            <LinearRing>
              <coordinates>${kmlRing}</coordinates>
            </LinearRing>
          </outerBoundaryIs>
        </Polygon>
      </Placemark>`;
    })
    .join('\n');

  const sortiePlacemarks = (plan?.sorties || [])
    .map((s) => {
      const coords = s.routeWaypoints
        .map((w) => `${w.lon},${w.lat},${w.altM || 5000}`)
        .join(' ');
      return `      <Placemark>
        <name>${escapeXml(s.callsign)} (${s.sortieId})</name>
        <description>Role: ${s.role} | Tail: ${s.aircraftTail} | TOT: ${s.totMinutes}m | Risk: ${s.expectedRiskScore}</description>
        <styleUrl>#sortieStyle</styleUrl>
        <LineString>
          <extrude>1</extrude>
          <tessellate>1</tessellate>
          <altitudeMode>relativeToGround</altitudeMode>
          <coordinates>${coords}</coordinates>
        </LineString>
      </Placemark>`;
    })
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <name>AIR POWER Tactical Campaign Master // Operation Vayu-Shakti</name>
    <description>Synthetic Tactical ATO Plan &amp; Threat Airspace Environment</description>

    <Style id="baseStyle">
      <IconStyle>
        <color>ff0000ff</color>
        <scale>1.2</scale>
        <Icon><href>http://maps.google.com/mapfiles/kml/shapes/airports.png</href></Icon>
      </IconStyle>
    </Style>

    <Style id="targetStyle">
      <IconStyle>
        <color>ff0000ff</color>
        <scale>1.1</scale>
        <Icon><href>http://maps.google.com/mapfiles/kml/shapes/target.png</href></Icon>
      </IconStyle>
    </Style>

    <Style id="threatMezStyle">
      <LineStyle><color>ff0000ff</color><width>2</width></LineStyle>
      <PolyStyle><color>4d0000ff</color><fill>1</fill><outline>1</outline></PolyStyle>
    </Style>

    <Style id="sortieStyle">
      <LineStyle><color>ffffff00</color><width>3</width></LineStyle>
    </Style>

    <Folder>
      <name>Airbases &amp; Strategic Hubs</name>
${basePlacemarks}
    </Folder>

    <Folder>
      <name>Strike Objectives &amp; TST</name>
${targetPlacemarks}
    </Folder>

    <Folder>
      <name>Hostile SAM Threat Domes (MEZ)</name>
${threatPlacemarks}
    </Folder>

    <Folder>
      <name>ATO Active Sortie Flight Paths</name>
${sortiePlacemarks}
    </Folder>
  </Document>
</kml>`;
}

// ============================================================================
// 4. OPENAPI 3.0.3 INTEROPERABILITY SPECIFICATION
// ============================================================================

export function getOpenApiSpec(): Record<string, unknown> {
  return {
    openapi: '3.0.3',
    info: {
      title: 'AIR POWER Tactical Decision-Support & Interoperability API',
      version: '2.0.0',
      description:
        'Tactical C2 API providing sub-50ms Air Tasking Order (ATO) optimization, Cursor-on-Target (CoT) XML feeds, RFC 7946 GeoJSON, KML overlays, and white-box explainability for Joint Air Command.',
      contact: {
        name: 'AIR POWER Autonomous Decision-Support Framework (SIH 26250)',
      },
    },
    servers: [
      {
        url: 'http://localhost:3001',
        description: 'Primary CAOC Tactical Edge Node',
      },
    ],
    paths: {
      '/api/state': {
        get: {
          summary: 'Get Fused Operational Picture & Active ATO Plan',
          responses: {
            '200': {
              description: 'Current campaign state and fused tactical picture',
            },
          },
        },
      },
      '/api/optimize': {
        post: {
          summary: 'Run ALNS / Matheuristic Multi-Objective ATO Optimization',
          responses: {
            '200': {
              description: 'Optimal Course of Action (COA) with KPI breakdown',
            },
          },
        },
      },
      '/api/retask': {
        post: {
          summary: 'Execute Dynamic Retasking Under Combat Inject',
          responses: {
            '200': {
              description: 'Minimal-churn retasked plan with stability index',
            },
          },
        },
      },
      '/api/routes/compare': {
        post: {
          summary: 'Compare Direct vs Low-Level Terrain-Masked Flight Ingress Routes',
          responses: {
            '200': {
              description: 'Route A vs Route B terrain profiles and radar LOS risk score deltas',
            },
          },
        },
      },
      '/api/interop/cot/sorties.xml': {
        get: {
          summary: 'Export Cursor-on-Target (CoT) 2.0 XML Feed',
          responses: {
            '200': {
              description: 'MIL-STD Cursor-on-Target XML feed for ATAK / WinTAK / Link 16 gateways',
              content: {
                'application/xml': {},
              },
            },
          },
        },
      },
      '/api/interop/geojson/theatre.json': {
        get: {
          summary: 'Export RFC 7946 Theatre GeoJSON FeatureCollection',
          responses: {
            '200': {
              description: 'Complete GIS FeatureCollection containing tracks, bases, targets, and threat domes',
              content: {
                'application/json': {},
              },
            },
          },
        },
      },
      '/api/interop/kml/campaign.kml': {
        get: {
          summary: 'Export Tactical Campaign KML 2.2 Overlay',
          responses: {
            '200': {
              description: 'Google Earth / FalconView 3D overlay with styled placemarks and flight paths',
              content: {
                'application/vnd.google-earth.kml+xml': {},
              },
            },
          },
        },
      },
      '/api/interop/openapi.json': {
        get: {
          summary: 'Export OpenAPI 3.0.3 Specification Document',
          responses: {
            '200': {
              description: 'Joint C2 Gateway API Specification JSON',
            },
          },
        },
      },
      '/api/interop/cot/ingest': {
        post: {
          summary: 'Ingest External Cursor-on-Target (CoT) XML Message',
          requestBody: {
            required: true,
            content: {
              'application/xml': {},
              'application/json': {},
            },
          },
          responses: {
            '200': {
              description: 'Parsed tactical contact and injection status',
            },
          },
        },
      },
    },
  };
}

// ============================================================================
// HELPER UTILITIES
// ============================================================================

function escapeXml(unsafe?: string): string {
  if (!unsafe) return '';
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function parseXmlAttributes(tagString: string): Record<string, string> {
  const attrs: Record<string, string> = {};
  const regex = /([a-zA-Z0-9_-]+)="([^"]*)"/g;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(tagString)) !== null) {
    attrs[match[1]] = match[2];
  }
  return attrs;
}
