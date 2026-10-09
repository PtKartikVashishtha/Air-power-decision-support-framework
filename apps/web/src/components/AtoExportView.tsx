'use client';

import React, { useState, useEffect } from 'react';
import { PlanCOA, FusedOperationalPicture, generateSortieBriefCard } from '@air-power/shared';
import { Download, Copy, Check, FileCode, Printer } from 'lucide-react';

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

  const selectedSortie = currentPlan?.sorties.find((s) => s.sortieId === selectedSortieId) || currentPlan?.sorties[0];

  return (
    <div className="space-y-4 font-mono text-xs">
      {/* Header and Controls */}
      <div className="bg-ops-900 border border-ops-700/60 p-4 rounded-lg flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="text-ops-accent font-bold text-sm flex items-center gap-2">
            <FileCode className="w-4 h-4 text-ops-accent" />
            MILITARY OPERATIONAL EXPORT // ATO &amp; ACO DISSEMINATION
          </div>
          <div className="text-gray-400 text-[11px] mt-0.5">
            USMTF Compliant Message Generator // Pilot Tactical Briefing Cards
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {(['ATO', 'ACO', 'PILOT_CARDS'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-3 py-1.5 rounded transition ${
                activeTab === tab
                  ? 'bg-ops-accent text-ops-950 font-bold'
                  : 'bg-ops-800 text-gray-300 hover:bg-ops-700'
              }`}
            >
              {tab.replace('_', ' ')}
            </button>
          ))}

          <button
            onClick={handleCopy}
            className="bg-ops-800 hover:bg-ops-700 border border-ops-700 text-gray-200 px-3 py-1.5 rounded flex items-center gap-1.5 transition ml-2"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-ops-success" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'COPIED' : 'COPY TEXT'}</span>
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="bg-ops-900 border border-ops-700/60 rounded-lg p-4">
        {activeTab === 'ATO' && (
          <div className="space-y-2">
            <div className="text-gray-400 text-[11px]">
              AUTHENTIC USMTF AIR TASKING ORDER DAY 01 (RAW TRANSMISSION FORMAT):
            </div>
            <pre className="bg-ops-950 border border-ops-800 p-4 rounded text-[11px] text-gray-200 overflow-x-auto max-h-[500px] leading-relaxed whitespace-pre font-mono">
              {atoText || 'Loading ATO document...'}
            </pre>
          </div>
        )}

        {activeTab === 'ACO' && (
          <div className="space-y-2">
            <div className="text-gray-400 text-[11px]">
              AIRSPACE CONTROL ORDER (ACO) SPECIAL INSTRUCTIONS &amp; TRANSIT CORRIDORS:
            </div>
            <pre className="bg-ops-950 border border-ops-800 p-4 rounded text-[11px] text-gray-200 overflow-x-auto max-h-[500px] leading-relaxed whitespace-pre font-mono">
              {acoText || 'Loading ACO document...'}
            </pre>
          </div>
        )}

        {activeTab === 'PILOT_CARDS' && (
          <div className="space-y-3">
            <div className="flex items-center space-x-3">
              <span className="text-gray-400">SELECT SORTIE CARD:</span>
              <select
                value={selectedSortieId || selectedSortie?.sortieId}
                onChange={(e) => setSelectedSortieId(e.target.value)}
                className="bg-ops-800 border border-ops-700 text-gray-200 px-3 py-1.5 rounded text-xs"
              >
                {currentPlan?.sorties.map((s) => (
                  <option key={s.sortieId} value={s.sortieId}>
                    {s.callsign} ({s.sortieId}) - {s.role} - Tail: {s.aircraftTail}
                  </option>
                ))}
              </select>
            </div>

            {selectedSortie && currentPlan && (
              <pre className="bg-ops-950 border border-ops-800 p-4 rounded text-[11px] text-gray-200 overflow-x-auto max-h-[500px] leading-relaxed whitespace-pre font-mono">
                {generateSortieBriefCard(selectedSortie, currentPlan, fusedPicture.bases)}
              </pre>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
