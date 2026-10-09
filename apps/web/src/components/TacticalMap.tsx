'use client';

import React, { useRef, useEffect, useState } from 'react';
import {
  FusedOperationalPicture,
  PlanCOA,
  GeoCoord,
  Airbase,
  ThreatIntel,
  TargetRequest,
  Sortie,
} from '@air-power/shared';

interface TacticalMapProps {
  fusedPicture: FusedOperationalPicture;
  currentPlan: PlanCOA | null;
  onSelectEntity?: (type: 'BASE' | 'TARGET' | 'THREAT' | 'SORTIE', entity: any) => void;
}

export const TacticalMap: React.FC<TacticalMapProps> = ({
  fusedPicture,
  currentPlan,
  onSelectEntity,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [selectedEntity, setSelectedEntity] = useState<any | null>(null);
  const [showThreats, setShowThreats] = useState(true);
  const [showCorridors, setShowCorridors] = useState(true);
  const [showRoutes, setShowRoutes] = useState(true);
  const [showWeatherOverlay, setShowWeatherOverlay] = useState(true);

  // Geographic bounds for theater projection: lat ~ 25 to 34, lon ~ 70 to 81
  const minLat = 25.5, maxLat = 34.0;
  const minLon = 70.0, maxLon = 81.0;

  const projectToCanvas = (coord: { lat: number; lon: number; altM?: number }, width: number, height: number) => {
    const x = ((coord.lon - minLon) / (maxLon - minLon)) * (width - 80) + 40;
    // Invert Y for canvas
    const y = (1 - (coord.lat - minLat) / (maxLat - minLat)) * (height - 80) + 40;
    return { x, y };
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let pulsePhase = 0;

    const render = () => {
      pulsePhase += 0.03;
      const width = canvas.width;
      const height = canvas.height;

      // 1. Dark tactical background
      ctx.fillStyle = '#080d15';
      ctx.fillRect(0, 0, width, height);

      // 2. Latitude/Longitude Grid Lines
      ctx.strokeStyle = 'rgba(33, 54, 80, 0.4)';
      ctx.lineWidth = 1;
      ctx.font = '10px monospace';
      ctx.fillStyle = '#314e70';

      for (let lat = 26; lat <= 34; lat += 2) {
        const { y } = projectToCanvas({ lat, lon: minLon }, width, height);
        ctx.beginPath();
        ctx.moveTo(40, y);
        ctx.lineTo(width - 40, y);
        ctx.stroke();
        ctx.fillText(`${lat}°N`, 10, y + 3);
      }

      for (let lon = 71; lon <= 80; lon += 2) {
        const { x } = projectToCanvas({ lat: minLat, lon }, width, height);
        ctx.beginPath();
        ctx.moveTo(x, 40);
        ctx.lineTo(x, height - 40);
        ctx.stroke();
        ctx.fillText(`${lon}°E`, x - 12, height - 20);
      }

      // 3. Airspace Corridors & Zones
      if (showCorridors && fusedPicture.airspaceZones) {
        for (const zone of fusedPicture.airspaceZones) {
          if (zone.polygon.length < 3) continue;
          ctx.beginPath();
          const p0 = projectToCanvas(zone.polygon[0], width, height);
          ctx.moveTo(p0.x, p0.y);
          for (let i = 1; i < zone.polygon.length; i++) {
            const pi = projectToCanvas(zone.polygon[i], width, height);
            ctx.lineTo(pi.x, pi.y);
          }
          ctx.closePath();
          if (zone.type === 'CORRIDOR') {
            ctx.fillStyle = 'rgba(0, 229, 255, 0.06)';
            ctx.strokeStyle = 'rgba(0, 229, 255, 0.5)';
            ctx.setLineDash([4, 4]);
          } else if (zone.type === 'ROZ') {
            ctx.fillStyle = 'rgba(255, 179, 0, 0.08)';
            ctx.strokeStyle = 'rgba(255, 179, 0, 0.6)';
            ctx.setLineDash([6, 3]);
          } else {
            ctx.fillStyle = 'rgba(0, 230, 118, 0.06)';
            ctx.strokeStyle = 'rgba(0, 230, 118, 0.5)';
            ctx.setLineDash([2, 2]);
          }
          ctx.fill();
          ctx.stroke();
          ctx.setLineDash([]);
        }
      }

      // 4. SAM Threat Envelopes (Pulsing radar domes)
      if (showThreats && fusedPicture.threats) {
        for (const threat of fusedPicture.threats) {
          if (!threat.active) continue;
          const { x, y } = projectToCanvas(threat.location, width, height);

          // Convert km radius to pixels approximately
          const pxPerKm = (width / (maxLon - minLon)) / 95;
          const killRadiusPx = Math.max(15, threat.engagementRadiusKm * pxPerKm);
          const detectRadiusPx = Math.max(25, threat.detectionRadiusKm * pxPerKm);

          // Outer detection ring
          ctx.beginPath();
          ctx.arc(x, y, detectRadiusPx, 0, 2 * Math.PI);
          ctx.strokeStyle = 'rgba(255, 51, 75, 0.2)';
          ctx.lineWidth = 1;
          ctx.stroke();

          // Lethal engagement dome with pulse
          const pulse = (Math.sin(pulsePhase) + 1) * 0.08;
          ctx.beginPath();
          ctx.arc(x, y, killRadiusPx, 0, 2 * Math.PI);
          ctx.fillStyle = `rgba(255, 51, 75, ${0.12 + pulse})`;
          ctx.fill();
          ctx.strokeStyle = 'rgba(255, 51, 75, 0.85)';
          ctx.lineWidth = 1.5;
          ctx.stroke();

          // Threat center icon
          ctx.fillStyle = '#ff334b';
          ctx.beginPath();
          ctx.arc(x, y, 4, 0, 2 * Math.PI);
          ctx.fill();

          ctx.fillStyle = '#ff8090';
          ctx.font = '9px monospace';
          ctx.fillText(threat.type === 'LONG_RANGE_SAM' ? 'SAM S-400' : 'SAM HQ-16', x + 8, y + 3);
        }
      }

      // 5. Active Sortie Flight Routes (Curved or waypoint paths)
      if (showRoutes && currentPlan?.sorties) {
        const baseMap = new Map(fusedPicture.bases.map((b) => [b.id, b]));
        for (const s of currentPlan.sorties) {
          const origin = baseMap.get(s.originBaseId);
          if (!origin || s.routeWaypoints.length < 2) continue;

          ctx.beginPath();
          const pStart = projectToCanvas(s.routeWaypoints[0], width, height);
          ctx.moveTo(pStart.x, pStart.y);

          for (let i = 1; i < s.routeWaypoints.length; i++) {
            const pt = projectToCanvas(s.routeWaypoints[i], width, height);
            ctx.lineTo(pt.x, pt.y);
          }

          if (s.role === 'SEAD_DEAD') {
            ctx.strokeStyle = 'rgba(255, 179, 0, 0.65)';
          } else if (s.role === 'AIR_SUPERIORITY') {
            ctx.strokeStyle = 'rgba(0, 229, 255, 0.7)';
          } else {
            ctx.strokeStyle = 'rgba(0, 230, 118, 0.7)';
          }

          ctx.lineWidth = s.isFrozen ? 2.5 : 1.5;
          ctx.setLineDash(s.isFrozen ? [] : [5, 4]);
          ctx.stroke();
          ctx.setLineDash([]);
        }
      }

      // 6. Airbases
      if (fusedPicture.bases) {
        for (const b of fusedPicture.bases) {
          const { x, y } = projectToCanvas(b.location, width, height);

          // Base symbol: square with runway orientation
          const isClosed = b.currentWeatherStatus === 'CLOSED';
          ctx.fillStyle = isClosed ? '#ff334b' : '#00e5ff';
          ctx.fillRect(x - 5, y - 5, 10, 10);

          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 1.5;
          ctx.strokeRect(x - 5, y - 5, 10, 10);

          ctx.fillStyle = isClosed ? '#ff8090' : '#ffffff';
          ctx.font = 'bold 10px monospace';
          ctx.fillText(`${b.name.replace('Forward Base ', 'FOB ').replace('Tactical Base ', 'TB ')} [${b.icao}]`, x + 9, y + 4);

          if (isClosed) {
            ctx.fillStyle = '#ff334b';
            ctx.font = 'bold 9px monospace';
            ctx.fillText('RUNWAY CLOSED', x + 9, y + 16);
          }
        }
      }

      // 7. Tactical Targets
      if (fusedPicture.targetRequests) {
        for (const tgt of fusedPicture.targetRequests) {
          const { x, y } = projectToCanvas(tgt.location, width, height);

          ctx.beginPath();
          ctx.arc(x, y, 6, 0, 2 * Math.PI);
          ctx.fillStyle = tgt.isTimeSensitive ? '#ff0055' : tgt.priority >= 90 ? '#ff334b' : '#ffb300';
          ctx.fill();
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 1.5;
          ctx.stroke();

          // Target label
          ctx.fillStyle = tgt.isTimeSensitive ? '#ff4081' : '#e2e8f0';
          ctx.font = '9px monospace';
          ctx.fillText(`${tgt.id} (P:${tgt.priority})`, x + 9, y - 2);
        }
      }

      // Radar scanline circle in corner
      ctx.strokeStyle = 'rgba(0, 229, 255, 0.2)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(width - 50, 50, 30, 0, 2 * Math.PI);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(width - 50, 20);
      ctx.lineTo(width - 50, 80);
      ctx.moveTo(width - 80, 50);
      ctx.lineTo(width - 20, 50);
      ctx.stroke();

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [fusedPicture, currentPlan, showThreats, showCorridors, showRoutes]);

  return (
    <div className="flex flex-col w-full min-w-0 border border-outline-variant bg-surface-container-lowest shadow-xs">
      {/* Tactical HUD Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 bg-surface-container-low border-b border-outline-variant text-xs font-mono">
        <div className="flex items-center gap-2">
          <span className="flex h-2 w-2 rounded-full bg-secondary animate-ping" />
          <span className="text-primary font-bold">THEATER TACTICAL COP // 2D RADAR DISPLAY</span>
          <span className="text-on-surface-variant text-[11px]">SECTOR NORTH &amp; WEST (WGS-84 NOTIONAL)</span>
        </div>

        {/* Map Overlays Toggle */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setShowThreats(!showThreats)}
            className={`px-2 py-1 text-[11px] font-bold font-mono border transition ${
              showThreats ? 'bg-rose-50 text-rose-800 border-rose-300' : 'bg-surface-container-lowest text-on-surface-variant border-outline-variant'
            }`}
          >
            SAM DOMES
          </button>
          <button
            onClick={() => setShowCorridors(!showCorridors)}
            className={`px-2 py-1 text-[11px] font-bold font-mono border transition ${
              showCorridors ? 'bg-secondary-fixed text-on-secondary-fixed border-secondary' : 'bg-surface-container-lowest text-on-surface-variant border-outline-variant'
            }`}
          >
            ACO CORRIDORS
          </button>
          <button
            onClick={() => setShowRoutes(!showRoutes)}
            className={`px-2 py-1 text-[11px] font-bold font-mono border transition ${
              showRoutes ? 'bg-emerald-50 text-emerald-800 border-emerald-300' : 'bg-surface-container-lowest text-on-surface-variant border-outline-variant'
            }`}
          >
            SORTIE TRACKS
          </button>
        </div>
      </div>

      {/* Interactive Map Canvas */}
      <div className="relative w-full h-[580px] bg-[#080d15] overflow-hidden">
        <canvas
          ref={canvasRef}
          width={1180}
          height={580}
          className="w-full h-full cursor-crosshair block"
        />

        {/* Tactical Legend Overlay */}
        <div className="absolute bottom-3 left-3 bg-surface-container-lowest/95 backdrop-blur-sm p-2.5 border border-outline-variant text-[11px] font-mono space-y-1 shadow-md max-w-[280px]">
          <div className="text-primary font-bold mb-1 text-[10px] uppercase">SYMBOLOGY LEGEND</div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 bg-secondary border border-primary inline-block shrink-0" />
            <span className="text-primary truncate">Operational Airbase (FOB/TB)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-600 inline-block shrink-0" />
            <span className="text-primary truncate">High-Threat Target (&gt;90 Prio)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-pink-600 animate-pulse inline-block shrink-0" />
            <span className="text-primary truncate">Time-Sensitive Target (TST)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-4 h-0.5 bg-rose-600 inline-block shrink-0" />
            <span className="text-primary truncate">SAM Engagement Envelope</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-4 h-0.5 bg-emerald-600 border-dashed inline-block shrink-0" />
            <span className="text-primary truncate">Strike Ingress Track</span>
          </div>
        </div>

        {/* Sortie Summary Badge */}
        {currentPlan && (
          <div className="absolute top-3 right-3 bg-surface-container-lowest/95 backdrop-blur-sm px-3 py-2 border border-outline-variant text-right font-mono text-xs shadow-md max-w-[340px]">
            <div className="text-secondary font-bold truncate">{currentPlan.name}</div>
            <div className="text-on-surface-variant text-[11px]">
              {currentPlan.sorties.length} Sorties Planned | {currentPlan.kpis.coveredTargetsCount} Targets Assigned
            </div>
            <div className="text-emerald-800 font-bold text-[11px]">
              Integrity: {currentPlan.kpis.packageIntegrityPercent}% | Violations: {currentPlan.kpis.hardConstraintViolations}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
