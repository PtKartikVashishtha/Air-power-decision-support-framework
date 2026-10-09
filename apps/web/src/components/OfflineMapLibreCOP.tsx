'use client';

import React, { useEffect, useRef, useState } from 'react';
import {
  FusedOperationalPicture,
  PlanCOA,
  Airbase,
  ThreatIntel,
  TargetRequest,
  GeoCoord,
} from '@air-power/shared';

// Dynamically handle MapLibre GL in browser environment
interface OfflineMapLibreCOPProps {
  fusedPicture: FusedOperationalPicture;
  currentPlan: PlanCOA | null;
  timeMinutes: number;
  projectorMode?: boolean;
  onFallbackTo2D: () => void;
  onSelectEntity?: (type: 'BASE' | 'TARGET' | 'THREAT' | 'SORTIE', entity: any) => void;
  selectedRouteComparison?: any;
}

export const OfflineMapLibreCOP: React.FC<OfflineMapLibreCOPProps> = ({
  fusedPicture,
  currentPlan,
  timeMinutes,
  projectorMode = false,
  onFallbackTo2D,
  onSelectEntity,
  selectedRouteComparison,
}) => {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<any>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [webGlSupported, setWebGlSupported] = useState(true);

  // Initialize MapLibre GL with bundled offline GeoJSON data
  useEffect(() => {
    let isMounted = true;

    async function initMap() {
      if (!mapContainerRef.current) return;

      try {
        // Dynamically import MapLibre GL to avoid SSR window issues
        const maplibreglModule: any = await import('maplibre-gl');
        const maplibregl = maplibreglModule.default || maplibreglModule;

        // Check WebGL support
        if (!(maplibregl as any).supported()) {
          console.warn('[MapLibre] WebGL not supported, falling back to 2D Radar Canvas');
          setWebGlSupported(false);
          onFallbackTo2D();
          return;
        }

        // Build offline style spec with dark defense palette
        const offlineStyle: any = {
          version: 8,
          name: 'Offline Tactical Command Theater',
          sources: {},
          layers: [
            {
              id: 'background',
              type: 'background',
              paint: {
                'background-color': projectorMode ? '#0a0f18' : '#050810',
              },
            },
          ],
        };

        const map = new maplibregl.Map({
          container: mapContainerRef.current,
          style: offlineStyle,
          center: [75.5, 30.0], // Center of synthetic theater
          zoom: 5.6,
          pitch: 45, // 3D perspective
          bearing: -10,
          attributionControl: false,
        });

        map.addControl(new maplibregl.NavigationControl({ showCompass: true }), 'top-right');

        map.on('load', () => {
          if (!isMounted) return;
          mapInstanceRef.current = map;
          setMapLoaded(true);
        });

        map.on('error', (e: any) => {
          console.warn('[MapLibre] Map error encountered:', e);
        });
      } catch (err) {
        console.warn('[MapLibre] Failed to initialize WebGL map:', err);
        setWebGlSupported(false);
        onFallbackTo2D();
      }
    }

    initMap();

    return () => {
      isMounted = false;
      if (mapInstanceRef.current) {
        try {
          mapInstanceRef.current.remove();
        } catch (e) {
          // ignore cleanup errors
        }
        mapInstanceRef.current = null;
      }
    };
  }, [onFallbackTo2D, projectorMode]);

  // Update GeoJSON Layers when data changes
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !mapLoaded) return;

    try {
      // 1. Airspace Zones (3D Extruded Volumes)
      const airspaceGeoJson: any = {
        type: 'FeatureCollection',
        features: (fusedPicture.airspaceZones || []).map((zone) => ({
          type: 'Feature',
          properties: {
            id: zone.id,
            name: zone.name,
            type: zone.type,
            height: (zone.upperAltitudeFt || 30000) * 0.3048, // convert ft to meters
            baseHeight: (zone.lowerAltitudeFt || 0) * 0.3048,
            color: zone.type === 'CORRIDOR' ? '#00e5ff' : zone.type === 'ROZ' ? '#f59e0b' : '#10b981',
          },
          geometry: {
            type: 'Polygon',
            coordinates: [
              zone.polygon.map((p) => [p.lon, p.lat]).concat([[zone.polygon[0].lon, zone.polygon[0].lat]]),
            ],
          },
        })),
      };

      if (!map.getSource('airspace-zones')) {
        map.addSource('airspace-zones', {
          type: 'geojson',
          data: airspaceGeoJson,
        });

        map.addLayer({
          id: 'airspace-zones-extrusion',
          type: 'fill-extrusion',
          source: 'airspace-zones',
          paint: {
            'fill-extrusion-color': ['get', 'color'],
            'fill-extrusion-height': ['get', 'height'],
            'fill-extrusion-base': ['get', 'baseHeight'],
            'fill-extrusion-opacity': 0.22,
          },
        });
      } else {
        map.getSource('airspace-zones').setData(airspaceGeoJson);
      }

      // 2. Airbases
      const airbasesGeoJson: any = {
        type: 'FeatureCollection',
        features: (fusedPicture.bases || []).map((b) => ({
          type: 'Feature',
          properties: {
            id: b.id,
            name: b.name,
            icao: b.icao,
            status: b.currentWeatherStatus,
          },
          geometry: {
            type: 'Point',
            coordinates: [b.location.lon, b.location.lat],
          },
        })),
      };

      if (!map.getSource('airbases')) {
        map.addSource('airbases', { type: 'geojson', data: airbasesGeoJson });
        map.addLayer({
          id: 'airbases-points',
          type: 'circle',
          source: 'airbases',
          paint: {
            'circle-radius': 7,
            'circle-color': '#00e5ff',
            'circle-stroke-width': 2,
            'circle-stroke-color': '#ffffff',
          },
        });
      } else {
        map.getSource('airbases').setData(airbasesGeoJson);
      }

      // 3. Threats & SAM Domes
      const threatsGeoJson: any = {
        type: 'FeatureCollection',
        features: (fusedPicture.threats || []).filter((t) => t.active).map((t) => ({
          type: 'Feature',
          properties: {
            id: t.id,
            name: t.name,
            type: t.type,
            radiusKm: t.engagementRadiusKm,
            lethality: t.lethalityScore,
          },
          geometry: {
            type: 'Point',
            coordinates: [t.location.lon, t.location.lat],
          },
        })),
      };

      if (!map.getSource('threats')) {
        map.addSource('threats', { type: 'geojson', data: threatsGeoJson });
        map.addLayer({
          id: 'threats-points',
          type: 'circle',
          source: 'threats',
          paint: {
            'circle-radius': 8,
            'circle-color': '#ef4444',
            'circle-stroke-width': 2,
            'circle-stroke-color': '#ffffff',
          },
        });
      } else {
        map.getSource('threats').setData(threatsGeoJson);
      }

      // 4. Targets
      const targetsGeoJson: any = {
        type: 'FeatureCollection',
        features: (fusedPicture.targetRequests || []).map((tgt) => ({
          type: 'Feature',
          properties: {
            id: tgt.id,
            name: tgt.name,
            priority: tgt.priority,
          },
          geometry: {
            type: 'Point',
            coordinates: [tgt.location.lon, tgt.location.lat],
          },
        })),
      };

      if (!map.getSource('targets')) {
        map.addSource('targets', { type: 'geojson', data: targetsGeoJson });
        map.addLayer({
          id: 'targets-points',
          type: 'circle',
          source: 'targets',
          paint: {
            'circle-radius': 6,
            'circle-color': '#f59e0b',
            'circle-stroke-width': 1.5,
            'circle-stroke-color': '#ffffff',
          },
        });
      } else {
        map.getSource('targets').setData(targetsGeoJson);
      }

      // 5. Route A vs Route B Comparison (if active)
      if (selectedRouteComparison) {
        const routeAGeoJson: any = {
          type: 'Feature',
          properties: { name: 'Route A Direct' },
          geometry: {
            type: 'LineString',
            coordinates: selectedRouteComparison.routeA.waypoints.map((w: any) => [w.lon, w.lat]),
          },
        };

        const routeBGeoJson: any = {
          type: 'Feature',
          properties: { name: 'Route B Terrain Masked' },
          geometry: {
            type: 'LineString',
            coordinates: selectedRouteComparison.routeB.waypoints.map((w: any) => [w.lon, w.lat]),
          },
        };

        if (!map.getSource('route-a-line')) {
          map.addSource('route-a-line', { type: 'geojson', data: routeAGeoJson });
          map.addLayer({
            id: 'route-a-layer',
            type: 'line',
            source: 'route-a-line',
            paint: {
              'line-color': '#00e5ff',
              'line-width': 3,
              'line-dasharray': [2, 2],
            },
          });
        } else {
          map.getSource('route-a-line').setData(routeAGeoJson);
        }

        if (!map.getSource('route-b-line')) {
          map.addSource('route-b-line', { type: 'geojson', data: routeBGeoJson });
          map.addLayer({
            id: 'route-b-layer',
            type: 'line',
            source: 'route-b-line',
            paint: {
              'line-color': '#10b981',
              'line-width': 3.5,
            },
          });
        } else {
          map.getSource('route-b-line').setData(routeBGeoJson);
        }
      }
    } catch (e) {
      console.warn('[MapLibre] Error updating layers:', e);
    }
  }, [fusedPicture, currentPlan, selectedRouteComparison, mapLoaded]);

  if (!webGlSupported) {
    return null;
  }

  return (
    <div className="relative w-full h-[580px] bg-[#050810] overflow-hidden">
      <div ref={mapContainerRef} className="w-full h-full" />

      {/* 3D Map Telemetry Overlay */}
      <div className="absolute top-3 left-3 bg-surface-container-lowest/90 backdrop-blur-xs p-2 border border-outline-variant font-mono text-[10px] space-y-1 z-10">
        <div className="text-secondary font-bold uppercase">MAPLIBRE 3D OFFLINE COP</div>
        <div className="text-on-surface-variant">Pitch: 45° | Bearing: -10° | WGS-84</div>
        <div className="flex items-center gap-2 text-emerald-800 font-semibold">
          <span className="w-2 h-2 rounded-full bg-emerald-700 animate-ping" />
          <span>Extruded Airspace Volumes Active</span>
        </div>
      </div>
    </div>
  );
};
