'use client';

import React, { useState } from 'react';
import { FusedOperationalPicture, Aircraft, Aircrew, MunitionStock } from '@air-power/shared';
import { Plane, Users, ShieldAlert, Clock, CheckCircle2, AlertTriangle } from 'lucide-react';

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
    <div className="space-y-4">
      {/* KPI Cards Banner */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-ops-900 border border-ops-700/60 p-4 rounded-lg flex items-center justify-between">
          <div>
            <div className="text-xs font-mono text-gray-400">COMBAT FLEET READINESS</div>
            <div className="text-2xl font-bold font-mono text-ops-accent">
              {fmcCount} <span className="text-xs text-gray-400">/ {aircraft.length} FMC</span>
            </div>
            <div className="text-[11px] text-ops-success flex items-center gap-1 mt-1">
              <CheckCircle2 className="w-3 h-3" />
              {Math.round((fmcCount / aircraft.length) * 100)}% Fully Mission Capable
            </div>
          </div>
          <Plane className="w-8 h-8 text-ops-accent opacity-70" />
        </div>

        <div className="bg-ops-900 border border-ops-700/60 p-4 rounded-lg flex items-center justify-between">
          <div>
            <div className="text-xs font-mono text-gray-400">AIRCREW ROSTER STATUS</div>
            <div className="text-2xl font-bold font-mono text-emerald-400">
              {readyPilotsCount} <span className="text-xs text-gray-400">/ {pilots.length} READY</span>
            </div>
            <div className="text-[11px] text-gray-400 flex items-center gap-1 mt-1">
              <Clock className="w-3 h-3 text-amber-400" />
              {fatiguedPilotsCount} pilots in rest / fatigued
            </div>
          </div>
          <Users className="w-8 h-8 text-emerald-400 opacity-70" />
        </div>

        <div className="bg-ops-900 border border-ops-700/60 p-4 rounded-lg flex items-center justify-between">
          <div>
            <div className="text-xs font-mono text-gray-400">AIRCRAFT ON GROUND (AOG)</div>
            <div className="text-2xl font-bold font-mono text-ops-alert">
              {aogCount} <span className="text-xs text-gray-400">AIRFRAMES</span>
            </div>
            <div className="text-[11px] text-ops-alert flex items-center gap-1 mt-1">
              <ShieldAlert className="w-3 h-3" />
              Under maintenance / snags
            </div>
          </div>
          <ShieldAlert className="w-8 h-8 text-ops-alert opacity-70" />
        </div>

        <div className="bg-ops-900 border border-ops-700/60 p-4 rounded-lg flex items-center justify-between">
          <div>
            <div className="text-xs font-mono text-gray-400">OPERATIONAL BASES</div>
            <div className="text-2xl font-bold font-mono text-white">
              {bases.filter((b) => b.currentWeatherStatus !== 'CLOSED').length}{' '}
              <span className="text-xs text-gray-400">/ {bases.length} ACTIVE</span>
            </div>
            <div className="text-[11px] text-gray-400 flex items-center gap-1 mt-1">
              {bases.filter((b) => b.currentWeatherStatus === 'CLOSED').length > 0 ? (
                <span className="text-ops-alert flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" /> Sub-minima weather closure
                </span>
              ) : (
                <span className="text-ops-success">All forward runways open</span>
              )}
            </div>
          </div>
          <div className="w-8 h-8 rounded-full border border-ops-accent/40 flex items-center justify-center text-xs font-mono text-ops-accent">
            FOB
          </div>
        </div>
      </div>

      {/* Control Bar */}
      <div className="flex flex-wrap items-center justify-between bg-ops-900 border border-ops-700/60 p-3 rounded-lg text-xs font-mono">
        <div className="flex space-x-2">
          {(['AIRCRAFT', 'CREW', 'MUNITIONS', 'FORECAST'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-3 py-1.5 rounded transition ${
                activeTab === tab
                  ? 'bg-ops-accent text-ops-950 font-bold'
                  : 'bg-ops-800 text-gray-300 hover:bg-ops-700'
              }`}
            >
              {tab === 'FORECAST' ? 'PREDICTIVE 12H FORECAST' : tab}
            </button>
          ))}
        </div>

        <div className="flex items-center space-x-2">
          <span className="text-gray-400">FILTER AIRBASE:</span>
          <select
            value={filterBase}
            onChange={(e) => setFilterBase(e.target.value)}
            className="bg-ops-800 border border-ops-700 text-gray-200 px-2 py-1 rounded text-xs"
          >
            <option value="ALL">ALL THEATER BASES</option>
            {bases.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name} ({b.icao})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Active Tab Table Content */}
      <div className="bg-ops-900 border border-ops-700/60 rounded-lg overflow-hidden">
        {activeTab === 'AIRCRAFT' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left font-mono text-xs">
              <thead className="bg-ops-850 text-gray-400 uppercase text-[10px] border-b border-ops-700/60">
                <tr>
                  <th className="p-3">TAIL NUMBER</th>
                  <th className="p-3">MODEL / CLASS</th>
                  <th className="p-3">SQUADRON</th>
                  <th className="p-3">BASE</th>
                  <th className="p-3">STATUS</th>
                  <th className="p-3">FUEL REMAINING</th>
                  <th className="p-3">COMBAT RADIUS</th>
                  <th className="p-3">TURNAROUND</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ops-800/80">
                {filteredAircraft.slice(0, 15).map((ac) => (
                  <tr key={ac.tailNumber} className="hover:bg-ops-850/50">
                    <td className="p-3 font-bold text-ops-accent">{ac.tailNumber}</td>
                    <td className="p-3 text-white">{ac.model}</td>
                    <td className="p-3 text-gray-300">{ac.squadron}</td>
                    <td className="p-3 text-gray-400">{ac.baseId.replace('BASE_', '')}</td>
                    <td className="p-3">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          ac.status === 'FMC'
                            ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                            : ac.status === 'AOG'
                            ? 'bg-rose-950 text-rose-400 border border-rose-800'
                            : 'bg-amber-950 text-amber-400 border border-amber-800'
                        }`}
                      >
                        {ac.status}
                      </span>
                      {ac.snagDescription && (
                        <div className="text-[10px] text-rose-300 mt-0.5 truncate max-w-[200px]">
                          {ac.snagDescription}
                        </div>
                      )}
                    </td>
                    <td className="p-3 text-gray-200">
                      {Math.round(ac.currentFuelKg / 1000)}t / {Math.round(ac.fuelCapacityKg / 1000)}t
                    </td>
                    <td className="p-3 text-gray-200">{ac.combatRadiusKm} km</td>
                    <td className="p-3 text-gray-400">{ac.turnaroundTimeMinutes} min</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'CREW' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left font-mono text-xs">
              <thead className="bg-ops-850 text-gray-400 uppercase text-[10px] border-b border-ops-700/60">
                <tr>
                  <th className="p-3">OFFICER ID</th>
                  <th className="p-3">CALLSIGN</th>
                  <th className="p-3">RANK</th>
                  <th className="p-3">TYPE RATING</th>
                  <th className="p-3">BASE</th>
                  <th className="p-3">FATIGUE INDEX</th>
                  <th className="p-3">DUTY (24H)</th>
                  <th className="p-3">STATUS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ops-800/80">
                {filteredPilots.slice(0, 15).map((pilot) => (
                  <tr key={pilot.id} className="hover:bg-ops-850/50">
                    <td className="p-3 text-ops-accent font-bold">{pilot.id}</td>
                    <td className="p-3 text-white font-semibold">{pilot.callsign}</td>
                    <td className="p-3 text-gray-300">{pilot.rank}</td>
                    <td className="p-3 text-gray-200">{pilot.typeRating}</td>
                    <td className="p-3 text-gray-400">{pilot.baseId.replace('BASE_', '')}</td>
                    <td className="p-3">
                      <div className="flex items-center space-x-2">
                        <div className="w-16 bg-ops-800 h-2 rounded overflow-hidden">
                          <div
                            className={`h-full ${
                              pilot.fatigueScore > 65
                                ? 'bg-rose-500'
                                : pilot.fatigueScore > 40
                                ? 'bg-amber-400'
                                : 'bg-emerald-400'
                            }`}
                            style={{ width: `${pilot.fatigueScore}%` }}
                          />
                        </div>
                        <span className="text-[11px] text-gray-300">{pilot.fatigueScore}/100</span>
                      </div>
                    </td>
                    <td className="p-3 text-gray-300">{pilot.dutyHoursLast24h}h</td>
                    <td className="p-3">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          pilot.status === 'READY'
                            ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                            : 'bg-rose-950 text-rose-400 border border-rose-800'
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

        {activeTab === 'MUNITIONS' && (
          <div className="overflow-x-auto p-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {bases.map((base) => {
                const baseMunitions = munitionStocks.filter((m) => m.baseId === base.id);
                return (
                  <div key={base.id} className="bg-ops-850 p-3 rounded border border-ops-700/50">
                    <div className="font-bold text-ops-accent mb-2">{base.name} ({base.icao})</div>
                    <div className="space-y-1.5 text-xs font-mono">
                      {baseMunitions.map((m) => (
                        <div key={m.munitionId} className="flex justify-between border-b border-ops-800/60 pb-1">
                          <span className="text-gray-300">{m.munitionId.replace('MUN_', '')}</span>
                          <span className="text-emerald-400 font-bold">{m.quantity} units</span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {activeTab === 'FORECAST' && (
          <div className="p-4 space-y-4 font-mono text-xs">
            <div className="text-ops-accent font-bold text-sm">
              PREDICTIVE SERVICEABILITY & FATIGUE EXPIRATION (NEXT 12 HOURS)
            </div>
            <div className="space-y-2">
              <div className="bg-ops-850 p-3 rounded border border-ops-700/50">
                <div className="flex justify-between font-bold text-gray-200 mb-1">
                  <span>H+2h: Ground Turnaround Completions</span>
                  <span className="text-emerald-400">+6 Airframes Returning to FMC</span>
                </div>
                <div className="text-gray-400 text-[11px]">
                  Scheduled line-maintenance completions on 4x Su-30MKI (Jodhpur) and 2x Rafale (Ambala).
                </div>
              </div>

              <div className="bg-ops-850 p-3 rounded border border-ops-700/50">
                <div className="flex justify-between font-bold text-gray-200 mb-1">
                  <span>H+4h: Projected Aircrew Fatigue Cliffs</span>
                  <span className="text-amber-400">12 Pilots Enter Mandatory Rest</span>
                </div>
                <div className="text-gray-400 text-[11px]">
                  Pilots on No. 220 Desert Tigers squadron reach 10 hours continuous tactical duty. Relief roster automatically scheduled.
                </div>
              </div>

              <div className="bg-ops-850 p-3 rounded border border-ops-700/50">
                <div className="flex justify-between font-bold text-gray-200 mb-1">
                  <span>H+6h: Forward Munitions Replenishment Convoy Arrival</span>
                  <span className="text-ops-accent">+24 Spice-2000 & +16 Astra-BVR</span>
                </div>
                <div className="text-gray-400 text-[11px]">
                  Armament convoy arriving at Forward Base Adampur and Halwara restoring depth magazine stocks.
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
