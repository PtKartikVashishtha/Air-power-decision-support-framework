'use client';

import React from 'react';
import { X, BookOpen, Shield, AlertCircle, FileCheck, CheckCircle2 } from 'lucide-react';

interface AssumptionsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AssumptionsDoctrineModal: React.FC<AssumptionsModalProps> = ({
  isOpen,
  onClose,
}) => {
  if (!isOpen) return null;

  const assumptions = [
    {
      category: 'DATA & CLASSIFICATION DOCTRINE',
      badge: 'STRICTLY UNCLASSIFIED',
      items: [
        'All geospatial coordinates, airbase locations, and threat sites are purely synthetic and notional.',
        'Aircraft weapon loadouts, radar cross sections, and missile launch envelopes are based strictly on open-source literature (Jane\'s All the World\'s Aircraft, public defence whitepapers).',
        'Pilot callsigns, squadron identifiers, and maintenance serials are procedural mocks generated at runtime.',
      ],
    },
    {
      category: 'TEMPORAL & SORTIE GENERATION (SGR)',
      badge: 'MULTI-WAVE ATO',
      items: [
        'Planning horizon is divided into a 24-hour ATO day (H+00:00 to H+24:00) with wave-based sortie generation.',
        'Aircraft turnaround times enforce minimum re-arm, refuel, and inspection windows (45 mins for Light Combat Aircraft, 60 mins for Medium/Heavy Multirole Fighters).',
        'Pilot duty cycles strictly enforce mandatory 8-hour crew rest after maximum 8 cumulative combat flight hours in a 24h rolling window.',
      ],
    },
    {
      category: 'AIRSPACE CONTROL & DECONFLICTION (ACO)',
      badge: '4D SEPARATION',
      items: [
        'Corridors and zones are modeled as 4D prisms (Latitude, Longitude, Altitude Floor/Ceiling, and Active Time Window).',
        'Minimum tactical separation between unescorted sorties in transit corridors is maintained at >= 3 minutes temporal buffer or >= 5,000 ft vertical flight level.',
        'Missile Engagement Zones (MEZ) trigger hard avoidance unless the strike package includes active SEAD escorts (anti-radiation munitions).',
      ],
    },
    {
      category: 'TANKER AIR-TO-AIR REFUELING (AAR)',
      badge: 'DINO-SAAR PARADIGM',
      items: [
        'Tanker operations mirror the NATO DINO-SAAR paradigm: maximizing target effects while minimizing dedicated tanker sorties.',
        'Offload capacity is hard-constrained per tanker tail (e.g. IL-78 with 65,000 kg fuel pool).',
        'Rendezvous orbits are timed to ensure strike receivers reach fuel offload points prior to bingo threshold.',
      ],
    },
    {
      category: 'HUMAN-IN-THE-LOOP & FROZEN ZONE',
      badge: 'COMMANDER AUTHORITY',
      items: [
        'All optimizer recommendations are advisory Courses of Action (COAs); final execution requires human commander approval.',
        'Committed sorties inside the 15-minute Time-On-Target (TOT) "Frozen Zone" are locked against automatic disruption unless directly engaged by newly detected threats.',
      ],
    },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-ops-900 border border-ops-700/80 rounded-xl max-w-3xl w-full max-h-[85vh] flex flex-col shadow-2xl text-xs font-mono">
        {/* Header */}
        <div className="p-4 border-b border-ops-700/60 flex items-center justify-between bg-ops-850 rounded-t-xl">
          <div className="flex items-center space-x-2.5">
            <BookOpen className="w-4 h-4 text-ops-accent" />
            <h2 className="text-sm font-bold text-white tracking-wide">
              OPERATIONAL ASSUMPTIONS &amp; DOCTRINE SPECIFICATION
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-gray-400 hover:text-white hover:bg-ops-700 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 overflow-y-auto space-y-4">
          <div className="p-3 bg-ops-950 border border-ops-800 rounded text-gray-300 leading-relaxed">
            <span className="text-ops-accent font-bold">DEFENCE AUDIT NOTICE: </span>
            This system operates with complete transparency. Every simplification from real-world military operations is documented below to ensure defensibility under hostile questioning by defence staff officers and operational researchers.
          </div>

          <div className="space-y-4">
            {assumptions.map((cat, idx) => (
              <div key={idx} className="bg-ops-950/60 border border-ops-800 rounded-lg p-3.5 space-y-2">
                <div className="flex justify-between items-center border-b border-ops-800/80 pb-1.5">
                  <span className="font-bold text-white text-xs">{cat.category}</span>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-ops-800 text-ops-accent border border-ops-700">
                    {cat.badge}
                  </span>
                </div>
                <ul className="space-y-1.5 text-gray-400 text-[11px]">
                  {cat.items.map((item, i) => (
                    <li key={i} className="flex items-start space-x-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-ops-700/60 bg-ops-850 flex justify-end rounded-b-xl">
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-ops-accent text-ops-950 font-bold rounded hover:bg-cyan-300 transition text-xs"
          >
            ACKNOWLEDGE &amp; RETURN
          </button>
        </div>
      </div>
    </div>
  );
};
