import { z } from 'zod';

// ==========================================
// 1. BASES & AIRFIELDS
// ==========================================
export const GeoCoordSchema = z.object({
  lat: z.number().min(-90).max(90),
  lon: z.number().min(-180).max(180),
  altM: z.number().default(0),
});
export type GeoCoord = z.infer<typeof GeoCoordSchema>;

export const AirbaseSchema = z.object({
  id: z.string(),
  name: z.string(),
  icao: z.string(),
  location: GeoCoordSchema,
  runways: z.number().int().positive(),
  maxSortiePerHour: z.number().int().positive(),
  fuelReserveLitres: z.number().nonnegative(),
  weatherMinimaVisibilityKm: z.number().nonnegative(),
  currentWeatherStatus: z.enum(['VMC', 'IMC', 'CLOSED']), // Visual vs Instrument vs Closed
  sector: z.string(),
});
export type Airbase = z.infer<typeof AirbaseSchema>;

// ==========================================
// 2. AIRCRAFT
// ==========================================
export const AirframeRoleEnum = z.enum([
  'AIR_SUPERIORITY',
  'OMNIROLE_STRIKE',
  'DEEP_PENETRATION_STRIKE',
  'SEAD_DEAD',
  'TANKER',
  'AEW_C',
  'RECCE_ISR',
]);
export type AirframeRole = z.infer<typeof AirframeRoleEnum>;

export const AircraftStatusEnum = z.enum([
  'FMC', // Fully Mission Capable
  'PMC', // Partially Mission Capable
  'AOG', // Aircraft On Ground (Snag / Maintenance)
  'AIRBORNE',
  'TURNAROUND',
]);
export type AircraftStatus = z.infer<typeof AircraftStatusEnum>;

export const AircraftSchema = z.object({
  tailNumber: z.string(),
  model: z.string(), // e.g., 'Su-30MKI Class', 'Rafale Class', 'Tejas Class', 'IL-78 Tanker'
  squadron: z.string(),
  baseId: z.string(),
  roles: z.array(AirframeRoleEnum),
  status: AircraftStatusEnum,
  fuelCapacityKg: z.number().positive(),
  currentFuelKg: z.number().nonnegative(),
  combatRadiusKm: z.number().positive(),
  cruiseSpeedKmh: z.number().positive(),
  hardpoints: z.number().int().positive(),
  turnaroundTimeMinutes: z.number().int().positive(),
  flightHoursTotal: z.number().nonnegative(),
  snagDescription: z.string().optional(),
  turnaroundEta: z.string().optional(), // ISO date string
});
export type Aircraft = z.infer<typeof AircraftSchema>;

// ==========================================
// 3. AIRCREW
// ==========================================
export const PilotQualificationEnum = z.enum([
  'AIR_TO_AIR_BVR',
  'DEEP_PRECISION_STRIKE',
  'SEAD_TACTICS',
  'AIR_REFUEL_QUAL',
  'NIGHT_OPERATIONS',
  'FORMATION_LEAD',
  'MISSION_COMMANDER',
]);
export type PilotQualification = z.infer<typeof PilotQualificationEnum>;

export const AircrewSchema = z.object({
  id: z.string(),
  callsign: z.string(),
  rank: z.string(),
  baseId: z.string(),
  typeRating: z.string(), // matches Aircraft model
  qualifications: z.array(PilotQualificationEnum),
  dutyHoursLast24h: z.number().min(0).max(24),
  fatigueScore: z.number().min(0).max(100), // 0 = fresh, 100 = grounded
  status: z.enum(['READY', 'ON_DUTY', 'REST_MANDATORY', 'FATIGUED']),
  restExpiresAt: z.string().optional(), // ISO
  totalSortiesFlown: z.number().int().nonnegative(),
});
export type Aircrew = z.infer<typeof AircrewSchema>;

// ==========================================
// 4. MUNITIONS & WEAPONS
// ==========================================
export const MunitionCategoryEnum = z.enum([
  'BVR_AAM',           // Beyond Visual Range Air-to-Air
  'WVR_AAM',           // Within Visual Range
  'PRECISION_GUIDED_BOMB',
  'ANTI_RADIATION_MISSILE', // for SEAD
  'STANDOFF_CRUISE_MISSILE',
  'UNGUIDED_BOMB',
]);
export type MunitionCategory = z.infer<typeof MunitionCategoryEnum>;

export const MunitionItemSchema = z.object({
  id: z.string(),
  name: z.string(),
  category: MunitionCategoryEnum,
  rangeKm: z.number().positive(),
  weightKg: z.number().positive(),
  compatibleModels: z.array(z.string()),
  pkEffective: z.number().min(0).max(1), // Probability of kill
});
export type MunitionItem = z.infer<typeof MunitionItemSchema>;

export const MunitionStockSchema = z.object({
  baseId: z.string(),
  munitionId: z.string(),
  quantity: z.number().int().nonnegative(),
});
export type MunitionStock = z.infer<typeof MunitionStockSchema>;

// ==========================================
// 5. THREATS & INTEL
// ==========================================
export const ThreatTypeEnum = z.enum([
  'LONG_RANGE_SAM',   // e.g. S-400 / Patriot Class (250-400km)
  'MEDIUM_RANGE_SAM', // e.g. Buk / HQ-16 Class (40-70km)
  'SHORT_RANGE_SHORAD',
  'EARLY_WARNING_RADAR',
  'EW_JAMMER',
  'HOSTILE_CAP_SWARM',
]);
export type ThreatType = z.infer<typeof ThreatTypeEnum>;

export const ThreatIntelSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: ThreatTypeEnum,
  location: GeoCoordSchema,
  detectionRadiusKm: z.number().positive(),
  engagementRadiusKm: z.number().positive(),
  lethalityScore: z.number().min(0).max(100),
  confidence: z.number().min(0).max(100), // Bayesian decayed confidence
  sourceSystem: z.string(),
  firstDetectedAt: z.string(),
  lastUpdatedAt: z.string(),
  active: z.boolean(),
});
export type ThreatIntel = z.infer<typeof ThreatIntelSchema>;

// ==========================================
// 6. AIRSPACE & ACO
// ==========================================
export const AirspaceZoneTypeEnum = z.enum([
  'CORRIDOR',
  'ROZ', // Restricted Operations Zone
  'MEZ', // Missile Engagement Zone
  'SAFE_LANE',
  'REFUELING_TRACK',
]);
export type AirspaceZoneType = z.infer<typeof AirspaceZoneTypeEnum>;

export const AirspaceZoneSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: AirspaceZoneTypeEnum,
  polygon: z.array(GeoCoordSchema),
  lowerAltitudeFt: z.number().nonnegative(),
  upperAltitudeFt: z.number().positive(),
  activeFromTimeMinutes: z.number().nonnegative(),
  activeToTimeMinutes: z.number().positive(),
  controllingUnit: z.string(),
});
export type AirspaceZone = z.infer<typeof AirspaceZoneSchema>;

// ==========================================
// 7. WEATHER
// ==========================================
export const WeatherReportSchema = z.object({
  baseOrZoneId: z.string(),
  timestamp: z.string(),
  visibilityKm: z.number().nonnegative(),
  cloudCeilingFt: z.number().nonnegative(),
  windSpeedKnots: z.number().nonnegative(),
  windDirectionDeg: z.number().min(0).max(360),
  icingRisk: z.enum(['NONE', 'LIGHT', 'MODERATE', 'SEVERE']),
  turbulenceRisk: z.enum(['NONE', 'LIGHT', 'MODERATE', 'SEVERE']),
  flightCategory: z.enum(['VMC', 'IMC', 'MARGINAL', 'BELOW_MINIMA']),
});
export type WeatherReport = z.infer<typeof WeatherReportSchema>;

// ==========================================
// 8. MISSION & TARGET REQUESTS
// ==========================================
export const TargetCategoryEnum = z.enum([
  'COMMAND_CONTROL_BUNKER',
  'AIRBASE_RUNWAY_INTERDICTION',
  'RADAR_EARLY_WARNING',
  'MUNITIONS_DEPOT',
  'TACTICAL_BRIDGE_CHOKEPOINT',
  'TIME_SENSITIVE_TARGET_CONVOY',
  'DEFENSIVE_COUNTER_AIR',
]);
export type TargetCategory = z.infer<typeof TargetCategoryEnum>;

export const TargetRequestSchema = z.object({
  id: z.string(),
  name: z.string(),
  category: TargetCategoryEnum,
  location: GeoCoordSchema,
  priority: z.number().int().min(1).max(100), // 100 = highest
  totStartMinutes: z.number().nonnegative(), // TOT = Time on target relative to mission clock H+min
  totEndMinutes: z.number().positive(),
  requiredPackage: z.object({
    strikeSorties: z.number().int().positive().default(2),
    seadSorties: z.number().int().nonnegative().default(0),
    escortSorties: z.number().int().nonnegative().default(0),
    tankerSorties: z.number().int().nonnegative().default(0),
  }),
  desiredMunitions: z.array(MunitionCategoryEnum),
  minMunitionsCount: z.number().int().positive(),
  isTimeSensitive: z.boolean().default(false),
  status: z.enum(['PENDING', 'PLANNED', 'AIRBORNE', 'COMPLETED', 'ABORTED']).default('PENDING'),
});
export type TargetRequest = z.infer<typeof TargetRequestSchema>;

// ==========================================
// 9. ATO SORTIE & MISSION PACKAGE
// ==========================================
export const SortieStatusEnum = z.enum([
  'SCHEDULED',
  'TAXIING',
  'AIRBORNE',
  'INGRESS',
  'ON_TARGET',
  'EGRESS',
  'RECOVERED',
  'CANCELLED',
  'DIVERTED',
]);
export type SortieStatus = z.infer<typeof SortieStatusEnum>;

export const SortieSchema = z.object({
  sortieId: z.string(),
  callsign: z.string(),
  packageId: z.string(),
  targetRequestId: z.string(),
  role: AirframeRoleEnum,
  aircraftTail: z.string(),
  pilotId: z.string(),
  originBaseId: z.string(),
  recoveryBaseId: z.string(),
  munitionLoadout: z.array(z.object({
    munitionId: z.string(),
    count: z.number().int().positive(),
  })),
  depTimeMinutes: z.number().nonnegative(),
  totMinutes: z.number().positive(),
  recoveryTimeMinutes: z.number().positive(),
  fuelPlannedKg: z.number().positive(),
  routeWaypoints: z.array(GeoCoordSchema),
  expectedRiskScore: z.number().min(0).max(100),
  status: SortieStatusEnum.default('SCHEDULED'),
  isFrozen: z.boolean().default(false), // Committed or Airborne sorties cannot be mutated arbitrarily
  justificationNotes: z.string().optional(),
});
export type Sortie = z.infer<typeof SortieSchema>;

// ==========================================
// 10. PLAN & COURSE OF ACTION (COA)
// ==========================================
export const PlanCOASchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  doctrineFocus: z.enum(['MAX_EFFECT', 'MIN_RISK', 'BALANCED_RESERVE']),
  sorties: z.array(SortieSchema),
  kpis: z.object({
    coveredTargetsCount: z.number().int().nonnegative(),
    totalTargetsCount: z.number().int().nonnegative(),
    priorityCoveragePercent: z.number().min(0).max(100),
    totalExpectedLossScore: z.number().nonnegative(),
    totalFuelKg: z.number().nonnegative(),
    strategicReserveAircraft: z.number().int().nonnegative(),
    packageIntegrityPercent: z.number().min(0).max(100),
    hardConstraintViolations: z.number().int().default(0),
    solveTimeMs: z.number().nonnegative(),
    solverUsed: z.string(),
  }),
  createdAt: z.string(),
  commanderApproved: z.boolean().default(false),
});
export type PlanCOA = z.infer<typeof PlanCOASchema>;

// ==========================================
// 11. DYNAMIC RETASKING PLAN DIFF
// ==========================================
export const SortieDiffChangeTypeEnum = z.enum([
  'ADDED',
  'CANCELLED',
  'REROUTED',
  'ASSET_SWAPPED',
  'TIMING_SHIFTED',
]);
export type SortieDiffChangeType = z.infer<typeof SortieDiffChangeTypeEnum>;

export const SortieDiffItemSchema = z.object({
  sortieId: z.string(),
  callsign: z.string(),
  changeType: SortieDiffChangeTypeEnum,
  reason: z.string(),
  previousState: SortieSchema.optional(),
  newState: SortieSchema.optional(),
  impactAssessment: z.string(),
});
export type SortieDiffItem = z.infer<typeof SortieDiffItemSchema>;

export const RetaskingDiffReportSchema = z.object({
  id: z.string(),
  triggerEvent: z.string(),
  originalPlanId: z.string(),
  updatedPlanId: z.string(),
  timestamp: z.string(),
  stabilityIndex: z.number().min(0).max(100), // 100 = zero disturbance, lower = heavy shift
  changes: z.array(SortieDiffItemSchema),
  commanderBriefMarkdown: z.string(),
});
export type RetaskingDiffReport = z.infer<typeof RetaskingDiffReportSchema>;

// ==========================================
// 12. SIMULATION & INJECT EVENTS
// ==========================================
export const InjectTypeEnum = z.enum([
  'SAM_POPUP',
  'BASE_WEATHER_CLOSURE',
  'AIRCRAFT_AOG_SNAG',
  'CREW_FATIGUE_TIMEOUT',
  'NEW_HIGH_VALUE_TST',
  'TANKER_DIVERT',
  'DEGRADED_INTEL_STREAM',
]);
export type InjectType = z.infer<typeof InjectTypeEnum>;

export const TacticalInjectSchema = z.object({
  id: z.string(),
  type: InjectTypeEnum,
  simTimeMinutes: z.number(),
  title: z.string(),
  description: z.string(),
  payload: z.record(z.any()),
  acknowledged: z.boolean().default(false),
});
export type TacticalInject = z.infer<typeof TacticalInjectSchema>;

// ==========================================
// 13. FUSED PICTURE & COP HEALTH
// ==========================================
export interface FeedHealthStatus {
  feedId: string;
  systemOrigin: string;
  lastSyncIso: string;
  status: 'ONLINE' | 'DEGRADED' | 'DISCONNECTED';
  latencyMs: number;
  confidenceScore: number;
  totalRecordsProcessed: number;
}

export interface FusedOperationalPicture {
  timestampIso: string;
  simTimeMinutes: number;
  overallConfidenceScore: number;
  activeConflictsCount: number;
  bases: Airbase[];
  aircraft: Aircraft[];
  pilots: Aircrew[];
  munitionStocks: MunitionStock[];
  threats: ThreatIntel[];
  airspaceZones: AirspaceZone[];
  targetRequests: TargetRequest[];
  weatherReports: WeatherReport[];
  feedHealth: FeedHealthStatus[];
}
