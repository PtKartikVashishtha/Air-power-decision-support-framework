'use client';

import React, { useState, useEffect } from 'react';
import { PlanCOA, FusedOperationalPicture, generateSortieBriefCard } from '@air-power/shared';
import { Panel, ScrollArea } from './primitives/LayoutPrimitives';

interface AtoExportViewProps {
  currentPlan: PlanCOA | null;
  fusedPicture: FusedOperationalPicture;
}

export const AtoExportView: React.FC<AtoExportViewProps> = ({ currentPlan, fusedPicture }) => {
  const [activeTab, setActiveTab] = useState<'ATO' | 'ACO' | 'PILOT_CARDS'>('ATO');
  const [atoText, setAtoText] = useState<string>('');
  const [acoText, setAcoText] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const [selectedSortieId, setSelectedSortieId] = useState<string>('');

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
    } catch (err) {
      console.error('Failed to fetch exports', err);
    }
  };

  const selectedSortie = currentPlan?.sorties.find((s) => s.sortieId === selectedSortieId) || currentPlan?.sorties[0];

  const handleCopy = () => {
    const textToCopy =
      activeTab === 'ATO'
        ? atoText
        : activeTab === 'ACO'
        ? acoText
        : selectedSortie
        ? generateSortieBriefCard(selectedSortie, currentPlan!, fusedPicture.bases)
        : '';
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex flex-col gap-4 w-full min-w-0">
      <Panel
        title="MILITARY OPERATIONAL EXPORT // ATO & ACO DISSEMINATION"
        subtitle="USMTF Compliant Message Generator // Pilot Tactical Briefing Cards"
        badge={
          <span className="px-2 py-0.5 bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-bold font-mono">
            USMTF DRAFT 4.2
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
              <span>{copied ? 'COPIED' : 'COPY TEXT'}</span>
            </button>
          </div>
        }
      >
        {/* Sub-tab selection */}
        <div className="flex items-center gap-1 border-b border-outline-variant pb-2 mb-3 overflow-x-auto">
          {(['ATO', 'ACO', 'PILOT_CARDS'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-3 py-1 text-xs font-bold font-mono uppercase tracking-wider border transition whitespace-nowrap shrink-0 ${
                activeTab === tab
                  ? 'bg-primary text-on-primary border-primary'
                  : 'bg-surface-container-lowest text-on-surface-variant border-outline-variant hover:bg-surface-container'
              }`}
            >
              {tab.replace('_', ' ')}
            </button>
          ))}
        </div>

        {/* Tab 1: ATO */}
        {activeTab === 'ATO' && (
          <div className="flex flex-col gap-2 w-full min-w-0">
            <div className="text-[11px] font-mono text-on-surface-variant font-bold">
              AUTHENTIC USMTF AIR TASKING ORDER DAY 01 (RAW TRANSMISSION FORMAT):
            </div>
            <pre className="p-3 bg-surface-container-low border border-outline-variant text-[11px] text-primary overflow-auto max-h-[550px] leading-relaxed whitespace-pre font-mono w-full min-w-0">
              {atoText || 'Generating USMTF ATO document...'}
            </pre>
          </div>
        )}

        {/* Tab 2: ACO */}
        {activeTab === 'ACO' && (
          <div className="flex flex-col gap-2 w-full min-w-0">
            <div className="text-[11px] font-mono text-on-surface-variant font-bold">
              AIRSPACE CONTROL ORDER (ACO) SPECIAL INSTRUCTIONS &amp; TRANSIT CORRIDORS:
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
      </Panel>
    </div>
  );
};
