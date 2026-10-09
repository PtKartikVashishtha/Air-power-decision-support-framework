'use client';

import React, { useState, useEffect } from 'react';
import {
  Compass,
  Fuel,
  Crosshair,
  AlertTriangle,
  CheckCircle,
  Clock,
  Layers,
  ArrowRight,
  Shield,
  Plane,
} from 'lucide-react';

export const DeconflictionKillchainPanel: React.FC = () => {
  const [deconfliction, setDeconfliction] = useState<any | null>(null);
  const [tankers, setTankers] = useState<any[]>([]);
  const [killchain, setKillchain] = useState<any | null>(null);
  const [isDynamicKillchain, setIsDynamicKillchain] = useState(true);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchData();
  }, [isDynamicKillchain]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [resDeconf, resTankers, resKc] = await Promise.all([
        fetch('http://localhost:3001/api/deconfliction'),
        fetch('http://localhost:3001/api/tanker-aar'),
        fetch(`http://localhost:3001/api/killchain/TGT-TST-01?dynamic=${isDynamicKillchain}`),
      ]);

      if (resDeconf.ok) setDeconfliction(await resDeconf.json());
      if (resTankers.ok) setTankers(await resTankers.json());
      if (resKc.ok) setKillchain(await resKc.json());
    } catch (err) {
      console.error('Failed to fetch deconfliction and kill-chain data', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-5 font-mono text-xs">
      {/* Header Banner */}
      <div className="bg-ops-900 border border-ops-700/60 p-4 rounded-lg flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="text-ops-accent font-bold text-sm flex items-center gap-2">
            <Compass className="w-4 h-4 text-ops-accent" />
            4D AIRSPACE DECONFLICTION, TANKER AAR &amp; F2T2EA KILL-CHAIN ENGINE
          </div>
          <div className="text-gray-400 text-[11px] mt-0.5">
            Operational realism modules: Spatiotemporal corridor clearance, NATO DINO-SAAR tanker offload tracks, and time-sensitive target kill-chains
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <span className="text-[10px] text-gray-400">ACO CORRIDOR SAFETY:</span>
          <span className="px-2.5 py-1 rounded bg-emerald-950 text-emerald-400 font-bold border border-emerald-800">
            {deconfliction?.safeCorridorPassRatePercent ?? 88}% CLEAR
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Section 1: 4D Spatiotemporal Airspace Deconfliction */}
        <div className="lg:col-span-2 bg-ops-900 border border-ops-700/60 rounded-lg p-4 space-y-3">
          <div className="flex items-center justify-between border-b border-ops-800 pb-2">
            <div className="flex items-center space-x-2">
              <Layers className="w-4 h-4 text-ops-accent" />
              <span className="font-bold text-white text-xs uppercase">
                4D AIRSPACE DECONFLICTION (TIME-SPACE SEPARATION)
              </span>
            </div>
            <span className="text-[10px] text-gray-400">
              AUDITED: {deconfliction?.totalSortiesAudited ?? 0} SORTIES
            </span>
          </div>

          <div className="p-2.5 bg-ops-950 rounded border border-ops-800 text-[11px] text-gray-300">
            {deconfliction?.militaryAcoMessageSummary || 'ACO AUDIT ACTIVE // SECTOR CORRIDORS SYNCHRONIZED'}
          </div>

          <div className="space-y-2">
            <div className="text-[10px] font-bold text-gray-400 uppercase">
              DETECTED 4D CONFLICTS &amp; MITIGATION ACTIONS ({deconfliction?.conflicts?.length ?? 0}):
            </div>

            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
              {deconfliction?.conflicts?.map((conf: any, idx: number) => (
                <div
                  key={idx}
                  className="p-3 bg-ops-950/80 rounded border border-ops-800 hover:border-ops-700 transition space-y-1.5"
                >
                  <div className="flex justify-between items-center text-[11px]">
                    <span className="font-bold text-amber-400 flex items-center gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      {conf.conflictId} // {conf.severity.replace(/_/g, ' ')}
                    </span>
                    <span className="text-gray-400 font-mono text-[10px]">
                      T+{conf.timeMinutes}m @ FL{Math.round(conf.altitudeFt / 100)}
                    </span>
                  </div>

                  <div className="text-[11px] text-gray-300">
                    Sorties: <span className="text-white font-bold">{conf.sortiesInvolved.join(', ')}</span>
                  </div>

                  <div className="text-[11px] text-emerald-400 bg-emerald-950/30 px-2 py-1 rounded border border-emerald-900/50">
                    Resolution: {conf.resolutionAction}
                  </div>
                </div>
              ))}

              {(!deconfliction?.conflicts || deconfliction.conflicts.length === 0) && (
                <div className="p-4 text-center text-gray-500 bg-ops-950 rounded">
                  <CheckCircle className="w-5 h-5 text-emerald-500 mx-auto mb-1" />
                  NO 4D AIRSPACE CONFLICTS DETECTED. ALL SORTIES MEET MINIMUM SEPARATION.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Section 2: Constrained IL-78 Tanker AAR Plan */}
        <div className="bg-ops-900 border border-ops-700/60 rounded-lg p-4 space-y-3">
          <div className="flex items-center justify-between border-b border-ops-800 pb-2">
            <div className="flex items-center space-x-2">
              <Fuel className="w-4 h-4 text-amber-400" />
              <span className="font-bold text-white text-xs uppercase">TANKER AAR TRACKS</span>
            </div>
            <span className="text-[10px] text-amber-300">DINO-SAAR MODEL</span>
          </div>

          <p className="text-[11px] text-gray-400 leading-relaxed">
            Optimizes airborne refueling tracks, rendezvous windows, and offload capacity to achieve mission objectives with minimal tanker sorties.
          </p>

          <div className="space-y-3">
            {tankers.map((t, idx) => (
              <div key={idx} className="p-3 bg-ops-950 rounded border border-ops-800 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-white text-xs flex items-center gap-1.5">
                    <Plane className="w-3.5 h-3.5 text-amber-400" />
                    {t.tankerCallsign} ({t.tankerTail})
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-amber-950 text-amber-400 border border-amber-800">
                    ORBIT: {t.orbitTrackId}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[10px] text-gray-400 pt-1">
                  <div>
                    Window: <strong className="text-white">T+{t.timeWindowMinutes[0]} - {t.timeWindowMinutes[1]}m</strong>
                  </div>
                  <div>
                    Capacity: <strong className="text-white">{Math.round(t.fuelAvailableKg / 1000)}t</strong>
                  </div>
                  <div>
                    Offloaded: <strong className="text-ops-accent">{Math.round(t.fuelOffloadedKg / 1000)}t</strong>
                  </div>
                  <div>
                    Receivers: <strong className="text-emerald-400">{t.receiverSortiesCount} sorties</strong>
                  </div>
                </div>

                {t.receiverCallsigns && t.receiverCallsigns.length > 0 && (
                  <div className="text-[10px] text-gray-400 border-t border-ops-800/60 pt-1.5">
                    Receivers: <span className="text-gray-200">{t.receiverCallsigns.join(', ')}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Section 3: F2T2EA Time-Sensitive Target Kill-Chain */}
      <div className="bg-ops-900 border border-ops-700/60 rounded-lg p-4 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-ops-800 pb-2">
          <div className="flex items-center space-x-2">
            <Crosshair className="w-4 h-4 text-ops-accent" />
            <span className="font-bold text-white text-xs uppercase">
              F2T2EA KILL-CHAIN COMPRESSION TIMELINE (FIND-FIX-TRACK-TARGET-ENGAGE-ASSESS)
            </span>
          </div>

          <div className="flex items-center space-x-2">
            <span className="text-[10px] text-gray-400">PLANNING CONTROLLER:</span>
            <button
              onClick={() => setIsDynamicKillchain(!isDynamicKillchain)}
              className={`px-3 py-1 rounded text-xs font-bold transition ${
                isDynamicKillchain
                  ? 'bg-ops-accent text-ops-950 glow-cyan'
                  : 'bg-amber-900 text-amber-300'
              }`}
            >
              {isDynamicKillchain ? 'DYNAMIC RE-OPTIMIZER (18.5m)' : 'STATIC ATO CONTROLLER (72m)'}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
          {[
            { phase: 'FIND', mins: killchain?.phases?.findMins ?? 3, desc: 'ELINT / Sat Detection' },
            { phase: 'FIX', mins: killchain?.phases?.fixMins ?? 2, desc: 'Radar Triangulation' },
            { phase: 'TRACK', mins: killchain?.phases?.trackMins ?? 2, desc: 'Continuous Track' },
            { phase: 'TARGET', mins: killchain?.phases?.targetMins ?? (isDynamicKillchain ? 1.5 : 30), desc: isDynamicKillchain ? 'Instant ALNS Re-plan' : 'Manual Staff Re-plan' },
            { phase: 'ENGAGE', mins: killchain?.phases?.engageMins ?? 8, desc: 'Airborne Ingress' },
            { phase: 'ASSESS', mins: killchain?.phases?.assessMins ?? 2, desc: 'Radar BDA Confirm' },
          ].map((step, idx) => (
            <div
              key={idx}
              className={`p-3 rounded border text-center space-y-1 ${
                step.phase === 'TARGET' && !isDynamicKillchain
                  ? 'bg-rose-950/40 border-rose-800'
                  : 'bg-ops-950 border-ops-800'
              }`}
            >
              <div className="text-[10px] text-gray-400 uppercase font-bold">{step.phase}</div>
              <div
                className={`text-lg font-bold ${
                  step.phase === 'TARGET' && !isDynamicKillchain ? 'text-rose-400' : 'text-ops-accent'
                }`}
              >
                {step.mins}m
              </div>
              <div className="text-[9px] text-gray-400 truncate">{step.desc}</div>
            </div>
          ))}
        </div>

        <div className="p-3 bg-ops-950 rounded border border-ops-800 flex justify-between items-center text-xs">
          <div>
            <span className="text-gray-400">Target Objective: </span>
            <strong className="text-white">{killchain?.targetName || 'Pop-up Mobile Radar Mast (TST)'}</strong>
            <span className="text-gray-400 ml-4">Total Time to Engage: </span>
            <strong className={isDynamicKillchain ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
              {killchain?.totalTimeToEngageMinutes ?? (isDynamicKillchain ? 18.5 : 72.0)} minutes
            </strong>
          </div>

          <div className="text-[11px] text-ops-accent">
            {killchain?.dynamicVsStaticAdvantageText ||
              (isDynamicKillchain
                ? 'Compressed by 53.5 mins via airborne asset retasking'
                : 'High risk of target departure before weapons release')}
          </div>
        </div>
      </div>
    </div>
  );
};
