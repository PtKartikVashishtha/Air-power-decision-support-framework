import {
  Aircraft,
  Aircrew,
  ThreatIntel,
  WeatherReport,
  TargetRequest,
  AirspaceZone,
  MunitionStock,
} from '@air-power/shared';

export interface RawFeedUpdate<T> {
  feedId: string;
  timestamp: string;
  systemOrigin: string;
  confidenceScore: number;
  payload: T;
}

export class MaintenanceSystemAdapter {
  private updateCount = 0;

  pollAircraftState(aircraft: Aircraft[]): RawFeedUpdate<Aircraft[]> {
    this.updateCount++;
    return {
      feedId: 'FEED_MAINT_AFEMS_V1',
      timestamp: new Date().toISOString(),
      systemOrigin: 'AIR_FORCE_ENGINEERING_MAINT_SYSTEM',
      confidenceScore: 98,
      payload: aircraft,
    };
  }
}

export class CrewRosterSystemAdapter {
  pollRoster(pilots: Aircrew[]): RawFeedUpdate<Aircrew[]> {
    return {
      feedId: 'FEED_CREW_ROSTER_HR',
      timestamp: new Date().toISOString(),
      systemOrigin: 'AIR_CREW_DUTY_ROSTER_PORTAL',
      confidenceScore: 95,
      payload: pilots,
    };
  }
}

export class ArmamentStoresAdapter {
  pollMunitions(stocks: MunitionStock[]): RawFeedUpdate<MunitionStock[]> {
    return {
      feedId: 'FEED_ARMAMENT_AMMOLOG',
      timestamp: new Date().toISOString(),
      systemOrigin: 'CENTRAL_MUNITIONS_DEPOT_TRACKER',
      confidenceScore: 99,
      payload: stocks,
    };
  }
}

export class AirspaceControlAdapter {
  pollAirspace(zones: AirspaceZone[]): RawFeedUpdate<AirspaceZone[]> {
    return {
      feedId: 'FEED_AIRSPACE_ATC_ACO',
      timestamp: new Date().toISOString(),
      systemOrigin: 'JOINT_AIR_TRAFFIC_MANAGEMENT_NODE',
      confidenceScore: 97,
      payload: zones,
    };
  }
}

export class WeatherSystemAdapter {
  pollWeather(reports: WeatherReport[]): RawFeedUpdate<WeatherReport[]> {
    return {
      feedId: 'FEED_METEOROLOGY_METAR',
      timestamp: new Date().toISOString(),
      systemOrigin: 'MILITARY_WEATHER_RADAR_AND_SATELLITE',
      confidenceScore: 92,
      payload: reports,
    };
  }
}

export class IntelThreatAdapter {
  pollThreats(threats: ThreatIntel[]): RawFeedUpdate<ThreatIntel[]> {
    return {
      feedId: 'FEED_INTEL_ELINT_RADAR',
      timestamp: new Date().toISOString(),
      systemOrigin: 'DEFENCE_INTELLIGENCE_AGENCY_FUSION_NODE',
      confidenceScore: 91,
      payload: threats,
    };
  }
}

export class MissionPriorityAdapter {
  pollTargetRequests(targets: TargetRequest[]): RawFeedUpdate<TargetRequest[]> {
    return {
      feedId: 'FEED_TARGET_DECK_CAOC',
      timestamp: new Date().toISOString(),
      systemOrigin: 'AIR_OPERATIONS_COMMAND_INTENT_BOARD',
      confidenceScore: 100,
      payload: targets,
    };
  }
}
