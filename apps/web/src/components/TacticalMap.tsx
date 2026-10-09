'use client';

import React, { useRef, useEffect, useState, useMemo } from 'react';
import {
  FusedOperationalPicture,
  PlanCOA,
  GeoCoord,
  Airbase,
  ThreatIntel,
  TargetRequest,
  Sortie,
  haversineDistanceKm,
  interpolateWaypoint,
} from '@air-power/shared';
import { getTerrainElevationM, ThreatAwareRoutePlanner } from '@air-power/optimizer';
import { OfflineMapLibreCOP } from './OfflineMapLibreCOP';
import { RouteComparisonDrawer } from './RouteComparisonDrawer';

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
  const [viewMode, setViewMode] = useState<'3D_COP' | '2D_RADAR'>('2D_RADAR');
  const [projectorMode, setProjectorMode] = useState(false);
  const [showThreats, setShowThreats] = useState(true);
  const [showCorridors, setShowCorridors] = useState(true);
  const [showRoutes, setShowRoutes] = useState(true);
  const [showTerrainRelief, setShowTerrainRelief] = useState(true);
  const [showRouteInspector, setShowRouteInspector] = useState(false);

  // Time Scrubber State
  const [scrubTimeMinutes, setScrubTimeMinutes] = useState(60);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<1 | 2 | 4>(1);

  // Geographic bounds for theater projection: lat ~ 25.5 to 34.0, lon ~ 70.0 to 81.0
  const minLat = 25.5, maxLat = 34.0;
  const minLon = 70.0, maxLon = 81.0;

  const projectToCanvas = (coord: { lat: number; lon: number; altM?: number }, width: number, height: number) => {
    const x = ((coord.lon - minLon) / (maxLon - minLon)) * (width - 80) + 40;
    const y = (1 - (coord.lat - minLat) / (maxLat - minLat)) * (height - 80) + 40;
    return { x, y };
  };

  // Playback timer for time scrubber
  useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(() => {
      setScrubTimeMinutes((prev) => {
        const next = prev + 1 * playbackSpeed;
        return next > 720 ? 0 : next;
      });
    }, 100);
    return () => clearInterval(interval);
  }, [isPlaying, playbackSpeed]);

  // Compute live active track positions and trails based on scrubbed time
  const activeTracks = useMemo(() => {
    if (!currentPlan?.sorties) return [];
    const tracks: Array<{
      sortieId: string;
      callsign: string;
      role: string;
      coord: GeoCoord;
      headingDeg: number;
      speedKmh: number;
      altitudeM: number;
      trail: GeoCoord[];
    }> = [];

    for (const s of currentPlan.sorties) {
      const wps = s.routeWaypoints;
      if (wps.length < 2) continue;

      // Check if sortie is airborne at scrubTimeMinutes
      const startT = s.depTimeMinutes;
      const landT = s.recoveryTimeMinutes;

      if (scrubTimeMinutes < startT || scrubTimeMinutes > landT) continue;

      const duration = Math.max(1, landT - startT);
      const progress = Math.max(0, Math.min(1, (scrubTimeMinutes - startT) / duration));

      const totalSegs = wps.length - 1;
      const segIndex = Math.min(totalSegs - 1, Math.floor(progress * totalSegs));
      const segFrac = progress * totalSegs - segIndex;

      const p1 = wps[segIndex];
      const p2 = wps[segIndex + 1];
      const currentPos = interpolateWaypoint(p1, p2, segFrac);

      // Construct historical trail points
      const trail: GeoCoord[] = [];
      for (let i = 0; i <= segIndex; i++) {
        trail.push(wps[i]);
      }
      trail.push(currentPos);

      tracks.push({
        sortieId: s.sortieId,
        callsign: s.callsign,
        role: s.role,
        coord: currentPos,
        headingDeg: Math.round(Math.atan2(p2.lon - p1.lon, p2.lat - p1.lat) * (180 / Math.PI)),
        speedKmh: 900,
        altitudeM: currentPos.altM ?? 6000,
        trail,
      });
    }

    return tracks;
  }, [currentPlan, scrubTimeMinutes]);

  // 2D Tactical Radar Canvas Render Loop
  useEffect(() => {
    if (viewMode !== '2D_RADAR') return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let pulsePhase = 0;

    const render = () => {
      pulsePhase += 0.035;
      const width = canvas.width;
      const height = canvas.height;

      // 1. Background (Projector mode vs Standard dark)
      ctx.fillStyle = projectorMode ? '#070b12' : '#04070d';
      ctx.fillRect(0, 0, width, height);

      // 2. Terrain Relief Shading (Valleys vs High Mountain Ridges)
      if (showTerrainRelief) {
        const gridStep = 20;
        for (let py = 40; py < height - 40; py += gridStep) {
          for (let px = 40; px < width - 40; px += gridStep) {
            const lon = minLon + ((px - 40) / (width - 80)) * (maxLon - minLon);
            const lat = maxLat - ((py - 40) / (height - 80)) * (maxLat - minLat);
            const elev = getTerrainElevationM(lat, lon);

            if (elev > 1500) {
              // High mountain ridge shading
              const intensity = Math.min(0.22, (elev - 1500) / 12000);
              ctx.fillStyle = `rgba(180, 83, 9, ${intensity})`;
              ctx.fillRect(px, py, gridStep, gridStep);
            } else if (elev < 300) {
              // Low plain / desert shading
              ctx.fillStyle = 'rgba(30, 58, 138, 0.04)';
              ctx.fillRect(px, py, gridStep, gridStep);
            }
          }
        }
      }

      // 3. Coordinate Graticule Lines
      ctx.strokeStyle = projectorMode ? 'rgba(71, 85, 105, 0.5)' : 'rgba(33, 54, 80, 0.35)';
      ctx.lineWidth = 1;
      ctx.font = '10px monospace';
      ctx.fillStyle = projectorMode ? '#94a3b8' : '#334e68';

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

      // 4. Airspace Corridors & ROZs
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
            ctx.fillStyle = 'rgba(0, 229, 255, 0.07)';
            ctx.strokeStyle = 'rgba(0, 229, 255, 0.6)';
            ctx.setLineDash([5, 4]);
          } else if (zone.type === 'ROZ') {
            ctx.fillStyle = 'rgba(245, 158, 11, 0.08)';
            ctx.strokeStyle = 'rgba(245, 158, 11, 0.7)';
            ctx.setLineDash([6, 3]);
          } else {
            ctx.fillStyle = 'rgba(16, 185, 129, 0.07)';
            ctx.strokeStyle = 'rgba(16, 185, 129, 0.6)';
            ctx.setLineDash([3, 3]);
          }
          ctx.fill();
          ctx.stroke();
          ctx.setLineDash([]);
        }
      }

      // 5. SAM Threat Envelopes (3D Pulsing MEZ Domes)
      if (showThreats && fusedPicture.threats) {
        for (const threat of fusedPicture.threats) {
          if (!threat.active) continue;
          const { x, y } = projectToCanvas(threat.location, width, height);
          const pxPerKm = (width / (maxLon - minLon)) / 95;
          const killRadiusPx = Math.max(16, threat.engagementRadiusKm * pxPerKm);
          const detectRadiusPx = Math.max(26, threat.detectionRadiusKm * pxPerKm);

          // Radar detection ring
          ctx.beginPath();
          ctx.arc(x, y, detectRadiusPx, 0, 2 * Math.PI);
          ctx.strokeStyle = 'rgba(239, 68, 68, 0.25)';
          ctx.lineWidth = 1;
          ctx.stroke();

          // Lethal engagement dome with pulsating radiation
          const pulse = (Math.sin(pulsePhase) + 1) * 0.07;
          ctx.beginPath();
          ctx.arc(x, y, killRadiusPx, 0, 2 * Math.PI);
          ctx.fillStyle = `rgba(239, 68, 68, ${0.13 + pulse})`;
          ctx.fill();
          ctx.strokeStyle = 'rgba(239, 68, 68, 0.85)';
          ctx.lineWidth = 1.5;
          ctx.stroke();

          // Threat center symbol
          ctx.fillStyle = '#ef4444';
          ctx.beginPath();
          ctx.arc(x, y, 4, 0, 2 * Math.PI);
          ctx.fill();

          ctx.fillStyle = '#fca5a5';
          ctx.font = 'bold 9px monospace';
          ctx.fillText(threat.name.split(' ')[0], x + 7, y + 3);
        }
      }

      // 6. Planned Flight Routes
      if (showRoutes && currentPlan?.sorties) {
        for (const s of currentPlan.sorties) {
          if (s.routeWaypoints.length < 2) continue;
          ctx.beginPath();
          const pStart = projectToCanvas(s.routeWaypoints[0], width, height);
          ctx.moveTo(pStart.x, pStart.y);

          for (let i = 1; i < s.routeWaypoints.length; i++) {
            const pt = projectToCanvas(s.routeWaypoints[i], width, height);
            ctx.lineTo(pt.x, pt.y);
          }

          ctx.strokeStyle = s.role === 'AIR_SUPERIORITY'
            ? 'rgba(0, 229, 255, 0.45)'
            : s.role === 'SEAD_DEAD'
            ? 'rgba(245, 158, 11, 0.45)'
            : 'rgba(16, 185, 129, 0.45)';
          ctx.lineWidth = 1.5;
          ctx.setLineDash([4, 4]);
          ctx.stroke();
          ctx.setLineDash([]);
        }
      }

      // 7. Dynamic Track Trails & Airborne Aircraft (60 FPS)
      for (const track of activeTracks) {
        // Draw track trail
        if (track.trail.length > 1) {
          ctx.beginPath();
          const p0 = projectToCanvas(track.trail[0], width, height);
          ctx.moveTo(p0.x, p0.y);
          for (let i = 1; i < track.trail.length; i++) {
            const pi = projectToCanvas(track.trail[i], width, height);
            ctx.lineTo(pi.x, pi.y);
          }
          ctx.strokeStyle = 'rgba(0, 229, 255, 0.8)';
          ctx.lineWidth = 2;
          ctx.stroke();
        }

        // Draw current aircraft symbol (tactical chevron)
        const pos = projectToCanvas(track.coord, width, height);
        ctx.save();
        ctx.translate(pos.x, pos.y);
        ctx.rotate((track.headingDeg * Math.PI) / 180);

        ctx.fillStyle = '#00e5ff';
        ctx.beginPath();
        ctx.moveTo(0, -7);
        ctx.lineTo(5, 6);
        ctx.lineTo(0, 3);
        ctx.lineTo(-5, 6);
        ctx.closePath();
        ctx.fill();
        ctx.restore();

        // Label
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 9px monospace';
        ctx.fillText(`${track.callsign} [${Math.round(track.altitudeM / 1000)}k]`, pos.x + 8, pos.y - 2);
      }

      // 8. Airbases
      if (fusedPicture.bases) {
        for (const b of fusedPicture.bases) {
          const { x, y } = projectToCanvas(b.location, width, height);
          const isClosed = b.currentWeatherStatus === 'CLOSED';

          ctx.fillStyle = isClosed ? '#ef4444' : '#00e5ff';
          ctx.fillRect(x - 5, y - 5, 10, 10);
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 1.5;
          ctx.strokeRect(x - 5, y - 5, 10, 10);

          ctx.fillStyle = isClosed ? '#fca5a5' : '#ffffff';
          ctx.font = 'bold 10px monospace';
          ctx.fillText(`[${b.icao}] ${b.name.replace('Forward Base ', 'FOB ').replace('Tactical Base ', 'TB ')}`, x + 9, y + 4);
        }
      }

      // 9. Targets
      if (fusedPicture.targetRequests) {
        for (const tgt of fusedPicture.targetRequests) {
          const { x, y } = projectToCanvas(tgt.location, width, height);
          ctx.beginPath();
          ctx.arc(x, y, 5.5, 0, 2 * Math.PI);
          ctx.fillStyle = tgt.isTimeSensitive ? '#ec4899' : tgt.priority >= 90 ? '#ef4444' : '#f59e0b';
          ctx.fill();
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 1.5;
          ctx.stroke();

          ctx.fillStyle = '#e2e8f0';
          ctx.font = '9px monospace';
          ctx.fillText(`${tgt.id}`, x + 8, y + 3);
        }
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();
    return () => cancelAnimationFrame(animationFrameId);
  }, [
    viewMode,
    projectorMode,
    fusedPicture,
    currentPlan,
    showThreats,
    showCorridors,
    showRoutes,
    showTerrainRelief,
    activeTracks,
  ]);

  return (
    <div className={`flex flex-col w-full min-w-0 border shadow-xs ${
      projectorMode ? 'bg-[#050810] border-slate-700' : 'bg-surface-container-lowest border-outline-variant'
    }`}>
      {/* Tactical HUD Header */}
      <div className={`flex flex-wrap items-center justify-between gap-2 px-3 py-2 border-b text-xs font-mono ${
        projectorMode ? 'bg-[#0f172a] border-slate-700 text-slate-200' : 'bg-surface-container-low border-outline-variant'
      }`}>
        <div className="flex items-center gap-2">
          <span className="flex h-2 w-2 rounded-full bg-secondary animate-ping" />
          <span className="text-primary font-bold">
            {viewMode === '3D_COP' ? 'MAPLIBRE 3D OFFLINE COP' : 'THEATER TACTICAL COP // 2D RADAR DISPLAY'}
          </span>
          <span className="text-on-surface-variant text-[11px]">
            SECTOR NORTH &amp; WEST (WGS-84 NOTIONAL)
          </span>
        </div>

        {/* View Controls & Toggles */}
        <div className="flex flex-wrap items-center gap-1.5">
          {/* Mode Switch: 3D vs 2D */}
          <button
            onClick={() => setViewMode(viewMode === '3D_COP' ? '2D_RADAR' : '3D_COP')}
            className={`px-2 py-1 text-[11px] font-bold font-mono border transition ${
              viewMode === '3D_COP'
                ? 'bg-secondary text-on-secondary border-secondary'
                : 'bg-surface-container-lowest text-on-surface border-outline-variant hover:bg-surface-container'
            }`}
          >
            {viewMode === '3D_COP' ? '3D COP ACTIVE' : 'SWITCH TO 3D'}
          </button>

          {/* Projector Mode */}
          <button
            onClick={() => setProjectorMode(!projectorMode)}
            className={`px-2 py-1 text-[11px] font-bold font-mono border transition ${
              projectorMode
                ? 'bg-amber-500 text-black border-amber-400'
                : 'bg-surface-container-lowest text-on-surface border-outline-variant'
            }`}
          >
            PROJECTOR MODE
          </button>

          {/* Route Inspector */}
          <button
            onClick={() => setShowRouteInspector(true)}
            className="px-2 py-1 text-[11px] font-bold font-mono border bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100 transition"
          >
            ROUTE A VS B INSPECTOR
          </button>

          {/* Overlays */}
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
            CORRIDORS
          </button>
          <button
            onClick={() => setShowTerrainRelief(!showTerrainRelief)}
            className={`px-2 py-1 text-[11px] font-bold font-mono border transition ${
              showTerrainRelief ? 'bg-amber-50 text-amber-800 border-amber-300' : 'bg-surface-container-lowest text-on-surface-variant border-outline-variant'
            }`}
          >
            RELIEF SHADING
          </button>
        </div>
      </div>

      {/* Main Map Display Area */}
      <div className="relative w-full h-[580px] bg-[#04070d] overflow-hidden">
        {viewMode === '3D_COP' ? (
          <OfflineMapLibreCOP
            fusedPicture={fusedPicture}
            currentPlan={currentPlan}
            timeMinutes={scrubTimeMinutes}
            projectorMode={projectorMode}
            onFallbackTo2D={() => setViewMode('2D_RADAR')}
            onSelectEntity={onSelectEntity}
          />
        ) : (
          <canvas
            ref={canvasRef}
            width={1180}
            height={580}
            className="w-full h-full cursor-crosshair block"
          />
        )}

        {/* Symbology Legend */}
        <div className="absolute bottom-16 left-3 bg-surface-container-lowest/90 backdrop-blur-xs p-2.5 border border-outline-variant text-[11px] font-mono space-y-1 shadow-md max-w-[270px]">
          <div className="text-primary font-bold mb-1 text-[10px] uppercase">SYMBOLOGY LEGEND</div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 bg-cyan-400 border border-white inline-block shrink-0" />
            <span className="text-primary truncate">Operational Airbase (FOB/TB)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block shrink-0" />
            <span className="text-primary truncate">Target Request (&gt;90 Prio)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-4 h-0.5 bg-rose-500 inline-block shrink-0" />
            <span className="text-primary truncate">SAM Engagement Envelope</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-4 h-0.5 bg-emerald-500 inline-block shrink-0" />
            <span className="text-primary truncate">Low-Level Masked Route</span>
          </div>
        </div>

        {/* Sortie Summary Badge */}
        {currentPlan && (
          <div className="absolute top-3 right-3 bg-surface-container-lowest/95 backdrop-blur-xs px-3 py-2 border border-outline-variant text-right font-mono text-xs shadow-md max-w-[340px]">
            <div className="text-secondary font-bold truncate">{currentPlan.name}</div>
            <div className="text-on-surface-variant text-[11px]">
              {currentPlan.sorties.length} Sorties | {activeTracks.length} Airborne at T+{scrubTimeMinutes}m
            </div>
            <div className="text-emerald-800 font-bold text-[11px]">
              Integrity: {currentPlan.kpis.packageIntegrityPercent}% | Zero Violations
            </div>
          </div>
        )}

        {/* Route Inspector Modal Drawer */}
        {showRouteInspector && (
          <div className="absolute inset-0 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 z-50">
            <RouteComparisonDrawer
              bases={fusedPicture.bases}
              targets={fusedPicture.targetRequests}
              threats={fusedPicture.threats}
              onClose={() => setShowRouteInspector(false)}
            />
          </div>
        )}
      </div>

      {/* Time Scrubber Footer Bar */}
      <div className="flex items-center justify-between gap-3 px-4 py-2 bg-surface-container-low border-t border-outline-variant font-mono text-xs">
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className="px-2.5 py-1 bg-primary text-on-primary font-bold hover:bg-primary/90 text-xs"
          >
            {isPlaying ? 'PAUSE' : 'PLAY'}
          </button>
          <button
            onClick={() => setPlaybackSpeed(playbackSpeed === 1 ? 2 : playbackSpeed === 2 ? 4 : 1)}
            className="px-2 py-1 bg-surface-container hover:bg-surface-container-high border border-outline-variant font-bold text-xs"
          >
            {playbackSpeed}x SPEED
          </button>
          <span className="font-bold text-primary ml-1">
            SIM TIME: T+{Math.floor(scrubTimeMinutes / 60)}h {(scrubTimeMinutes % 60).toString().padStart(2, '0')}m ({scrubTimeMinutes} min)
          </span>
        </div>

        {/* Slider */}
        <div className="flex items-center gap-2 flex-1 max-w-xl">
          <span className="text-[10px] text-on-surface-variant">T+0m</span>
          <input
            type="range"
            min={0}
            max={720}
            step={1}
            value={scrubTimeMinutes}
            onChange={(e) => setScrubTimeMinutes(Number(e.target.value))}
            className="w-full accent-secondary cursor-pointer h-1.5 bg-surface-container rounded-lg"
          />
          <span className="text-[10px] text-on-surface-variant">T+720m</span>
        </div>

        <div className="text-[11px] text-on-surface-variant shrink-0">
          <span className="font-bold text-emerald-800">{activeTracks.length}</span> Airborne Tracks Active
        </div>
      </div>
    </div>
  );
};
