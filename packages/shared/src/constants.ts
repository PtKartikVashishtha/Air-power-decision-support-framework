import { Airbase, MunitionItem } from './schemas';

export const NOTIONAL_BANNER_TEXT = 'CLASSIFICATION: NOTIONAL / TRAINING DATA ONLY — UNCLASSIFIED SIMULATION';

export interface AircraftModelSpec {
  model: string;
  classCategory: string;
  combatRadiusKm: number;
  cruiseSpeedKmh: number;
  fuelCapacityKg: number;
  burnRateKgPerKm: number;
  hardpoints: number;
  turnaroundTimeMinutes: number;
  roles: Array<
    | 'AIR_SUPERIORITY'
    | 'OMNIROLE_STRIKE'
    | 'DEEP_PENETRATION_STRIKE'
    | 'SEAD_DEAD'
    | 'TANKER'
    | 'AEW_C'
    | 'RECCE_ISR'
  >;
  description: string;
}

export const AIRCRAFT_MODEL_SPECS: Record<string, AircraftModelSpec> = {
  'SU30_CLASS': {
    model: 'Su-30MKI Class',
    classCategory: 'Heavy Twin-Engine Air Dominance',
    combatRadiusKm: 1500,
    cruiseSpeedKmh: 950,
    fuelCapacityKg: 9400,
    burnRateKgPerKm: 3.2,
    hardpoints: 12,
    turnaroundTimeMinutes: 45,
    roles: ['AIR_SUPERIORITY', 'OMNIROLE_STRIKE', 'DEEP_PENETRATION_STRIKE', 'SEAD_DEAD'],
    description: 'Long-range air dominance and heavy strike platform with thrust-vectoring agility.',
  },
  'RAFALE_CLASS': {
    model: 'Rafale Class',
    classCategory: 'Omnirole Medium Fighter',
    combatRadiusKm: 1650,
    cruiseSpeedKmh: 1000,
    fuelCapacityKg: 6800,
    burnRateKgPerKm: 2.3,
    hardpoints: 14,
    turnaroundTimeMinutes: 35,
    roles: ['OMNIROLE_STRIKE', 'DEEP_PENETRATION_STRIKE', 'AIR_SUPERIORITY', 'SEAD_DEAD', 'RECCE_ISR'],
    description: 'High-survivability omnirole fighter equipped with SPECTRA EW suite and standoff precision.',
  },
  'TEJAS_CLASS': {
    model: 'Tejas Class',
    classCategory: 'Light Combat Fighter',
    combatRadiusKm: 550,
    cruiseSpeedKmh: 850,
    fuelCapacityKg: 2500,
    burnRateKgPerKm: 1.6,
    hardpoints: 8,
    turnaroundTimeMinutes: 30,
    roles: ['AIR_SUPERIORITY', 'OMNIROLE_STRIKE', 'SEAD_DEAD'],
    description: 'Agile lightweight frontline multirole fighter for point defense and short-range strike.',
  },
  'MIRAGE_CLASS': {
    model: 'Mirage Class',
    classCategory: 'Precision Strike Interceptor',
    combatRadiusKm: 900,
    cruiseSpeedKmh: 900,
    fuelCapacityKg: 3800,
    burnRateKgPerKm: 2.1,
    hardpoints: 9,
    turnaroundTimeMinutes: 40,
    roles: ['DEEP_PENETRATION_STRIKE', 'OMNIROLE_STRIKE'],
    description: 'Specialized high-accuracy precision strike and laser-guided interdiction aircraft.',
  },
  'IL78_TANKER': {
    model: 'IL-78 Tanker Class',
    classCategory: 'Air-to-Air Refueling',
    combatRadiusKm: 2400,
    cruiseSpeedKmh: 750,
    fuelCapacityKg: 45000,
    burnRateKgPerKm: 7.5,
    hardpoints: 3,
    turnaroundTimeMinutes: 90,
    roles: ['TANKER'],
    description: 'Multi-point aerial refueling tanker extending package operational reach.',
  },
  'NETRA_AEWC': {
    model: 'Netra AEW&C Class',
    classCategory: 'Airborne Early Warning & Battle Mgmt',
    combatRadiusKm: 1800,
    cruiseSpeedKmh: 720,
    fuelCapacityKg: 12000,
    burnRateKgPerKm: 4.0,
    hardpoints: 0,
    turnaroundTimeMinutes: 75,
    roles: ['AEW_C'],
    description: 'Airborne early warning, surveillance, and real-time package coordination node.',
  },
};

export const MUNITION_CATALOG: MunitionItem[] = [
  {
    id: 'MUN_ASTRA_BVR',
    name: 'Astra-Class BVR AAM',
    category: 'BVR_AAM',
    rangeKm: 110,
    weightKg: 154,
    compatibleModels: ['Su-30MKI Class', 'Rafale Class', 'Tejas Class', 'Mirage Class'],
    pkEffective: 0.88,
  },
  {
    id: 'MUN_METEOR_BVR',
    name: 'Meteor-Class Ramjet BVR',
    category: 'BVR_AAM',
    rangeKm: 150,
    weightKg: 190,
    compatibleModels: ['Rafale Class'],
    pkEffective: 0.94,
  },
  {
    id: 'MUN_SCALP_CRUISE',
    name: 'SCALP / Standoff Cruise',
    category: 'STANDOFF_CRUISE_MISSILE',
    rangeKm: 300,
    weightKg: 1300,
    compatibleModels: ['Rafale Class', 'Su-30MKI Class'],
    pkEffective: 0.96,
  },
  {
    id: 'MUN_SPICE2000',
    name: 'Spice-2000 Autonomous PGM',
    category: 'PRECISION_GUIDED_BOMB',
    rangeKm: 60,
    weightKg: 950,
    compatibleModels: ['Su-30MKI Class', 'Mirage Class', 'Rafale Class'],
    pkEffective: 0.92,
  },
  {
    id: 'MUN_RUDRAM_SEAD',
    name: 'Rudram-Class Anti-Radiation',
    category: 'ANTI_RADIATION_MISSILE',
    rangeKm: 120,
    weightKg: 600,
    compatibleModels: ['Su-30MKI Class', 'Mirage Class', 'Rafale Class', 'Tejas Class'],
    pkEffective: 0.89,
  },
  {
    id: 'MUN_SDB_GLIDE',
    name: 'Smart Anti-Airfield Weapon',
    category: 'PRECISION_GUIDED_BOMB',
    rangeKm: 100,
    weightKg: 125,
    compatibleModels: ['Su-30MKI Class', 'Rafale Class', 'Tejas Class'],
    pkEffective: 0.86,
  },
];

export const INITIAL_AIRBASES: Airbase[] = [
  {
    id: 'BASE_AMBALA',
    name: 'Forward Base Ambala',
    icao: 'VIAM',
    location: { lat: 30.368, lon: 76.817, altM: 272 },
    runways: 2,
    maxSortiePerHour: 14,
    fuelReserveLitres: 480000,
    weatherMinimaVisibilityKm: 1.5,
    currentWeatherStatus: 'VMC',
    sector: 'SECTOR_NORTH',
  },
  {
    id: 'BASE_BAREILLY',
    name: 'Tactical Base Bareilly',
    icao: 'VIBY',
    location: { lat: 28.422, lon: 79.450, altM: 172 },
    runways: 2,
    maxSortiePerHour: 12,
    fuelReserveLitres: 420000,
    weatherMinimaVisibilityKm: 1.8,
    currentWeatherStatus: 'VMC',
    sector: 'SECTOR_CENTRAL',
  },
  {
    id: 'BASE_HALWARA',
    name: 'Frontline Base Halwara',
    icao: 'VIHX',
    location: { lat: 30.749, lon: 75.633, altM: 240 },
    runways: 2,
    maxSortiePerHour: 10,
    fuelReserveLitres: 360000,
    weatherMinimaVisibilityKm: 2.0,
    currentWeatherStatus: 'VMC',
    sector: 'SECTOR_NORTH',
  },
  {
    id: 'BASE_JODHPUR',
    name: 'Desert Base Jodhpur',
    icao: 'VIJO',
    location: { lat: 26.251, lon: 73.048, altM: 219 },
    runways: 2,
    maxSortiePerHour: 12,
    fuelReserveLitres: 450000,
    weatherMinimaVisibilityKm: 1.2,
    currentWeatherStatus: 'VMC',
    sector: 'SECTOR_WEST',
  },
  {
    id: 'BASE_ADAMPUR',
    name: 'Forward Base Adampur',
    icao: 'VIAX',
    location: { lat: 31.433, lon: 75.758, altM: 233 },
    runways: 1,
    maxSortiePerHour: 8,
    fuelReserveLitres: 310000,
    weatherMinimaVisibilityKm: 2.0,
    currentWeatherStatus: 'VMC',
    sector: 'SECTOR_NORTH',
  },
  {
    id: 'BASE_GWALIOR',
    name: 'Strategic Base Gwalior',
    icao: 'VIGR',
    location: { lat: 26.293, lon: 78.228, altM: 188 },
    runways: 2,
    maxSortiePerHour: 16,
    fuelReserveLitres: 620000,
    weatherMinimaVisibilityKm: 1.5,
    currentWeatherStatus: 'VMC',
    sector: 'SECTOR_CENTRAL',
  },
];
