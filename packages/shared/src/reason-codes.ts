/**
 * Operational Reason Codes Catalogue
 * 
 * Stable reason codes and plain-English explanations for every assignment,
 * constraint rejection, retasking diff, and COA trade-off.
 * Integrated across Planner, Retasker, Copilot, Audit Ledger, and AAR.
 */

export type ReasonCategory =
  | 'ASSIGNMENT'     // Successful sortie allocation
  | 'REJECTION'      // Infeasible constraint rejection
  | 'RETASKING'      // Dynamic contingency diff
  | 'COA_DELTA'      // Strategic Course of Action divergence
  | 'SAFETY';        // Guardrail or doctrine policy filter

export interface ReasonCodeEntry {
  code: string;
  category: ReasonCategory;
  title: string;
  plainEnglish: string;
  doctrineRule: string;
  badgeColor: {
    bg: string;
    text: string;
    border: string;
  };
}

export const REASON_CODES: Record<string, ReasonCodeEntry> = {
  // --- 1. REJECTIONS & INFEASIBILITY CONSTRAINTS ---
  CREW_FATIGUE_LIMIT: {
    code: 'CREW_FATIGUE_LIMIT',
    category: 'REJECTION',
    title: 'Crew Fatigue Limit Exceeded',
    plainEnglish: 'Aircrew exceeded mandatory duty hours; minimum 8-hour consecutive crew rest enforced.',
    doctrineRule: 'DSSC Doctrine Kernel 03: Max 8 combat flight hours in rolling 24-hour window.',
    badgeColor: { bg: 'bg-rose-50', text: 'text-rose-800', border: 'border-rose-300' },
  },
  RANGE_EXCEEDS_RADIUS: {
    code: 'RANGE_EXCEEDS_RADIUS',
    category: 'REJECTION',
    title: 'Mission Radius Exceeds Combat Range',
    plainEnglish: 'Target distance exceeds airframe unrefueled combat radius without designated tanker offload.',
    doctrineRule: 'Fuel Safety Buffer: Mission distance > 2x Combat Radius + 15% reserve.',
    badgeColor: { bg: 'bg-rose-50', text: 'text-rose-800', border: 'border-rose-300' },
  },
  MEZ_ROUTE_DENIED: {
    code: 'MEZ_ROUTE_DENIED',
    category: 'REJECTION',
    title: 'Hostile MEZ Ingress Prohibited',
    plainEnglish: 'Flight corridor penetrates hostile SAM lethal envelope without dedicated DEAD/SEAD escort.',
    doctrineRule: 'IAF Air Defense Avoidance: Stand-off weapon release or hard 15km radar exclusion.',
    badgeColor: { bg: 'bg-rose-50', text: 'text-rose-800', border: 'border-rose-300' },
  },
  MUNITION_INCOMPATIBLE: {
    code: 'MUNITION_INCOMPATIBLE',
    category: 'REJECTION',
    title: 'Munition Pylon Incompatibility',
    plainEnglish: 'Target requires heavy penetrator or standoff weapon not compatible with airframe hardpoints.',
    doctrineRule: 'Weapon Loading Table: Airframe station weight and bus protocol compatibility.',
    badgeColor: { bg: 'bg-rose-50', text: 'text-rose-800', border: 'border-rose-300' },
  },
  MAGAZINE_STOCK_EXHAUSTED: {
    code: 'MAGAZINE_STOCK_EXHAUSTED',
    category: 'REJECTION',
    title: 'Base Munition Depleted',
    plainEnglish: 'Requested precision guided munition stock exhausted at departure airbase magazine.',
    doctrineRule: 'Logistics Magazine Limits: Non-zero physical depot stock required before taxi.',
    badgeColor: { bg: 'bg-rose-50', text: 'text-rose-800', border: 'border-rose-300' },
  },
  TURNAROUND_SLOT_UNAVAILABLE: {
    code: 'TURNAROUND_SLOT_UNAVAILABLE',
    category: 'REJECTION',
    title: 'Turnaround Window Bottleneck',
    plainEnglish: 'Airbase maintenance bays fully committed; minimum 45-60 min turnaround window unachievable.',
    doctrineRule: 'Sortie Generation Rate (SGR): Sequential runway and refuel turnaround spacing.',
    badgeColor: { bg: 'bg-rose-50', text: 'text-rose-800', border: 'border-rose-300' },
  },
  RUNWAY_WEATHER_MINIMA: {
    code: 'RUNWAY_WEATHER_MINIMA',
    category: 'REJECTION',
    title: 'Aerodrome Weather Minima Closure',
    plainEnglish: 'Cloud ceiling or surface crosswinds exceed aircraft safe departure/recovery flight limits.',
    doctrineRule: 'Instrument Flight Rules (IFR): Airfield closed to non-all-weather recoveries.',
    badgeColor: { bg: 'bg-rose-50', text: 'text-rose-800', border: 'border-rose-300' },
  },
  RUNWAY_INTERDICTED: {
    code: 'RUNWAY_INTERDICTED',
    category: 'REJECTION',
    title: 'Runway Denied by Hostile Interdiction',
    plainEnglish: 'Airbase runway damaged or cratered; flight operations suspended pending civil repair.',
    doctrineRule: 'Base Survivability: Zero departures permitted during red alert or unexploded ordnance clearing.',
    badgeColor: { bg: 'bg-rose-50', text: 'text-rose-800', border: 'border-rose-300' },
  },
  AIRFRAME_UNSERVICEABLE: {
    code: 'AIRFRAME_UNSERVICEABLE',
    category: 'REJECTION',
    title: 'Airframe Technical Snag (AOG)',
    plainEnglish: 'Aircraft grounded due to unscheduled avionics snag or scheduled phase inspection.',
    doctrineRule: 'Airworthiness Directive: Aircraft On Ground (AOG) status locks airframe from flight.',
    badgeColor: { bg: 'bg-rose-50', text: 'text-rose-800', border: 'border-rose-300' },
  },
  DECONFLICTION_CORRIDOR_BLOCKED: {
    code: 'DECONFLICTION_CORRIDOR_BLOCKED',
    category: 'REJECTION',
    title: '4D Airspace Separation Conflict',
    plainEnglish: 'Flight corridor occupied; minimum 3-minute temporal buffer or 5,000ft altitude separation violated.',
    doctrineRule: 'Airspace Control Order (ACO): 4D spatial-temporal corridor deconfliction.',
    badgeColor: { bg: 'bg-rose-50', text: 'text-rose-800', border: 'border-rose-300' },
  },
  TIME_WINDOW_MISMATCH: {
    code: 'TIME_WINDOW_MISMATCH',
    category: 'REJECTION',
    title: 'Time-on-Target Window Infeasible',
    plainEnglish: 'Departure time, cruise flight envelope, and TOT window cannot be synchronized within target tolerance.',
    doctrineRule: 'Temporal Synchronization: Sortie must arrive within designated Time-on-Target (TOT) bracket.',
    badgeColor: { bg: 'bg-rose-50', text: 'text-rose-800', border: 'border-rose-300' },
  },

  // --- 2. POSITIVE ASSIGNMENTS ---
  PRIMARY_STRIKE_MATCH: {
    code: 'PRIMARY_STRIKE_MATCH',
    category: 'ASSIGNMENT',
    title: 'Optimal Multirole Target Match',
    plainEnglish: 'Airframe speed, pylon loadout, and range provide superior objective score on target.',
    doctrineRule: 'Objective Function: Maximum expected target destruction per combat sortie.',
    badgeColor: { bg: 'bg-emerald-50', text: 'text-emerald-800', border: 'border-emerald-300' },
  },
  FAST_QRA_SCRAMBLE: {
    code: 'FAST_QRA_SCRAMBLE',
    category: 'ASSIGNMENT',
    title: 'Quick Reaction Alert Intercept',
    plainEnglish: 'Forward airbase hot-pad airframe committed to achieve earliest interception timeline.',
    doctrineRule: 'Air Defense Doctrine: Priority intercept within 5-minute scramble readiness.',
    badgeColor: { bg: 'bg-emerald-50', text: 'text-emerald-800', border: 'border-emerald-300' },
  },
  SEAD_ESCORT_SYNCHRONIZED: {
    code: 'SEAD_ESCORT_SYNCHRONIZED',
    category: 'ASSIGNMENT',
    title: 'Synchronized Suppression Escort',
    plainEnglish: 'Package includes dedicated electronic warfare/anti-radiation aircraft neutralizing SAM envelope.',
    doctrineRule: 'Package Integration: Joint strike-SEAD ingress timing deconfliction.',
    badgeColor: { bg: 'bg-emerald-50', text: 'text-emerald-800', border: 'border-emerald-300' },
  },
  RESERVE_PRESERVED: {
    code: 'RESERVE_PRESERVED',
    category: 'ASSIGNMENT',
    title: 'Strategic Fleet Reserve Held',
    plainEnglish: 'Airframe preserved in standby reserve for fleeting pop-up targets and theater defense.',
    doctrineRule: 'Balanced Reserve Doctrine: Retain 20-25% uncommitted fleet depth.',
    badgeColor: { bg: 'bg-sky-50', text: 'text-sky-800', border: 'border-sky-300' },
  },
  MIN_RISK_TERRAIN_MASK: {
    code: 'MIN_RISK_TERRAIN_MASK',
    category: 'ASSIGNMENT',
    title: 'Terrain-Masked Ingress Allocated',
    plainEnglish: 'Low-level ingress route chosen through valley defilade, reducing radar line-of-sight exposure.',
    doctrineRule: 'Force Preservation: Minimize attrition probability under contested radar coverage.',
    badgeColor: { bg: 'bg-emerald-50', text: 'text-emerald-800', border: 'border-emerald-300' },
  },

  // --- 3. RETASKING & DISRUPTION DIFFS ---
  POPUP_THREAT_DIVERT: {
    code: 'POPUP_THREAT_DIVERT',
    category: 'RETASKING',
    title: 'Rerouted Around Pop-Up SAM',
    plainEnglish: 'Transit waypoints shifted 35 km south to skirt newly detected mobile SAM threat envelope.',
    doctrineRule: 'Dynamic Retasking: Real-time threat avoidance with minimal TOT disruption.',
    badgeColor: { bg: 'bg-amber-50', text: 'text-amber-800', border: 'border-amber-300' },
  },
  AIRFRAME_AOG_SWAP: {
    code: 'AIRFRAME_AOG_SWAP',
    category: 'RETASKING',
    title: 'In-Place Spare Airframe Swap',
    plainEnglish: 'Mechanically snagged airframe replaced with warm spare from the same squadron alert hangar.',
    doctrineRule: 'Operational Stability: Zero-hamming substitution preserving original flight plan timing.',
    badgeColor: { bg: 'bg-amber-50', text: 'text-amber-800', border: 'border-amber-300' },
  },
  TST_HIGH_PRIORITY_TASK: {
    code: 'TST_HIGH_PRIORITY_TASK',
    category: 'RETASKING',
    title: 'Diverted to Time-Sensitive Target',
    plainEnglish: 'Airborne package retasked to strike critical fleeting target identified by real-time intelligence.',
    doctrineRule: 'Targeting Priority: Fleeting C4I targets override scheduled secondary strike sorties.',
    badgeColor: { bg: 'bg-purple-50', text: 'text-purple-800', border: 'border-purple-300' },
  },
  WEATHER_DIVERT_RECOVERY: {
    code: 'WEATHER_DIVERT_RECOVERY',
    category: 'RETASKING',
    title: 'Recovery Diverted to Alternate Base',
    plainEnglish: 'Primary airbase fogged in; recovery routed to designated alternate aerodrome with safe minima.',
    doctrineRule: 'Flight Safety Directive: Minimum 45-min diversion fuel reserved for weather alternate.',
    badgeColor: { bg: 'bg-amber-50', text: 'text-amber-800', border: 'border-amber-300' },
  },
  FROZEN_ZONE_LOCKED: {
    code: 'FROZEN_ZONE_LOCKED',
    category: 'RETASKING',
    title: 'Committed Inside Frozen Zone',
    plainEnglish: 'Sortie within 15 minutes of Time-on-Target; locked against automatic disruption to preserve package.',
    doctrineRule: 'Frozen-Zone Invariant: Delta-T <= 15 min sorties require explicit commander override token.',
    badgeColor: { bg: 'bg-indigo-50', text: 'text-indigo-800', border: 'border-indigo-300' },
  },

  // --- 4. SAFETY & COPILOT GUARDRAILS ---
  COMMANDER_AUTHORIZED: {
    code: 'COMMANDER_AUTHORIZED',
    category: 'SAFETY',
    title: 'Commander Approval Token Verified',
    plainEnglish: 'Operational state mutation authorized with verified commander authentication token.',
    doctrineRule: 'Human-in-the-Loop: Strict non-repudiation in cryptographic decision ledger.',
    badgeColor: { bg: 'bg-emerald-50', text: 'text-emerald-800', border: 'border-emerald-300' },
  },
  SAFETY_POLICY_REJECTED: {
    code: 'SAFETY_POLICY_REJECTED',
    category: 'SAFETY',
    title: 'Safety Guardrail Intervention',
    plainEnglish: 'Command rejected: contains unauthorized kinetic engagement request or lacks commander credentials.',
    doctrineRule: 'Ethical Defense Guardrails: Advisory-only architecture prohibits autonomous fire commands.',
    badgeColor: { bg: 'bg-rose-50', text: 'text-rose-800', border: 'border-rose-300' },
  },
  AMBIGUOUS_FLIGHT_SPEC: {
    code: 'AMBIGUOUS_FLIGHT_SPEC',
    category: 'SAFETY',
    title: 'Ambiguous Flight Intent',
    plainEnglish: 'Command lacks specific flight callsign, base code, or target identifier; clarification requested.',
    doctrineRule: 'Advisory Clarification: Ambiguous instructions must not execute without disambiguation.',
    badgeColor: { bg: 'bg-amber-50', text: 'text-amber-800', border: 'border-amber-300' },
  },
};

/**
 * Maps constraint violation message or rejection string to exact stable reason code
 */
export function mapViolationToReasonCode(violation: string): string {
  const v = violation.toLowerCase();
  if (v.includes('aog') || v.includes('unserviceable') || v.includes('grounded') || v.includes('does not exist')) {
    return 'AIRFRAME_UNSERVICEABLE';
  }
  if (v.includes('turnaround') || v.includes('capacity') || v.includes('consecutive')) {
    return 'TURNAROUND_SLOT_UNAVAILABLE';
  }
  if (v.includes('pilot') || v.includes('duty') || v.includes('fatigue') || v.includes('rest') || v.includes('rating')) {
    return 'CREW_FATIGUE_LIMIT';
  }
  if (v.includes('weather') || v.includes('closed') || v.includes('minima')) {
    return 'RUNWAY_WEATHER_MINIMA';
  }
  if (v.includes('cratered') || v.includes('interdicted') || v.includes('damaged')) {
    return 'RUNWAY_INTERDICTED';
  }
  if (v.includes('radius') || v.includes('range') || v.includes('fuel') || v.includes('distance')) {
    return 'RANGE_EXCEEDS_RADIUS';
  }
  if (v.includes('stock') || v.includes('magazine') || v.includes('depleted') || v.includes('exhausted')) {
    return 'MAGAZINE_STOCK_EXHAUSTED';
  }
  if (v.includes('munition') || v.includes('pylon') || v.includes('weapon') || v.includes('incompatible')) {
    return 'MUNITION_INCOMPATIBLE';
  }
  if (v.includes('mez') || v.includes('sam') || v.includes('threat') || v.includes('radar')) {
    return 'MEZ_ROUTE_DENIED';
  }
  if (v.includes('tot') || v.includes('timing') || v.includes('window') || v.includes('departure')) {
    return 'TIME_WINDOW_MISMATCH';
  }
  if (v.includes('deconfliction') || v.includes('corridor') || v.includes('separation')) {
    return 'DECONFLICTION_CORRIDOR_BLOCKED';
  }
  return 'UNCLASSIFIED_CONSTRAINT';
}

/**
 * Lookup reason code entry with safe fallback
 */
export function getReasonCode(code?: string | null): ReasonCodeEntry {
  if (code && REASON_CODES[code]) {
    return REASON_CODES[code];
  }
  return {
    code: code || 'UNCLASSIFIED_CONSTRAINT',
    category: 'REJECTION',
    title: code ? code.replace(/_/g, ' ') : 'Operational Constraint',
    plainEnglish: 'Action governed by physical airpower constraints or commander doctrine guidelines.',
    doctrineRule: 'Defense Operations Research Standard Envelope.',
    badgeColor: { bg: 'bg-slate-100', text: 'text-slate-800', border: 'border-slate-300' },
  };
}
