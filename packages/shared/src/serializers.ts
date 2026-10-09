import { PlanCOA, Sortie, Airbase, AirspaceZone } from './schemas';

export function formatMilitaryTime(minutesFromZero: number): string {
  const hours = Math.floor(minutesFromZero / 60) % 24;
  const mins = Math.floor(minutesFromZero % 60);
  return `${hours.toString().padStart(2, '0')}${mins.toString().padStart(2, '0')}Z`;
}

/**
 * Generates an authentic USMTF / Military-style Air Tasking Order text
 */
export function generateAtoMilitaryText(plan: PlanCOA, bases: Airbase[]): string {
  const baseMap = new Map(bases.map((b) => [b.id, b]));
  const lines: string[] = [];

  lines.push('OPERATIONAL IMMEDIATE // EXERCISE NOTIONAL');
  lines.push('MSGID/ATOTEXT/JFAC-NORTH/001/OCT//');
  lines.push(`PERID/090600Z/TO/100600Z/ASOF: ${new Date().toISOString()}//`);
  lines.push(`EXER/VAYU-SHAKTI-2026/NOTIONAL TRAINING SCENARIO//`);
  lines.push(`PLANID/${plan.id}/${plan.name.toUpperCase()}/${plan.doctrineFocus}//`);
  lines.push('----------------------------------------------------------------------');
  lines.push('TASKUNIT / MISSION DATA / SORTIE PACKAGES');
  lines.push('----------------------------------------------------------------------');

  // Group by Package
  const packages = new Map<string, Sortie[]>();
  for (const s of plan.sorties) {
    const list = packages.get(s.packageId) || [];
    list.push(s);
    packages.set(s.packageId, list);
  }

  for (const [pkgId, sorties] of packages.entries()) {
    lines.push(`\nPKGID/${pkgId}/TOT_${formatMilitaryTime(sorties[0].totMinutes)}//`);
    for (const s of sorties) {
      const orig = baseMap.get(s.originBaseId)?.icao || s.originBaseId;
      const rec = baseMap.get(s.recoveryBaseId)?.icao || s.recoveryBaseId;
      const depTime = formatMilitaryTime(s.depTimeMinutes);
      const totTime = formatMilitaryTime(s.totMinutes);
      const recTime = formatMilitaryTime(s.recoveryTimeMinutes);

      const munSummary = s.munitionLoadout
        .map((m) => `${m.munitionId}x${m.count}`)
        .join(',');

      lines.push(
        `SORTIE/${s.sortieId}/MSN_${s.targetRequestId}/${s.callsign}/${s.aircraftTail}/${s.role}` +
        `/${orig}/${depTime}/TOT:${totTime}/${rec}/${recTime}/WEAPON:[${munSummary || 'CLEAN'}]` +
        `/RISK:${s.expectedRiskScore}`
      );
    }
  }

  lines.push('\n----------------------------------------------------------------------');
  lines.push(`KPI SUMMARY: COVERED ${plan.kpis.coveredTargetsCount}/${plan.kpis.totalTargetsCount} TARGETS | ` +
    `VALUE COVERAGE: ${plan.kpis.priorityCoveragePercent.toFixed(1)}% | ` +
    `FUEL: ${Math.round(plan.kpis.totalFuelKg / 1000)} TONS | SOLVE TIME: ${plan.kpis.solveTimeMs}ms`);
  lines.push('NNNN');

  return lines.join('\n');
}

/**
 * Generates an authentic Airspace Control Order (ACO) text document
 */
export function generateAcoMilitaryText(zones: AirspaceZone[]): string {
  const lines: string[] = [];
  lines.push('OPERATIONAL IMMEDIATE // EXERCISE NOTIONAL');
  lines.push('MSGID/ACOTEXT/JFACC-CAOC/ACO-042/OCT//');
  lines.push('ACO_NAME/OPERATION VAYU-SHIELD ACO-BRAVO//');
  lines.push('----------------------------------------------------------------------');
  lines.push('AIRSPACE CONTROL ORDER // CORRIDORS, ROZ & MEZ');
  lines.push('----------------------------------------------------------------------');

  for (const z of zones) {
    const polyCoords = z.polygon.map((p) => `${p.lat.toFixed(3)}N ${p.lon.toFixed(3)}E`).join(' - ');
    lines.push(
      `ZONE/${z.id}/${z.type}/${z.name}/ALT:${z.lowerAltitudeFt}-${z.upperAltitudeFt}FT/` +
      `ACTIVE:${formatMilitaryTime(z.activeFromTimeMinutes)}-${formatMilitaryTime(z.activeToTimeMinutes)}/` +
      `CTRL:${z.controllingUnit}\n  BOUNDS: ${polyCoords}//`
    );
  }

  lines.push('\nNNNN');
  return lines.join('\n');
}

/**
 * Generates an individual Pilot Sortie Briefing Card
 */
export function generateSortieBriefCard(sortie: Sortie, plan: PlanCOA, bases: Airbase[]): string {
  const baseMap = new Map(bases.map((b) => [b.id, b]));
  const orig = baseMap.get(sortie.originBaseId);
  const rec = baseMap.get(sortie.recoveryBaseId);

  return `
======================================================================
TACTICAL AIR SORTIE BRIEF CARD // ${sortie.callsign} (${sortie.sortieId})
PLAN: ${plan.name} [${plan.doctrineFocus}]
======================================================================
CALLSIGN      : ${sortie.callsign}
ROLE          : ${sortie.role}
AIRCRAFT TAIL : ${sortie.aircraftTail}
ASSIGNED PILOT: ${sortie.pilotId}
PACKAGE ID    : ${sortie.packageId}
TARGET REF    : ${sortie.targetRequestId}

FLIGHT TIMELINE:
- ENGINE START / TAXI : ${formatMilitaryTime(Math.max(0, sortie.depTimeMinutes - 20))}
- WHEELS UP (DEP)     : ${formatMilitaryTime(sortie.depTimeMinutes)} from ${orig?.name || sortie.originBaseId} (${orig?.icao})
- TIME ON TARGET (TOT): ${formatMilitaryTime(sortie.totMinutes)}
- RECOVERY TOUCHDOWN  : ${formatMilitaryTime(sortie.recoveryTimeMinutes)} at ${rec?.name || sortie.recoveryBaseId} (${rec?.icao})

MUNITION PAYLOAD:
${sortie.munitionLoadout.map((m) => `  * ${m.munitionId} (Qty: ${m.count})`).join('\n') || '  * None (Clean Config)'}

FUEL & RISK PARAMETERS:
- PLANNED FUEL BURN   : ${sortie.fuelPlannedKg} kg
- EXPECTED THREAT RISK: ${sortie.expectedRiskScore} / 100
- FROZEN ZONE STATUS  : ${sortie.isFrozen ? 'LOCKED / COMMITTED' : 'FLEXIBLE'}
${sortie.justificationNotes ? `\nOPERATIONAL JUSTIFICATION:\n${sortie.justificationNotes}` : ''}
======================================================================
`;
}
