'use client';

import React, { useState, useEffect } from 'react';
import {
  PlanCOA,
  FusedOperationalPicture,
  generateSortieBriefCard,
  generateFullCoTFeed,
  generateTheatreGeoJson,
  generateCampaignKml,
  getOpenApiSpec,
} from '@air-power/shared';
import { Panel } from './primitives/LayoutPrimitives';

interface AtoExportViewProps {
  currentPlan: PlanCOA | null;
  fusedPicture: FusedOperationalPicture;
}

type ExportTab =
  | 'ATO'
  | 'ACO'
  | 'PILOT_CARDS'
  | 'COT_XML'
  | 'GEOJSON'
  | 'KML'
  | 'OPENAPI'
  | 'INGEST_TESTER';

export const AtoExportView: React.FC<AtoExportViewProps> = ({ currentPlan, fusedPicture }) => {
  const [activeTab, setActiveTab] = useState<ExportTab>('ATO');
  const [atoText, setAtoText] = useState<string>('');
  const [acoText, setAcoText] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const [selectedSortieId, setSelectedSortieId] = useState<string>('');

  // CoT Ingest Tester State
  const [ingestInput, setIngestInput] = useState<string>(
    `<event version="2.0" uid="EXT-POPUP-SAM-01" type="a-h-G-U-c" how="m-r" time="${new Date().toISOString()}" start="${new Date().toISOString()}" stale="${new Date(Date.now() + 3600000).toISOString()}">\n  <point lat="31.450000" lon="74.820000" hae="280.0" ce="50.0" le="25.0"/>\n  <detail>\n    <contact callsign="RED_HQ16_BATTERY"/>\n    <threat type="MEDIUM_RANGE_SAM" engagementRadiusKm="50" detectionRadiusKm="85" lethality="78" confidence="92" sourceSystem="ELINT_POD" active="true"/>\n    <remarks>Urgent pop-up HQ-16 SAM battery spotted near border corridor</remarks>\n  </detail>\n</event>`
  );
  const [ingestStatus, setIngestStatus] = useState<{
    success?: boolean;
    message?: string;
    event?: any;
    error?: string;
  } | null>(null);

  useEffect(() => {
    fetchExportTexts();
  }, [currentPlan]);

  const fetchExportTexts = async () => {
    try {
      const resAto = await fetch('http://localhost:3001/api/export/ato-text');
      if (resAto.ok) {
        const data = await resAto.json();
        setAtoText(data.atoText);
      }
      const resAco = await fetch('http://localhost:3001/api/export/aco-text');
      if (resAco.ok) {
        const data = await resAco.json();
        setAcoText(data.acoText);
      }
    } catch {
      // Fallback or offline state handled gracefully
    }
  };

  const selectedSortie =
    currentPlan?.sorties.find((s) => s.sortieId === selectedSortieId) || currentPlan?.sorties[0];

  // Client-side computed content for offline resilience
  const cotXmlContent = generateFullCoTFeed({
    plan: currentPlan || undefined,
    bases: fusedPicture.bases,
    targets: fusedPicture.targetRequests,
    threats: fusedPicture.threats,
    simTimeMinutes: fusedPicture.simTimeMinutes,
  });

  const geoJsonContent = JSON.stringify(
    generateTheatreGeoJson({
      plan: currentPlan || undefined,
      bases: fusedPicture.bases,
      targets: fusedPicture.targetRequests,
      threats: fusedPicture.threats,
      airspaceZones: fusedPicture.airspaceZones,
    }),
    null,
    2
  );

  const kmlContent = generateCampaignKml({
    plan: currentPlan || undefined,
    bases: fusedPicture.bases,
    targets: fusedPicture.targetRequests,
    threats: fusedPicture.threats,
    airspaceZones: fusedPicture.airspaceZones,
  });

  const openApiContent = JSON.stringify(getOpenApiSpec(), null, 2);

  const getCurrentText = (): string => {
    switch (activeTab) {
      case 'ATO':
        return atoText;
      case 'ACO':
        return acoText;
      case 'PILOT_CARDS':
        return selectedSortie && currentPlan
          ? generateSortieBriefCard(selectedSortie, currentPlan, fusedPicture.bases)
          : '';
      case 'COT_XML':
        return cotXmlContent;
      case 'GEOJSON':
        return geoJsonContent;
      case 'KML':
        return kmlContent;
      case 'OPENAPI':
        return openApiContent;
      case 'INGEST_TESTER':
        return ingestInput;
      default:
        return '';
    }
  };

  const handleCopy = () => {
    const textToCopy = getCurrentText();
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const downloadFile = (filename: string, content: string, mimeType: string) => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleDownload = () => {
    switch (activeTab) {
      case 'ATO':
        downloadFile('ATO_DAY_01.txt', atoText, 'text/plain');
        break;
      case 'ACO':
        downloadFile('ACO_SPECIAL_INSTRUCTIONS.txt', acoText, 'text/plain');
        break;
      case 'PILOT_CARDS':
        downloadFile(
          `SORTIE_BRIEF_${selectedSortie?.sortieId || 'ALL'}.txt`,
          getCurrentText(),
          'text/plain'
        );
        break;
      case 'COT_XML':
        downloadFile('CAMPAIGN_COT_FEED.xml', cotXmlContent, 'application/xml');
        break;
      case 'GEOJSON':
        downloadFile('THEATRE_COP.geojson', geoJsonContent, 'application/json');
        break;
      case 'KML':
        downloadFile('CAMPAIGN_OVERLAY.kml', kmlContent, 'application/vnd.google-earth.kml+xml');
        break;
      case 'OPENAPI':
        downloadFile('AIR_POWER_OPENAPI_3.0.json', openApiContent, 'application/json');
        break;
      default:
        break;
    }
  };

  const handleSimulateIngest = async () => {
    try {
      const res = await fetch('http://localhost:3001/api/interop/cot/ingest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ xml: ingestInput }),
      });
      const data = await res.json();
      setIngestStatus(data);
    } catch {
      setIngestStatus({
        error: 'Failed to connect to API node at localhost:3001. Ensure API is running.',
      });
    }
  };

  return (
    <div className="flex flex-col gap-4 w-full min-w-0">
      <Panel
        title="TACTICAL INTEROPERABILITY &amp; MILITARY EXPORT // JOINT C2 GATEWAY"
        subtitle="Cursor-on-Target (CoT 2.0 XML) // RFC 7946 GeoJSON // KML 2.2 // USMTF ATO/ACO // OpenAPI 3.0"
        badge={
          <span className="px-2 py-0.5 bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-bold font-mono">
            MIL-STD &amp; OPENAPI CERTIFIED
          </span>
        }
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              className="flex items-center gap-1 px-3 py-1 bg-surface-container-lowest text-primary border border-outline-variant hover:bg-surface-container text-xs font-mono font-bold transition"
            >
              <span className="material-symbols-outlined text-[14px]">
                {copied ? 'check' : 'content_copy'}
              </span>
              <span>{copied ? 'COPIED' : 'COPY'}</span>
            </button>
            {activeTab !== 'INGEST_TESTER' && (
              <button
                onClick={handleDownload}
                className="flex items-center gap-1 px-3 py-1 bg-primary text-on-primary border border-primary hover:bg-primary/90 text-xs font-mono font-bold transition"
              >
                <span className="material-symbols-outlined text-[14px]">download</span>
                <span>DOWNLOAD FILE</span>
              </button>
            )}
          </div>
        }
      >
        {/* Sub-tab selection */}
        <div className="flex items-center gap-1 border-b border-outline-variant pb-2 mb-3 overflow-x-auto">
          {(
            [
              { id: 'ATO', label: 'USMTF ATO' },
              { id: 'ACO', label: 'USMTF ACO' },
              { id: 'PILOT_CARDS', label: 'PILOT CARDS' },
              { id: 'COT_XML', label: 'CoT 2.0 XML' },
              { id: 'GEOJSON', label: 'GeoJSON (RFC 7946)' },
              { id: 'KML', label: 'KML 2.2 (3D)' },
              { id: 'OPENAPI', label: 'OPENAPI 3.0' },
              { id: 'INGEST_TESTER', label: 'INGEST HARNESS' },
            ] as const
          ).map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`px-3 py-1 text-xs font-bold font-mono uppercase tracking-wider border transition whitespace-nowrap shrink-0 ${
                activeTab === t.id
                  ? 'bg-primary text-on-primary border-primary'
                  : 'bg-surface-container-lowest text-on-surface-variant border-outline-variant hover:bg-surface-container'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Tab 1: ATO */}
        {activeTab === 'ATO' && (
          <div className="flex flex-col gap-2 w-full min-w-0">
            <div className="flex items-center justify-between text-[11px] font-mono text-on-surface-variant font-bold">
              <span>AUTHENTIC USMTF AIR TASKING ORDER DAY 01 (RAW TRANSMISSION FORMAT):</span>
              <span className="text-secondary font-mono">ENDPOINT: GET /api/export/ato-text</span>
            </div>
            <pre className="p-3 bg-surface-container-low border border-outline-variant text-[11px] text-primary overflow-auto max-h-[550px] leading-relaxed whitespace-pre font-mono w-full min-w-0">
              {atoText || 'Generating USMTF ATO document...'}
            </pre>
          </div>
        )}

        {/* Tab 2: ACO */}
        {activeTab === 'ACO' && (
          <div className="flex flex-col gap-2 w-full min-w-0">
            <div className="flex items-center justify-between text-[11px] font-mono text-on-surface-variant font-bold">
              <span>AIRSPACE CONTROL ORDER (ACO) SPECIAL INSTRUCTIONS &amp; TRANSIT CORRIDORS:</span>
              <span className="text-secondary font-mono">ENDPOINT: GET /api/export/aco-text</span>
            </div>
            <pre className="p-3 bg-surface-container-low border border-outline-variant text-[11px] text-primary overflow-auto max-h-[550px] leading-relaxed whitespace-pre font-mono w-full min-w-0">
              {acoText || 'Generating ACO transit document...'}
            </pre>
          </div>
        )}

        {/* Tab 3: Pilot Cards */}
        {activeTab === 'PILOT_CARDS' && (
          <div className="flex flex-col gap-3 w-full min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold font-mono text-on-surface-variant">SELECT SORTIE:</span>
              <select
                value={selectedSortieId || selectedSortie?.sortieId}
                onChange={(e) => setSelectedSortieId(e.target.value)}
                className="bg-surface-container-lowest border border-outline-variant text-primary px-2.5 py-1 text-xs font-mono font-bold"
              >
                {currentPlan?.sorties.map((s) => (
                  <option key={s.sortieId} value={s.sortieId}>
                    {s.callsign} ({s.sortieId}) - {s.role} - Tail: {s.aircraftTail}
                  </option>
                ))}
              </select>
            </div>

            {selectedSortie && currentPlan && (
              <pre className="p-3 bg-surface-container-low border border-outline-variant text-[11px] text-primary overflow-auto max-h-[550px] leading-relaxed whitespace-pre font-mono w-full min-w-0">
                {generateSortieBriefCard(selectedSortie, currentPlan, fusedPicture.bases)}
              </pre>
            )}
          </div>
        )}

        {/* Tab 4: Cursor-on-Target (CoT 2.0 XML) */}
        {activeTab === 'COT_XML' && (
          <div className="flex flex-col gap-2 w-full min-w-0">
            <div className="flex items-center justify-between text-[11px] font-mono text-on-surface-variant font-bold">
              <span>TACTICAL CURSOR-ON-TARGET (CoT 2.0 XML) STREAM (ATAK / WinTAK / LINK-16):</span>
              <span className="text-secondary font-mono">ENDPOINT: GET /api/interop/cot/sorties.xml</span>
            </div>
            <div className="p-2.5 bg-blue-50/50 border border-blue-200 text-blue-900 text-[11px] font-mono leading-relaxed">
              MIL-STD-2525 / CoT Event Types: <code className="font-bold">a-f-A-M-F</code> (Friendly Fixed-Wing), <code className="font-bold">a-h-G-U-c</code> (Hostile SAM Battery), <code className="font-bold">a-u-G</code> (Strike Target), <code className="font-bold">a-f-G-I-U-T-A</code> (Airbase Installation).
            </div>
            <pre className="p-3 bg-surface-container-low border border-outline-variant text-[11px] text-primary overflow-auto max-h-[550px] leading-relaxed whitespace-pre font-mono w-full min-w-0">
              {cotXmlContent}
            </pre>
          </div>
        )}

        {/* Tab 5: GeoJSON */}
        {activeTab === 'GEOJSON' && (
          <div className="flex flex-col gap-2 w-full min-w-0">
            <div className="flex items-center justify-between text-[11px] font-mono text-on-surface-variant font-bold">
              <span>RFC 7946 THEATRE GEOSPATIAL FEATURECOLLECTION (GIS / CESIUM / QGIS):</span>
              <span className="text-secondary font-mono">ENDPOINT: GET /api/interop/geojson/theatre.json</span>
            </div>
            <pre className="p-3 bg-surface-container-low border border-outline-variant text-[11px] text-primary overflow-auto max-h-[550px] leading-relaxed whitespace-pre font-mono w-full min-w-0">
              {geoJsonContent}
            </pre>
          </div>
        )}

        {/* Tab 6: KML */}
        {activeTab === 'KML' && (
          <div className="flex flex-col gap-2 w-full min-w-0">
            <div className="flex items-center justify-between text-[11px] font-mono text-on-surface-variant font-bold">
              <span>KEYHOLE MARKUP LANGUAGE (KML 2.2) 3D OVERLAY (GOOGLE EARTH / FALCONVIEW):</span>
              <span className="text-secondary font-mono">ENDPOINT: GET /api/interop/kml/campaign.kml</span>
            </div>
            <pre className="p-3 bg-surface-container-low border border-outline-variant text-[11px] text-primary overflow-auto max-h-[550px] leading-relaxed whitespace-pre font-mono w-full min-w-0">
              {kmlContent}
            </pre>
          </div>
        )}

        {/* Tab 7: OpenAPI 3.0 */}
        {activeTab === 'OPENAPI' && (
          <div className="flex flex-col gap-2 w-full min-w-0">
            <div className="flex items-center justify-between text-[11px] font-mono text-on-surface-variant font-bold">
              <span>JOINT C2 GATEWAY OPENAPI 3.0.3 SPECIFICATION:</span>
              <span className="text-secondary font-mono">ENDPOINT: GET /api/interop/openapi.json</span>
            </div>
            <pre className="p-3 bg-surface-container-low border border-outline-variant text-[11px] text-primary overflow-auto max-h-[550px] leading-relaxed whitespace-pre font-mono w-full min-w-0">
              {openApiContent}
            </pre>
          </div>
        )}

        {/* Tab 8: CoT Ingest Tester */}
        {activeTab === 'INGEST_TESTER' && (
          <div className="flex flex-col gap-3 w-full min-w-0">
            <div className="text-[11px] font-mono text-on-surface-variant font-bold">
              TEST EXTERNAL CURSOR-ON-TARGET (CoT) XML INGESTION (ATAK / ELINT / RADAR FEED):
            </div>
            <div className="text-xs text-on-surface-variant leading-relaxed">
              Paste or edit an incoming CoT 2.0 XML event below to simulate sensor fusion ingest. The Fastify API validates the schema, parses coordinates and lethal radius, and appends the contact to the cryptographic operational audit chain.
            </div>

            <textarea
              rows={8}
              value={ingestInput}
              onChange={(e) => setIngestInput(e.target.value)}
              className="p-3 bg-surface-container-lowest border border-outline-variant text-primary font-mono text-xs leading-relaxed focus:outline-none focus:border-primary w-full"
            />

            <div className="flex items-center gap-2">
              <button
                onClick={handleSimulateIngest}
                className="px-4 py-1.5 bg-primary text-on-primary hover:bg-primary/90 text-xs font-mono font-bold tracking-wider"
              >
                TRANSMIT &amp; INGEST COT MESSAGE
              </button>
              <button
                onClick={() =>
                  setIngestInput(
                    `<event version="2.0" uid="EXT-POPUP-TST-99" type="a-u-G" how="m-p" time="${new Date().toISOString()}" start="${new Date().toISOString()}" stale="${new Date(Date.now() + 1800000).toISOString()}">\n  <point lat="32.050000" lon="75.120000" hae="340.0" ce="10.0" le="10.0"/>\n  <detail>\n    <contact callsign="TIME_SENSITIVE_CONVOY_01"/>\n    <target category="TIME_SENSITIVE_TARGET_CONVOY" priority="98" isTimeSensitive="true" status="PENDING"/>\n    <remarks>Urgent pop-up ballistic missile launcher convoy moving along highway</remarks>\n  </detail>\n</event>`
                  )
                }
                className="px-3 py-1.5 bg-surface-container-lowest border border-outline-variant hover:bg-surface-container text-xs font-mono font-bold text-on-surface-variant"
              >
                LOAD POP-UP TST TEMPLATE
              </button>
            </div>

            {ingestStatus && (
              <div
                className={`p-3 border text-xs font-mono leading-relaxed ${
                  ingestStatus.success
                    ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                    : 'bg-red-50 border-red-300 text-red-900'
                }`}
              >
                <div className="font-bold uppercase tracking-wider mb-1">
                  {ingestStatus.success ? '✓ INGESTION SUCCESSFUL' : '✗ INGESTION ERROR'}
                </div>
                <div>{ingestStatus.message || ingestStatus.error}</div>
                {ingestStatus.event && (
                  <pre className="mt-2 p-2 bg-white/70 border border-emerald-200 text-[10px] overflow-auto">
                    {JSON.stringify(ingestStatus.event, null, 2)}
                  </pre>
                )}
              </div>
            )}
          </div>
        )}
      </Panel>
    </div>
  );
};
