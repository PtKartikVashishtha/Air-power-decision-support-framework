'use client';

import React, { useState } from 'react';
import { FusedOperationalPicture } from '@air-power/shared';
import { StatCard, Panel, TruncatedText } from './primitives/LayoutPrimitives';

interface ResourceBoardProps {
  fusedPicture: FusedOperationalPicture;
}

export const ResourceBoard: React.FC<ResourceBoardProps> = ({ fusedPicture }) => {
  const [activeTab, setActiveTab] = useState<'AIRCRAFT' | 'CREW' | 'MUNITIONS' | 'FORECAST'>('AIRCRAFT');
  const [filterBase, setFilterBase] = useState<string>('ALL');

  const { aircraft, pilots, munitionStocks, bases } = fusedPicture;

  const fmcCount = aircraft.filter((a) => a.status === 'FMC').length;
  const aogCount = aircraft.filter((a) => a.status === 'AOG').length;
  const readyPilotsCount = pilots.filter((p) => p.status === 'READY').length;
  const fatiguedPilotsCount = pilots.filter((p) => p.status === 'FATIGUED').length;

  const filteredAircraft = aircraft.filter(
    (a) => filterBase === 'ALL' || a.baseId === filterBase
  );
  const filteredPilots = pilots.filter(
    (p) => filterBase === 'ALL' || p.baseId === filterBase
  );

  return (
    <div className="flex flex-col gap-4 w-full min-w-0">
      {/* KPI Cards Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 w-full min-w-0">
        <StatCard
          label="Combat Fleet Readiness"
          value={`${fmcCount} / ${aircraft.length} FMC`}
          subtitle={`${Math.round((fmcCount / aircraft.length) * 100)}% Fully Mission Capable`}
          icon="flight"
          delta={{ value: '+98% FMC', isPositive: true }}
        />
        <StatCard
          label="Aircrew Roster Status"
          value={`${readyPilotsCount} / ${pilots.length} READY`}
          subtitle={`${fatiguedPilotsCount} pilots currently in rest buffer`}
          icon="group"
          delta={{ value: 'Full Roster', isPositive: true }}
        />
        <StatCard
          label="Aircraft On Ground (AOG)"
          value={`${aogCount} AIRFRAMES`}
          subtitle="Under unscheduled line maintenance / snags"
          icon="warning"
          delta={{ value: `${aogCount} Active Snags`, isPositive: false }}
        />
        <StatCard
          label="Operational Forward Bases"
          value={`${bases.filter((b) => b.currentWeatherStatus !== 'CLOSED').length} / ${bases.length} ACTIVE`}
          subtitle="All forward runways operating within weather minima"
          icon="location_on"
          delta={{ value: '100% Operational', isPositive: true }}
        />
      </div>

      {/* Main Panel with Filter Header */}
      <Panel
        title="THEATER RESOURCE & FLEET SERVICEABILITY BOARD"
        subtitle="Live state of combat airframes, pilot rest cycles, and magazine stocks"
        badge={
          <span className="px-2 py-0.5 bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-bold font-mono">
            MILP SYNCED
          </span>
        }
        actions={
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold text-on-surface-variant font-mono">BASE:</span>
            <select
              value={filterBase}
              onChange={(e) => setFilterBase(e.target.value)}
              className="bg-surface-container-lowest border border-outline-variant text-primary px-2 py-1 text-xs font-mono font-bold"
            >
              <option value="ALL">ALL THEATER BASES</option>
              {bases.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name} ({b.icao})
                </option>
              ))}
            </select>
          </div>
        }
      >
        {/* Sub-tab Navigation */}
        <div className="flex items-center gap-1 border-b border-outline-variant pb-2 mb-3 overflow-x-auto">
          {(['AIRCRAFT', 'CREW', 'MUNITIONS', 'FORECAST'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-3 py-1 text-xs font-bold font-mono uppercase tracking-wider border transition whitespace-nowrap shrink-0 ${
                activeTab === tab
                  ? 'bg-primary text-on-primary border-primary'
                  : 'bg-surface-container-lowest text-on-surface-variant border-outline-variant hover:bg-surface-container'
              }`}
            >
              {tab === 'FORECAST' ? 'PREDICTIVE 12H FORECAST' : tab}
            </button>
          ))}
        </div>

        {/* Tab 1: Aircraft */}
        {activeTab === 'AIRCRAFT' && (
          <div className="w-full min-w-0 overflow-x-auto border border-outline-variant">
            <table className="w-full text-left font-mono text-xs border-collapse">
              <thead className="bg-surface-container-high text-on-surface-variant text-[10px] uppercase font-bold border-b border-outline-variant">
                <tr>
                  <th className="py-2 px-3 whitespace-nowrap">TAIL NUMBER</th>
                  <th className="py-2 px-3 whitespace-nowrap">MODEL / CLASS</th>
                  <th className="py-2 px-3 whitespace-nowrap">SQUADRON</th>
                  <th className="py-2 px-3 whitespace-nowrap">BASE</th>
                  <th className="py-2 px-3 whitespace-nowrap">STATUS</th>
                  <th className="py-2 px-3 whitespace-nowrap">FUEL (CUR/MAX)</th>
                  <th className="py-2 px-3 whitespace-nowrap">COMBAT RADIUS</th>
                  <th className="py-2 px-3 whitespace-nowrap">TURNAROUND</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/40 font-mono text-[11px]">
                {filteredAircraft.map((ac) => (
                  <tr key={ac.tailNumber} className="hover:bg-surface-container-low transition-colors">
                    <td className="py-2 px-3 font-bold text-secondary whitespace-nowrap">{ac.tailNumber}</td>
                    <td className="py-2 px-3 font-bold text-primary whitespace-nowrap">{ac.model}</td>
                    <td className="py-2 px-3 text-on-surface-variant whitespace-nowrap">{ac.squadron}</td>
                    <td className="py-2 px-3 text-on-surface-variant whitespace-nowrap">{ac.baseId.replace('BASE_', '')}</td>
                    <td className="py-2 px-3 whitespace-nowrap">
                      <span
                        className={`px-1.5 py-0.5 border text-[10px] font-bold ${
                          ac.status === 'FMC'
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                            : ac.status === 'AOG'
                            ? 'bg-rose-50 text-rose-800 border-rose-200'
                            : 'bg-amber-50 text-amber-800 border-amber-200'
                        }`}
                      >
                        {ac.status}
                      </span>
                      {ac.snagDescription && (
                        <div className="text-[10px] text-rose-700 mt-0.5 truncate max-w-[200px]" title={ac.snagDescription}>
                          {ac.snagDescription}
                        </div>
                      )}
                    </td>
                    <td className="py-2 px-3 whitespace-nowrap">
                      {Math.round(ac.currentFuelKg / 1000)}t / {Math.round(ac.fuelCapacityKg / 1000)}t
                    </td>
                    <td className="py-2 px-3 whitespace-nowrap">{ac.combatRadiusKm} km</td>
                    <td className="py-2 px-3 text-on-surface-variant whitespace-nowrap">{ac.turnaroundTimeMinutes} min</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Tab 2: Crew */}
        {activeTab === 'CREW' && (
          <div className="w-full min-w-0 overflow-x-auto border border-outline-variant">
            <table className="w-full text-left font-mono text-xs border-collapse">
              <thead className="bg-surface-container-high text-on-surface-variant text-[10px] uppercase font-bold border-b border-outline-variant">
                <tr>
                  <th className="py-2 px-3 whitespace-nowrap">OFFICER ID</th>
                  <th className="py-2 px-3 whitespace-nowrap">CALLSIGN</th>
                  <th className="py-2 px-3 whitespace-nowrap">RANK</th>
                  <th className="py-2 px-3 whitespace-nowrap">TYPE RATING</th>
                  <th className="py-2 px-3 whitespace-nowrap">BASE</th>
                  <th className="py-2 px-3 whitespace-nowrap">FATIGUE INDEX</th>
                  <th className="py-2 px-3 whitespace-nowrap">DUTY (24H)</th>
                  <th className="py-2 px-3 whitespace-nowrap">STATUS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/40 font-mono text-[11px]">
                {filteredPilots.map((pilot) => (
                  <tr key={pilot.id} className="hover:bg-surface-container-low transition-colors">
                    <td className="py-2 px-3 font-bold text-secondary whitespace-nowrap">{pilot.id}</td>
                    <td className="py-2 px-3 font-bold text-primary whitespace-nowrap">{pilot.callsign}</td>
                    <td className="py-2 px-3 text-on-surface-variant whitespace-nowrap">{pilot.rank}</td>
                    <td className="py-2 px-3 text-primary whitespace-nowrap">{pilot.typeRating}</td>
                    <td className="py-2 px-3 text-on-surface-variant whitespace-nowrap">{pilot.baseId.replace('BASE_', '')}</td>
                    <td className="py-2 px-3 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <div className="w-16 bg-surface-container-high h-2 border border-outline-variant overflow-hidden">
                          <div
                            className={`h-full ${
                              pilot.fatigueScore > 65
                                ? 'bg-rose-600'
                                : pilot.fatigueScore > 40
                                ? 'bg-amber-500'
                                : 'bg-emerald-600'
                            }`}
                            style={{ width: `${pilot.fatigueScore}%` }}
                          />
                        </div>
                        <span className="text-[11px] font-bold">{pilot.fatigueScore}/100</span>
                      </div>
                    </td>
                    <td className="py-2 px-3 text-on-surface-variant whitespace-nowrap">{pilot.dutyHoursLast24h}h</td>
                    <td className="py-2 px-3 whitespace-nowrap">
                      <span
                        className={`px-1.5 py-0.5 border text-[10px] font-bold ${
                          pilot.status === 'READY'
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                            : 'bg-rose-50 text-rose-800 border-rose-200'
                        }`}
                      >
                        {pilot.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Tab 3: Munitions */}
        {activeTab === 'MUNITIONS' && (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 w-full min-w-0">
            {bases.map((base) => {
              const baseMunitions = munitionStocks.filter((m) => m.baseId === base.id);
              return (
                <div key={base.id} className="p-3 bg-surface-container-low border border-outline-variant">
                  <div className="font-bold text-primary text-xs uppercase mb-2 border-b border-outline-variant pb-1 flex justify-between">
                    <span>{base.name}</span>
                    <span className="text-secondary">{base.icao}</span>
                  </div>
                  <div className="space-y-1.5 text-xs font-mono">
                    {baseMunitions.map((m) => (
                      <div key={m.munitionId} className="flex justify-between items-center py-0.5 border-b border-outline-variant/30">
                        <TruncatedText text={m.munitionId.replace('MUN_', '')} className="text-on-surface-variant font-bold text-[11px]" />
                        <span className="text-primary font-bold text-[11px]">{m.quantity} units</span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Tab 4: Forecast */}
        {activeTab === 'FORECAST' && (
          <div className="space-y-3 font-mono text-xs w-full min-w-0">
            <div className="text-primary font-bold text-xs uppercase tracking-wider mb-2">
              PREDICTIVE SERVICEABILITY & FATIGUE EXPIRATION (NEXT 12 HOURS)
            </div>
            <div className="p-3 bg-surface-container-low border border-outline-variant flex flex-col gap-1">
              <div className="flex justify-between font-bold text-primary">
                <span>H+2h: Ground Turnaround Completions</span>
                <span className="text-emerald-700">+6 Airframes Returning to FMC</span>
              </div>
              <div className="text-on-surface-variant text-[11px]">
                Scheduled line-maintenance completions on 4x Su-30MKI (Jodhpur) and 2x Rafale (Ambala).
              </div>
            </div>

            <div className="p-3 bg-surface-container-low border border-outline-variant flex flex-col gap-1">
              <div className="flex justify-between font-bold text-primary">
                <span>H+4h: Projected Aircrew Fatigue Cliffs</span>
                <span className="text-amber-700">12 Pilots Enter Mandatory Rest</span>
              </div>
              <div className="text-on-surface-variant text-[11px]">
                Pilots on No. 220 Desert Tigers squadron reach 10 hours continuous tactical duty. Relief roster automatically scheduled.
              </div>
            </div>

            <div className="p-3 bg-surface-container-low border border-outline-variant flex flex-col gap-1">
              <div className="flex justify-between font-bold text-primary">
                <span>H+6h: Forward Munitions Replenishment Convoy Arrival</span>
                <span className="text-secondary">+24 Spice-2000 & +16 Astra-BVR</span>
              </div>
              <div className="text-on-surface-variant text-[11px]">
                Armament convoy arriving at Forward Base Adampur and Halwara restoring depth magazine stocks.
              </div>
            </div>
          </div>
        )}
      </Panel>
    </div>
  );
};
