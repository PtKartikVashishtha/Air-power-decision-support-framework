'use client';

import React from 'react';

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
    {
      category: 'ADVISORY SUPPORT & ETHICAL GOVERNANCE',
      badge: 'HONESTY & SAFETY',
      items: [
        'The system is advisory decision support; a human approves every change; it contains no targeting, weapon-employment or autonomous-engagement logic; all data is synthetic/notional.',
        'Zero engagement logic: Platform handles operational scheduling, crew duty, turnaround maintenance, and corridor deconfliction; it does NOT calculate kinetic firing solutions or fire weapons.',
        'Transparency: Detailed architectural boundaries and known limitations are published in docs/HONESTY.md and docs/RESPONSIBLE_USE.md.',
      ],
    },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-surface-container-lowest border border-outline-variant max-w-3xl w-full max-h-[85vh] flex flex-col shadow-2xl text-xs font-mono">
        {/* Header */}
        <div className="p-3.5 border-b border-outline-variant flex items-center justify-between bg-surface-container-low">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px] text-primary">menu_book</span>
            <h2 className="text-xs font-bold text-primary uppercase tracking-wider">
              OPERATIONAL ASSUMPTIONS &amp; DOCTRINE SPECIFICATION
            </h2>
          </div>
          <button
            onClick={onClose}
            className="h-6 w-6 rounded flex items-center justify-center text-on-surface-variant hover:text-primary hover:bg-surface-container transition"
            type="button"
          >
            <span className="material-symbols-outlined text-[16px]">close</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 overflow-y-auto space-y-3 flex-1">
          <div className="p-2.5 bg-surface-container-low border border-outline-variant text-on-surface-variant leading-relaxed">
            <strong className="text-primary font-bold">DEFENCE AUDIT NOTICE: </strong>
            This system operates with complete transparency. Every simplification from real-world military operations is documented below to ensure defensibility under hostile questioning by defence staff officers and operational researchers.
          </div>

          <div className="space-y-3">
            {assumptions.map((cat, idx) => (
              <div key={idx} className="bg-surface-container-low border border-outline-variant p-3 space-y-2">
                <div className="flex justify-between items-center border-b border-outline-variant/50 pb-1">
                  <span className="font-bold text-primary text-xs uppercase">{cat.category}</span>
                  <span className="text-[10px] px-1.5 py-0.5 bg-surface-container-lowest text-secondary border border-outline-variant font-bold">
                    {cat.badge}
                  </span>
                </div>
                <ul className="space-y-1 text-on-surface-variant text-[11px]">
                  {cat.items.map((item, i) => (
                    <li key={i} className="flex items-start gap-1.5">
                      <span className="material-symbols-outlined text-emerald-700 text-[14px] shrink-0 mt-0.5">check_circle</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-outline-variant bg-surface-container-low flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-primary text-on-primary font-bold text-xs uppercase tracking-wider hover:bg-secondary transition"
            type="button"
          >
            ACKNOWLEDGE &amp; RETURN
          </button>
        </div>
      </div>
    </div>
  );
};
