import {
  Airbase,
  Aircraft,
  Aircrew,
  MunitionStock,
  ThreatIntel,
  AirspaceZone,
  TargetRequest,
  INITIAL_AIRBASES,
  AIRCRAFT_MODEL_SPECS,
  MUNITION_CATALOG,
} from '@air-power/shared';

export interface FullScenarioData {
  bases: Airbase[];
  aircraft: Aircraft[];
  pilots: Aircrew[];
  munitionStocks: MunitionStock[];
  threats: ThreatIntel[];
  airspaceZones: AirspaceZone[];
  targetRequests: TargetRequest[];
}

export function generateSyntheticScenario(seed = 42): FullScenarioData {
  // Simple pseudo-random generator with fixed seed for determinism
  let s = seed;
  const rand = () => {
    s = (s * 16807 + 0) % 2147483647;
    return (s - 1) / 2147483646;
  };

  const bases = [...INITIAL_AIRBASES];

  // 1. Generate Aircraft fleet (68 airframes)
  const aircraft: Aircraft[] = [];
  const tailConfigs = [
    { model: 'Su-30MKI Class', specKey: 'SU30_CLASS', prefix: 'SB', count: 24, squad: 'No. 220 Desert Tigers', baseId: 'BASE_JODHPUR' },
    { model: 'Su-30MKI Class', specKey: 'SU30_CLASS', prefix: 'SB', count: 12, squad: 'No. 8 City of Bareilly', baseId: 'BASE_BAREILLY' },
    { model: 'Rafale Class', specKey: 'RAFALE_CLASS', prefix: 'RB', count: 14, squad: 'No. 17 Golden Arrows', baseId: 'BASE_AMBALA' },
    { model: 'Tejas Class', specKey: 'TEJAS_CLASS', prefix: 'LA', count: 8, squad: 'No. 45 Flying Daggers', baseId: 'BASE_HALWARA' },
    { model: 'Mirage Class', specKey: 'MIRAGE_CLASS', prefix: 'KF', count: 6, squad: 'No. 1 Tigers Strike', baseId: 'BASE_GWALIOR' },
    { model: 'IL-78 Tanker Class', specKey: 'IL78_TANKER', prefix: 'RK', count: 2, squad: 'No. 78 Battleaxes Tanker', baseId: 'BASE_ADAMPUR' },
    { model: 'Netra AEW&C Class', specKey: 'NETRA_AEWC', prefix: 'KW', count: 2, squad: 'No. 50 AEW&C Squadron', baseId: 'BASE_AMBALA' },
  ];

  let tailSeq = 101;
  for (const cfg of tailConfigs) {
    const spec = AIRCRAFT_MODEL_SPECS[cfg.specKey];
    for (let i = 0; i < cfg.count; i++) {
      const tailNumber = `${cfg.prefix}-${tailSeq++}`;
      const isAog = rand() < 0.08; // 8% initial maintenance rate
      const status = isAog ? 'AOG' : 'FMC';
      aircraft.push({
        tailNumber,
        model: cfg.model,
        squadron: cfg.squad,
        baseId: cfg.baseId,
        roles: [...spec.roles],
        status,
        fuelCapacityKg: spec.fuelCapacityKg,
        currentFuelKg: Math.round(spec.fuelCapacityKg * (0.85 + rand() * 0.15)),
        combatRadiusKm: spec.combatRadiusKm,
        cruiseSpeedKmh: spec.cruiseSpeedKmh,
        hardpoints: spec.hardpoints,
        turnaroundTimeMinutes: spec.turnaroundTimeMinutes,
        flightHoursTotal: Math.round(450 + rand() * 1200),
        snagDescription: isAog ? 'Hydraulic actuator pressure loss during pre-flight' : undefined,
        turnaroundEta: isAog ? new Date(Date.now() + 45 * 60000).toISOString() : undefined,
      });
    }
  }

  // 2. Generate Aircrew (96 pilots)
  const pilots: Aircrew[] = [];
  const ranks = ['Wg Cdr', 'Sqn Ldr', 'Flt Lt'];
  const callsignNouns = [
    'Garuda', 'Viper', 'Trishul', 'Cobra', 'Thunder', 'Falcon', 'Bravo', 'Saber',
    'Hawk', 'Ghost', 'Raptor', 'Shadow', 'Striker', 'Titan', 'Apex', 'Tempest',
  ];

  let pilotSeq = 1;
  for (const ac of aircraft) {
    // Generate at least 1.4 pilots per aircraft
    const pilotCount = ac.model.includes('Tanker') || ac.model.includes('AEW&C') ? 2 : 1;
    for (let p = 0; p < pilotCount; p++) {
      const id = `PILOT-${pilotSeq.toString().padStart(3, '0')}`;
      const rank = ranks[Math.floor(rand() * ranks.length)];
      const noun = callsignNouns[Math.floor(rand() * callsignNouns.length)];
      const callsign = `${noun}-${pilotSeq}`;
      const dutyHours = Math.round(rand() * 7 * 10) / 10;
      const fatigue = Math.min(85, Math.round(dutyHours * 8 + rand() * 15));
      const isFatigued = fatigue > 65;

      const quals: Aircrew['qualifications'] = ['AIR_TO_AIR_BVR'];
      if (ac.model.includes('Rafale') || ac.model.includes('Su-30')) {
        quals.push('DEEP_PRECISION_STRIKE', 'AIR_REFUEL_QUAL', 'NIGHT_OPERATIONS');
      }
      if (rand() > 0.4) quals.push('SEAD_TACTICS');
      if (rank === 'Wg Cdr' || rank === 'Sqn Ldr') quals.push('FORMATION_LEAD');

      pilots.push({
        id,
        callsign,
        rank,
        baseId: ac.baseId,
        typeRating: ac.model,
        qualifications: quals,
        dutyHoursLast24h: dutyHours,
        fatigueScore: fatigue,
        status: isFatigued ? 'FATIGUED' : 'READY',
        totalSortiesFlown: Math.round(80 + rand() * 450),
      });
      pilotSeq++;
    }
  }

  // 3. Munitions Stockpiles
  const munitionStocks: MunitionStock[] = [];
  for (const b of bases) {
    for (const m of MUNITION_CATALOG) {
      let qty = 30;
      if (m.category === 'BVR_AAM') qty = 60 + Math.floor(rand() * 40);
      else if (m.category === 'STANDOFF_CRUISE_MISSILE') qty = 12 + Math.floor(rand() * 10);
      else if (m.category === 'PRECISION_GUIDED_BOMB') qty = 45 + Math.floor(rand() * 30);
      else if (m.category === 'ANTI_RADIATION_MISSILE') qty = 20 + Math.floor(rand() * 15);

      munitionStocks.push({
        baseId: b.id,
        munitionId: m.id,
        quantity: qty,
      });
    }
  }

  // 4. Threats & Intel (SAMs, EW, Radars)
  const threats: ThreatIntel[] = [
    {
      id: 'THREAT_SAM_01',
      name: 'Strategic SAM Battery Alpha (S-400 Class)',
      type: 'LONG_RANGE_SAM',
      location: { lat: 32.85, lon: 74.35, altM: 520 },
      detectionRadiusKm: 380,
      engagementRadiusKm: 240,
      lethalityScore: 95,
      confidence: 96,
      sourceSystem: 'SATELLITE_ELINT_FUSION',
      firstDetectedAt: new Date(Date.now() - 3600000 * 8).toISOString(),
      lastUpdatedAt: new Date(Date.now() - 300000).toISOString(),
      active: true,
    },
    {
      id: 'THREAT_SAM_02',
      name: 'Medium SAM Complex Bravo (HQ-16 Class)',
      type: 'MEDIUM_RANGE_SAM',
      location: { lat: 31.80, lon: 73.90, altM: 310 },
      detectionRadiusKm: 140,
      engagementRadiusKm: 70,
      lethalityScore: 78,
      confidence: 90,
      sourceSystem: 'AIRBORNE_RECCE_RADAR',
      firstDetectedAt: new Date(Date.now() - 3600000 * 5).toISOString(),
      lastUpdatedAt: new Date(Date.now() - 600000).toISOString(),
      active: true,
    },
    {
      id: 'THREAT_SAM_03',
      name: 'Forward SAM Site Charlie (Buk Class)',
      type: 'MEDIUM_RANGE_SAM',
      location: { lat: 30.20, lon: 72.80, altM: 190 },
      detectionRadiusKm: 120,
      engagementRadiusKm: 50,
      lethalityScore: 70,
      confidence: 85,
      sourceSystem: 'SIGINT_DIRECTION_FINDER',
      firstDetectedAt: new Date(Date.now() - 3600000 * 3).toISOString(),
      lastUpdatedAt: new Date(Date.now() - 900000).toISOString(),
      active: true,
    },
    {
      id: 'THREAT_RADAR_01',
      name: 'Early Warning 3D Surveillance Radar',
      type: 'EARLY_WARNING_RADAR',
      location: { lat: 33.10, lon: 73.60, altM: 780 },
      detectionRadiusKm: 420,
      engagementRadiusKm: 10,
      lethalityScore: 25,
      confidence: 94,
      sourceSystem: 'ELINT_PAYLOAD',
      firstDetectedAt: new Date(Date.now() - 3600000 * 12).toISOString(),
      lastUpdatedAt: new Date(Date.now() - 1200000).toISOString(),
      active: true,
    },
    {
      id: 'THREAT_EW_01',
      name: 'High-Power GPS/Comms Jamming Station',
      type: 'EW_JAMMER',
      location: { lat: 31.40, lon: 73.20, altM: 260 },
      detectionRadiusKm: 210,
      engagementRadiusKm: 90,
      lethalityScore: 40,
      confidence: 88,
      sourceSystem: 'AIRBORNE_ESM_NETRA',
      firstDetectedAt: new Date(Date.now() - 3600000 * 4).toISOString(),
      lastUpdatedAt: new Date(Date.now() - 400000).toISOString(),
      active: true,
    },
    {
      id: 'THREAT_CAP_01',
      name: 'Hostile Combat Air Patrol Sector Delta',
      type: 'HOSTILE_CAP_SWARM',
      location: { lat: 29.50, lon: 71.90, altM: 8500 },
      detectionRadiusKm: 160,
      engagementRadiusKm: 90,
      lethalityScore: 82,
      confidence: 76,
      sourceSystem: 'RADAR_TRACK_CORRELATION',
      firstDetectedAt: new Date(Date.now() - 1800000).toISOString(),
      lastUpdatedAt: new Date(Date.now() - 180000).toISOString(),
      active: true,
    },
  ];

  // 5. Airspace Zones (Corridors, ROZs, MEZs)
  const airspaceZones: AirspaceZone[] = [
    {
      id: 'ACO_CORRIDOR_NORTH',
      name: 'Northern Strike Transit Corridor (VAYU-ALPHA)',
      type: 'CORRIDOR',
      polygon: [
        { lat: 30.5, lon: 76.5, altM: 6000 },
        { lat: 31.8, lon: 75.5, altM: 6000 },
        { lat: 32.2, lon: 75.8, altM: 6000 },
        { lat: 30.9, lon: 76.9, altM: 6000 },
      ],
      lowerAltitudeFt: 18000,
      upperAltitudeFt: 32000,
      activeFromTimeMinutes: 0,
      activeToTimeMinutes: 1440,
      controllingUnit: 'CAOC-NORTH_RADAR',
    },
    {
      id: 'ACO_ROZ_DEFENSE_WEST',
      name: 'Restricted Airspace Zone (ROZ-BRAVO)',
      type: 'ROZ',
      polygon: [
        { lat: 27.5, lon: 72.8, altM: 0 },
        { lat: 28.5, lon: 72.5, altM: 0 },
        { lat: 28.6, lon: 73.8, altM: 0 },
        { lat: 27.4, lon: 73.6, altM: 0 },
      ],
      lowerAltitudeFt: 0,
      upperAltitudeFt: 45000,
      activeFromTimeMinutes: 0,
      activeToTimeMinutes: 1440,
      controllingUnit: 'TACTICAL_AIR_COMMAND',
    },
    {
      id: 'ACO_AAR_ORBIT_01',
      name: 'Air Refueling Orbit Track (PEGASUS-1)',
      type: 'REFUELING_TRACK',
      polygon: [
        { lat: 29.8, lon: 75.2, altM: 7000 },
        { lat: 29.8, lon: 76.5, altM: 7000 },
        { lat: 30.2, lon: 76.5, altM: 7000 },
        { lat: 30.2, lon: 75.2, altM: 7000 },
      ],
      lowerAltitudeFt: 22000,
      upperAltitudeFt: 28000,
      activeFromTimeMinutes: 30,
      activeToTimeMinutes: 720,
      controllingUnit: 'TANKER_CONTROL_NET',
    },
  ];

  // 6. Target Requests (42 tactical and strategic targets)
  const targetRequests: TargetRequest[] = [
    {
      id: 'TGT-001',
      name: 'Enemy Division C2 Underground Bunker',
      category: 'COMMAND_CONTROL_BUNKER',
      location: { lat: 32.45, lon: 74.12, altM: 450 },
      priority: 95,
      totStartMinutes: 90,
      totEndMinutes: 130,
      requiredPackage: { strikeSorties: 2, seadSorties: 2, escortSorties: 2, tankerSorties: 1 },
      desiredMunitions: ['STANDOFF_CRUISE_MISSILE', 'PRECISION_GUIDED_BOMB'],
      minMunitionsCount: 4,
      isTimeSensitive: false,
      status: 'PENDING',
    },
    {
      id: 'TGT-002',
      name: 'Forward Operational Airbase Runway Interdiction',
      category: 'AIRBASE_RUNWAY_INTERDICTION',
      location: { lat: 31.95, lon: 73.65, altM: 280 },
      priority: 92,
      totStartMinutes: 60,
      totEndMinutes: 100,
      requiredPackage: { strikeSorties: 4, seadSorties: 2, escortSorties: 2, tankerSorties: 1 },
      desiredMunitions: ['PRECISION_GUIDED_BOMB'],
      minMunitionsCount: 8,
      isTimeSensitive: false,
      status: 'PENDING',
    },
    {
      id: 'TGT-003',
      name: 'High-Altitude 3D Surveillance Radar Node',
      category: 'RADAR_EARLY_WARNING',
      location: { lat: 33.10, lon: 73.60, altM: 780 },
      priority: 88,
      totStartMinutes: 45,
      totEndMinutes: 80,
      requiredPackage: { strikeSorties: 2, seadSorties: 2, escortSorties: 1, tankerSorties: 0 },
      desiredMunitions: ['ANTI_RADIATION_MISSILE', 'PRECISION_GUIDED_BOMB'],
      minMunitionsCount: 4,
      isTimeSensitive: false,
      status: 'PENDING',
    },
    {
      id: 'TGT-004',
      name: 'Hardened Ammunition & Fuel Storage Depot',
      category: 'MUNITIONS_DEPOT',
      location: { lat: 31.25, lon: 73.10, altM: 220 },
      priority: 84,
      totStartMinutes: 120,
      totEndMinutes: 180,
      requiredPackage: { strikeSorties: 2, seadSorties: 1, escortSorties: 2, tankerSorties: 0 },
      desiredMunitions: ['PRECISION_GUIDED_BOMB'],
      minMunitionsCount: 4,
      isTimeSensitive: false,
      status: 'PENDING',
    },
    {
      id: 'TGT-005',
      name: 'Strategic Rail Chokepoint Bridge',
      category: 'TACTICAL_BRIDGE_CHOKEPOINT',
      location: { lat: 30.65, lon: 72.40, altM: 160 },
      priority: 79,
      totStartMinutes: 110,
      totEndMinutes: 160,
      requiredPackage: { strikeSorties: 2, seadSorties: 1, escortSorties: 1, tankerSorties: 0 },
      desiredMunitions: ['PRECISION_GUIDED_BOMB', 'STANDOFF_CRUISE_MISSILE'],
      minMunitionsCount: 4,
      isTimeSensitive: false,
      status: 'PENDING',
    },
    {
      id: 'TGT-006',
      name: 'Combat Air Patrol Sector Intercept',
      category: 'DEFENSIVE_COUNTER_AIR',
      location: { lat: 29.80, lon: 72.10, altM: 7000 },
      priority: 89,
      totStartMinutes: 40,
      totEndMinutes: 90,
      requiredPackage: { strikeSorties: 0, seadSorties: 0, escortSorties: 4, tankerSorties: 1 },
      desiredMunitions: ['BVR_AAM'],
      minMunitionsCount: 8,
      isTimeSensitive: false,
      status: 'PENDING',
    },
    {
      id: 'TGT-007',
      name: 'Integrated SAM Battery (S-400 Radar Mast)',
      category: 'RADAR_EARLY_WARNING',
      location: { lat: 32.85, lon: 74.35, altM: 520 },
      priority: 98,
      totStartMinutes: 50,
      totEndMinutes: 85,
      requiredPackage: { strikeSorties: 2, seadSorties: 4, escortSorties: 2, tankerSorties: 1 },
      desiredMunitions: ['ANTI_RADIATION_MISSILE', 'STANDOFF_CRUISE_MISSILE'],
      minMunitionsCount: 6,
      isTimeSensitive: false,
      status: 'PENDING',
    },
    {
      id: 'TGT-008',
      name: 'Forward Armoured Regimental Assembly Area',
      category: 'COMMAND_CONTROL_BUNKER',
      location: { lat: 30.15, lon: 71.95, altM: 140 },
      priority: 76,
      totStartMinutes: 150,
      totEndMinutes: 210,
      requiredPackage: { strikeSorties: 2, seadSorties: 1, escortSorties: 1, tankerSorties: 0 },
      desiredMunitions: ['PRECISION_GUIDED_BOMB'],
      minMunitionsCount: 4,
      isTimeSensitive: false,
      status: 'PENDING',
    },
    {
      id: 'TGT-009',
      name: 'Secondary Airfield Dispersal Hangars',
      category: 'AIRBASE_RUNWAY_INTERDICTION',
      location: { lat: 29.10, lon: 71.40, altM: 110 },
      priority: 72,
      totStartMinutes: 180,
      totEndMinutes: 240,
      requiredPackage: { strikeSorties: 2, seadSorties: 0, escortSorties: 2, tankerSorties: 0 },
      desiredMunitions: ['PRECISION_GUIDED_BOMB'],
      minMunitionsCount: 4,
      isTimeSensitive: false,
      status: 'PENDING',
    },
    {
      id: 'TGT-010',
      name: 'Communications Relay Station on Ridge',
      category: 'COMMAND_CONTROL_BUNKER',
      location: { lat: 33.40, lon: 74.80, altM: 1650 },
      priority: 81,
      totStartMinutes: 80,
      totEndMinutes: 120,
      requiredPackage: { strikeSorties: 2, seadSorties: 1, escortSorties: 1, tankerSorties: 0 },
      desiredMunitions: ['PRECISION_GUIDED_BOMB'],
      minMunitionsCount: 2,
      isTimeSensitive: false,
      status: 'PENDING',
    },
    {
      id: 'TGT-011',
      name: 'Enemy Logistic Train Marshaling Yard',
      category: 'TACTICAL_BRIDGE_CHOKEPOINT',
      location: { lat: 31.70, lon: 74.20, altM: 220 },
      priority: 75,
      totStartMinutes: 130,
      totEndMinutes: 190,
      requiredPackage: { strikeSorties: 2, seadSorties: 1, escortSorties: 1, tankerSorties: 0 },
      desiredMunitions: ['PRECISION_GUIDED_BOMB'],
      minMunitionsCount: 4,
      isTimeSensitive: false,
      status: 'PENDING',
    },
    {
      id: 'TGT-012',
      name: 'Hostile CAP Interception Over Sector North',
      category: 'DEFENSIVE_COUNTER_AIR',
      location: { lat: 32.10, lon: 75.10, altM: 8000 },
      priority: 91,
      totStartMinutes: 30,
      totEndMinutes: 75,
      requiredPackage: { strikeSorties: 0, seadSorties: 0, escortSorties: 4, tankerSorties: 1 },
      desiredMunitions: ['BVR_AAM'],
      minMunitionsCount: 8,
      isTimeSensitive: false,
      status: 'PENDING',
    },
  ];

  // Add 18 more realistic mission requests across sectors to total 30 standard targets
  for (let t = 13; t <= 30; t++) {
    const categories: TargetRequest['category'][] = [
      'COMMAND_CONTROL_BUNKER',
      'AIRBASE_RUNWAY_INTERDICTION',
      'RADAR_EARLY_WARNING',
      'MUNITIONS_DEPOT',
      'TACTICAL_BRIDGE_CHOKEPOINT',
      'DEFENSIVE_COUNTER_AIR',
    ];
    const cat = categories[t % categories.length];
    const prio = Math.floor(60 + rand() * 35);
    const startM = Math.floor(40 + rand() * 180);
    const durM = Math.floor(40 + rand() * 40);

    const lat = 29.0 + rand() * 4.5;
    const lon = 71.0 + rand() * 4.5;

    const strikes = cat === 'DEFENSIVE_COUNTER_AIR' ? 0 : 2;
    const escorts = cat === 'DEFENSIVE_COUNTER_AIR' ? 4 : (rand() > 0.4 ? 2 : 1);
    const sead = rand() > 0.5 ? 1 : 0;

    targetRequests.push({
      id: `TGT-${t.toString().padStart(3, '0')}`,
      name: `Tactical Strike Objective ${t} (${cat.replace(/_/g, ' ')})`,
      category: cat,
      location: { lat: Math.round(lat * 100) / 100, lon: Math.round(lon * 100) / 100, altM: 250 },
      priority: prio,
      totStartMinutes: startM,
      totEndMinutes: startM + durM,
      requiredPackage: {
        strikeSorties: strikes,
        seadSorties: sead,
        escortSorties: escorts,
        tankerSorties: rand() > 0.7 ? 1 : 0,
      },
      desiredMunitions: cat === 'DEFENSIVE_COUNTER_AIR' ? ['BVR_AAM'] : ['PRECISION_GUIDED_BOMB'],
      minMunitionsCount: strikes * 2 + escorts * 2,
      isTimeSensitive: false,
      status: 'PENDING',
    });
  }

  return {
    bases,
    aircraft,
    pilots,
    munitionStocks,
    threats,
    airspaceZones,
    targetRequests,
  };
}
