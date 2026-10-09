'use client';

import React, { useRef, useEffect, useState } from 'react';
import {
  Airbase,
  TargetRequest,
  ThreatIntel,
  GeoCoord,
} from '@air-power/shared';
import {
  ThreatAwareRoutePlanner,
  RouteComparison,
} from '@air-power/optimizer';

interface RouteComparisonDrawerProps {
  bases: Airbase[];
  targets: TargetRequest[];
  threats: ThreatIntel[];
  selectedBaseId?: string;
  selectedTargetId?: string;
  onClose: () => void;
}

export const RouteComparisonDrawer: React.FC<RouteComparisonDrawerProps> = ({
  bases,
  targets,
  threats,
  selectedBaseId,
  selectedTargetId,
  onClose,
}) => {
  const [baseId, setBaseId] = useState<string>(selectedBaseId || bases[0]?.id || '');
  const [targetId, setTargetId] = useState<string>(selectedTargetId || targets[0]?.id || '');
  const [aircraftModel, setAircraftModel] = useState<string>('RAFALE_CLASS');
  const [comparison, setComparison] = useState<RouteComparison | null>(null);
  const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'ELEVATION' | 'WAYPOINTS'>('OVERVIEW');

  const profileCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Re-compute route comparison whenever selection changes
  useEffect(() => {
    const originBase = bases.find((b) => b.id === baseId);
    const target = targets.find((t) => t.id === targetId);

    if (!originBase || !target) return;

    const planner = new ThreatAwareRoutePlanner();
    const result = planner.planAndCompareRoutes(
      originBase.location,
      target.location,
      threats,
      aircraftModel
    );

    setComparison(result);
  }, [baseId, targetId, aircraftModel, bases, targets, threats]);

  // Draw 2D Elevation Profile Cross-Section
  useEffect(() => {
    if (!comparison || activeTab !== 'ELEVATION') return;
    const canvas = profileCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const padding = { top: 25, right: 25, bottom: 35, left: 55 };

    ctx.fillStyle = '#060a10';
    ctx.fillRect(0, 0, width, height);

    const profileA = comparison.routeA.elevationProfile;
    const profileB = comparison.routeB.elevationProfile;

    if (profileB.length < 2) return;

    const maxDist = Math.max(comparison.routeA.totalDistanceKm, comparison.routeB.totalDistanceKm);
    const maxAlt = 10500; // FL320 + buffer

    const scaleX = (distKm: number) =>
      padding.left + (distKm / maxDist) * (width - padding.left - padding.right);
    const scaleY = (altM: number) =>
      height - padding.bottom - (altM / maxAlt) * (height - padding.top - padding.bottom);

    // Grid lines
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.lineWidth = 1;
    ctx.font = '10px monospace';
    ctx.fillStyle = '#64748b';

    for (let alt = 2000; alt <= 10000; alt += 2000) {
      const y = scaleY(alt);
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(width - padding.right, y);
      ctx.stroke();
      ctx.fillText(`${alt}m`, 10, y + 3);
    }

    for (let d = 50; d < maxDist; d += 100) {
      const x = scaleX(d);
      ctx.beginPath();
      ctx.moveTo(x, padding.top);
      ctx.lineTo(x, height - padding.bottom);
      ctx.stroke();
      ctx.fillText(`${d}km`, x - 12, height - 15);
    }

    // 1. Terrain Polygon under Route B
    ctx.beginPath();
    ctx.moveTo(scaleX(0), scaleY(0));
    for (const pt of profileB) {
      ctx.lineTo(scaleX(pt.distanceKm), scaleY(pt.terrainAltM));
    }
    ctx.lineTo(scaleX(profileB[profileB.length - 1].distanceKm), scaleY(0));
    ctx.closePath();
    const terrainGrad = ctx.createLinearGradient(0, scaleY(4000), 0, scaleY(0));
    terrainGrad.addColorStop(0, 'rgba(180, 83, 9, 0.45)');
    terrainGrad.addColorStop(1, 'rgba(69, 26, 3, 0.85)');
    ctx.fillStyle = terrainGrad;
    ctx.fill();
    ctx.strokeStyle = '#d97706';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // 2. Route A Flight Path (Direct High Altitude - Cyan)
    ctx.beginPath();
    for (let i = 0; i < profileA.length; i++) {
      const pt = profileA[i];
      const x = scaleX(pt.distanceKm);
      const y = scaleY(pt.flightAltM);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.strokeStyle = '#00e5ff';
    ctx.lineWidth = 2.5;
    ctx.setLineDash([6, 4]);
    ctx.stroke();
    ctx.setLineDash([]);

    // 3. Route B Flight Path (Tactical Low Level - Emerald)
    ctx.beginPath();
    for (let i = 0; i < profileB.length; i++) {
      const pt = profileB[i];
      const x = scaleX(pt.distanceKm);
      const y = scaleY(pt.flightAltM);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.strokeStyle = '#10b981';
    ctx.lineWidth = 3;
    ctx.stroke();

    // Radar LOS obstruction annotations
    ctx.fillStyle = '#10b981';
    ctx.font = 'bold 10px monospace';
    ctx.fillText('ROUTE B: TERRAIN-MASKED PROFILE (VALLEY INGRESS)', scaleX(15), scaleY(1200));

    ctx.fillStyle = '#00e5ff';
    ctx.fillText('ROUTE A: DIRECT HIGH-ALTITUDE (FL300)', scaleX(15), scaleY(9600));
  }, [comparison, activeTab]);

  if (!comparison) return null;

  return (
    <div className="flex flex-col bg-surface-container-lowest border border-outline-variant shadow-xl w-full max-w-4xl max-h-[85vh] overflow-hidden text-xs font-mono">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-surface-container-low border-b border-outline-variant">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-secondary" />
          <span className="font-bold text-primary uppercase text-sm tracking-wide">
            3D Route Engine // Route A vs Route B Comparison
          </span>
        </div>
        <button
          onClick={onClose}
          className="px-2 py-1 bg-surface-container hover:bg-surface-container-high border border-outline-variant text-on-surface text-xs font-bold"
        >
          CLOSE [ESC]
        </button>
      </div>

      {/* Selectors Bar */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-2 p-3 bg-surface-container-lowest border-b border-outline-variant">
        <div>
          <label className="block text-[10px] text-on-surface-variant font-bold uppercase mb-1">
            Origin Airbase:
          </label>
          <select
            value={baseId}
            onChange={(e) => setBaseId(e.target.value)}
            className="w-full px-2 py-1.5 bg-surface border border-outline-variant text-on-surface text-xs"
          >
            {bases.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name} ({b.icao})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-[10px] text-on-surface-variant font-bold uppercase mb-1">
            Assigned Target:
          </label>
          <select
            value={targetId}
            onChange={(e) => setTargetId(e.target.value)}
            className="w-full px-2 py-1.5 bg-surface border border-outline-variant text-on-surface text-xs"
          >
            {targets.map((t) => (
              <option key={t.id} value={t.id}>
                {t.id}: {t.name} (P:{t.priority})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-[10px] text-on-surface-variant font-bold uppercase mb-1">
            Airframe Type:
          </label>
          <select
            value={aircraftModel}
            onChange={(e) => setAircraftModel(e.target.value)}
            className="w-full px-2 py-1.5 bg-surface border border-outline-variant text-on-surface text-xs"
          >
            <option value="RAFALE_CLASS">Rafale Class (Omnirole Medium)</option>
            <option value="SU30_CLASS">Su-30MKI Class (Heavy Air Dominance)</option>
            <option value="TEJAS_CLASS">Tejas Class (Light Multirole)</option>
            <option value="MIRAGE_CLASS">Mirage Class (Precision Interceptor)</option>
          </select>
        </div>
      </div>

      {/* Recommendation Banner */}
      <div className={`px-4 py-2 border-b text-xs flex items-center justify-between ${
        comparison.recommendedRoute === 'ROUTE_B'
          ? 'bg-emerald-50 border-emerald-300 text-emerald-950'
          : 'bg-cyan-50 border-cyan-300 text-cyan-950'
      }`}>
        <div className="flex items-center gap-2">
          <span className="font-bold uppercase tracking-wider text-xs">
            RECOMMENDATION: {comparison.recommendedRoute === 'ROUTE_B' ? 'ROUTE B (TERRAIN-MASKED)' : 'ROUTE A (DIRECT HIGH-ALTITUDE)'}
          </span>
          <span className="text-[11px] font-sans opacity-90">{comparison.recommendationRationale}</span>
        </div>
        <span className="font-bold text-xs shrink-0">
          ΔRisk: -{comparison.riskReductionPercent}%
        </span>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-outline-variant bg-surface-container-low px-3 pt-2 gap-1">
        <button
          onClick={() => setActiveTab('OVERVIEW')}
          className={`px-3 py-1.5 font-bold border-b-2 text-xs transition ${
            activeTab === 'OVERVIEW'
              ? 'border-primary text-primary bg-surface-container-lowest'
              : 'border-transparent text-on-surface-variant hover:text-on-surface'
          }`}
        >
          METRIC COMPARISON
        </button>
        <button
          onClick={() => setActiveTab('ELEVATION')}
          className={`px-3 py-1.5 font-bold border-b-2 text-xs transition ${
            activeTab === 'ELEVATION'
              ? 'border-primary text-primary bg-surface-container-lowest'
              : 'border-transparent text-on-surface-variant hover:text-on-surface'
          }`}
        >
          2D TERRAIN TRANSECT &amp; PROFILE
        </button>
        <button
          onClick={() => setActiveTab('WAYPOINTS')}
          className={`px-3 py-1.5 font-bold border-b-2 text-xs transition ${
            activeTab === 'WAYPOINTS'
              ? 'border-primary text-primary bg-surface-container-lowest'
              : 'border-transparent text-on-surface-variant hover:text-on-surface'
          }`}
        >
          WAYPOINT TELEMETRY (ROUTE B)
        </button>
      </div>

      {/* Tab Content */}
      <div className="p-4 overflow-y-auto flex-1">
        {activeTab === 'OVERVIEW' && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              {/* Route A Card */}
              <div className="p-3 border border-cyan-300 bg-cyan-50/40 rounded-sm">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-bold text-cyan-900 text-xs uppercase">ROUTE A: DIRECT HIGH-ALTITUDE</span>
                  <span className="px-1.5 py-0.5 text-[10px] bg-cyan-200 text-cyan-900 font-bold">FL300</span>
                </div>
                <div className="space-y-1.5 text-[11px] text-cyan-950">
                  <div className="flex justify-between">
                    <span>Total Flight Distance:</span>
                    <span className="font-bold">{comparison.routeA.totalDistanceKm} km</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Flight Time:</span>
                    <span className="font-bold">{comparison.routeA.totalFlightTimeMinutes} min</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Planned Fuel Burn:</span>
                    <span className="font-bold">{comparison.routeA.totalFuelBurnKg} kg</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Average Threat Lethality:</span>
                    <span className="font-bold text-rose-700">{comparison.routeA.averageRiskScore} / 100</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Peak SAM Exposure:</span>
                    <span className="font-bold text-rose-700">{comparison.routeA.peakRiskScore} / 100</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Terrain Masked Coverage:</span>
                    <span className="font-bold">{comparison.routeA.terrainMaskingPercent}%</span>
                  </div>
                </div>
              </div>

              {/* Route B Card */}
              <div className="p-3 border border-emerald-300 bg-emerald-50/40 rounded-sm">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-bold text-emerald-900 text-xs uppercase">ROUTE B: TACTICAL LOW-LEVEL</span>
                  <span className="px-1.5 py-0.5 text-[10px] bg-emerald-200 text-emerald-900 font-bold">DEFILADE / VALLEY</span>
                </div>
                <div className="space-y-1.5 text-[11px] text-emerald-950">
                  <div className="flex justify-between">
                    <span>Total Flight Distance:</span>
                    <span className="font-bold">{comparison.routeB.totalDistanceKm} km</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Flight Time:</span>
                    <span className="font-bold">{comparison.routeB.totalFlightTimeMinutes} min</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Planned Fuel Burn:</span>
                    <span className="font-bold">{comparison.routeB.totalFuelBurnKg} kg</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Average Threat Lethality:</span>
                    <span className="font-bold text-emerald-800">{comparison.routeB.averageRiskScore} / 100</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Peak SAM Exposure:</span>
                    <span className="font-bold text-emerald-800">{comparison.routeB.peakRiskScore} / 100</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Terrain Masked Coverage:</span>
                    <span className="font-bold text-emerald-800 font-semibold">{comparison.routeB.terrainMaskingPercent}%</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Differential Trade-Off Matrix */}
            <div className="p-3 bg-surface-container-low border border-outline-variant">
              <div className="font-bold text-primary uppercase text-xs mb-2">
                MISSION TRADE-OFF EVALUATION
              </div>
              <div className="grid grid-cols-4 gap-2 text-center text-[11px]">
                <div className="p-2 bg-surface-container-lowest border border-outline-variant">
                  <div className="text-on-surface-variant text-[10px]">THREAT SURVIVABILITY</div>
                  <div className="text-base font-bold text-emerald-700">+{comparison.riskReductionPercent}%</div>
                  <div className="text-[10px] text-emerald-800 font-semibold">Lower Exposure</div>
                </div>
                <div className="p-2 bg-surface-container-lowest border border-outline-variant">
                  <div className="text-on-surface-variant text-[10px]">RADAR MASKING</div>
                  <div className="text-base font-bold text-emerald-700">+{comparison.maskingAdvantagePercent}%</div>
                  <div className="text-[10px] text-emerald-800 font-semibold">LOS Shadowing</div>
                </div>
                <div className="p-2 bg-surface-container-lowest border border-outline-variant">
                  <div className="text-on-surface-variant text-[10px]">FUEL PENALTY</div>
                  <div className="text-base font-bold text-amber-700">+{comparison.fuelDeltaKg} kg</div>
                  <div className="text-[10px] text-on-surface-variant">+{comparison.fuelDeltaPercent}% burn</div>
                </div>
                <div className="p-2 bg-surface-container-lowest border border-outline-variant">
                  <div className="text-on-surface-variant text-[10px]">TIME PENALTY</div>
                  <div className="text-base font-bold text-amber-700">+{comparison.timeDeltaMinutes} min</div>
                  <div className="text-[10px] text-on-surface-variant">+{comparison.timeDeltaPercent}% transit</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'ELEVATION' && (
          <div className="space-y-3">
            <div className="text-xs text-on-surface-variant">
              Cross-section of flight altitude vs terrain elevation along the mission track. Ground elevation includes 4/3 Earth curvature refraction and mountain ridge defilades.
            </div>
            <div className="w-full bg-[#060a10] border border-outline-variant p-1">
              <canvas
                ref={profileCanvasRef}
                width={760}
                height={260}
                className="w-full h-[260px] block"
              />
            </div>
            <div className="flex items-center justify-between text-[11px] text-on-surface-variant">
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1">
                  <span className="w-3 h-1 bg-[#10b981] inline-block" /> Route B (Terrain Masked)
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-3 h-1 bg-[#00e5ff] border-dashed inline-block" /> Route A (Direct FL300)
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-3 h-2 bg-[#d97706] inline-block" /> Terrain Elevation Profile
                </span>
              </div>
              <div>Min Ground Clearance: {comparison.routeB.minClearanceM}m AGL</div>
            </div>
          </div>
        )}

        {activeTab === 'WAYPOINTS' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-[11px]">
              <thead>
                <tr className="bg-surface-container-low border-b border-outline-variant">
                  <th className="p-1.5 font-bold">WP</th>
                  <th className="p-1.5 font-bold">LAT / LON</th>
                  <th className="p-1.5 font-bold">ALT (MSL)</th>
                  <th className="p-1.5 font-bold">TERRAIN</th>
                  <th className="p-1.5 font-bold">AGL</th>
                  <th className="p-1.5 font-bold">DIST</th>
                  <th className="p-1.5 font-bold">FUEL</th>
                  <th className="p-1.5 font-bold">SAM MASKED</th>
                  <th className="p-1.5 font-bold">RISK</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant">
                {comparison.routeB.waypoints.map((wp, idx) => (
                  <tr key={idx} className="hover:bg-surface-container-low">
                    <td className="p-1.5 font-bold text-primary">{wp.name}</td>
                    <td className="p-1.5">{wp.lat.toFixed(3)}°N, {wp.lon.toFixed(3)}°E</td>
                    <td className="p-1.5">{wp.altM}m</td>
                    <td className="p-1.5 text-amber-700">{wp.terrainAltM}m</td>
                    <td className="p-1.5 font-bold">{wp.clearanceAboveGroundM}m</td>
                    <td className="p-1.5">{wp.cumulativeDistanceKm} km</td>
                    <td className="p-1.5">{wp.cumulativeFuelKg} kg</td>
                    <td className="p-1.5">
                      {wp.isMaskedFromSAMs ? (
                        <span className="text-emerald-700 font-bold">✓ MASKED</span>
                      ) : (
                        <span className="text-rose-700 font-bold">✗ VISIBLE</span>
                      )}
                    </td>
                    <td className="p-1.5 font-bold text-rose-700">{wp.pointRiskScore}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
