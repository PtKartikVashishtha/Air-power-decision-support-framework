'use client';

import React, { useState, useEffect } from 'react';
import { FusedOperationalPicture } from '@air-power/shared';
import { Shield, Lock, Activity, CheckCircle, Database } from 'lucide-react';

interface AuditTrailViewProps {
  fusedPicture: FusedOperationalPicture;
}

export const AuditTrailView: React.FC<AuditTrailViewProps> = ({ fusedPicture }) => {
  const [auditEvents, setAuditEvents] = useState<any[]>([]);
  const [chainLength, setChainLength] = useState(0);

  useEffect(() => {
    fetchAuditLog();
  }, []);

  const fetchAuditLog = async () => {
    try {
      const res = await fetch('http://localhost:3001/api/audit-log');
      if (res.ok) {
        const data = await res.json();
        setAuditEvents(data.events || []);
        setChainLength(data.chainLength || 0);
      }
    } catch (err) {
      console.error('Failed to load audit log', err);
    }
  };

  return (
    <div className="space-y-4 font-mono text-xs">
      {/* Header */}
      <div className="bg-ops-900 border border-ops-700/60 p-4 rounded-lg flex justify-between items-center">
        <div>
          <div className="text-ops-accent font-bold text-sm flex items-center gap-2">
            <Lock className="w-4 h-4 text-ops-accent" />
            CRYPTOGRAPHIC AUDIT TRAIL &amp; DATA PROVENANCE LEDGER
          </div>
          <div className="text-gray-400 text-[11px] mt-0.5">
            Immutable Hash-Chained Action Log // Feed Latency &amp; Staleness Diagnostics
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <span className="text-gray-400">LEDGER BLOCKS:</span>
          <span className="text-ops-accent font-bold">{chainLength} VERIFIED</span>
        </div>
      </div>

      {/* Feed Health Monitor Grid */}
      <div className="bg-ops-900 border border-ops-700/60 p-4 rounded-lg space-y-3">
        <div className="font-bold text-white uppercase text-xs flex items-center gap-2">
          <Activity className="w-4 h-4 text-emerald-400" />
          7-DOMAIN DATA FUSION FEED STATUS &amp; REFRESH RATES
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {fusedPicture.feedHealth?.map((fh) => (
            <div key={fh.feedId} className="bg-ops-850 p-2.5 rounded border border-ops-700/50">
              <div className="flex justify-between items-center mb-1">
                <span className="font-bold text-white text-[11px] truncate max-w-[180px]">
                  {fh.systemOrigin}
                </span>
                <span className="px-1.5 py-0.5 bg-emerald-950 text-emerald-400 border border-emerald-800 rounded text-[9px] font-bold">
                  {fh.status}
                </span>
              </div>
              <div className="flex justify-between text-[10px] text-gray-400">
                <span>Latency: {fh.latencyMs} ms</span>
                <span>Confidence: {fh.confidenceScore}%</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="bg-ops-900 border border-ops-700/60 rounded-lg overflow-hidden">
        <div className="px-4 py-3 bg-ops-850 border-b border-ops-700/60 flex justify-between items-center">
          <span className="font-bold text-white uppercase text-xs">
            IMMUTABLE EVENT LOG ENTRIES
          </span>
          <button
            onClick={fetchAuditLog}
            className="text-ops-accent hover:underline text-[11px]"
          >
            REFRESH LOG
          </button>
        </div>

        <div className="overflow-x-auto max-h-[420px]">
          <table className="w-full text-left font-mono text-xs">
            <thead className="bg-ops-900 sticky top-0 text-gray-400 uppercase text-[10px] border-b border-ops-700/60">
              <tr>
                <th className="p-3">BLOCK #</th>
                <th className="p-3">TIME</th>
                <th className="p-3">ROLE</th>
                <th className="p-3">ACTION</th>
                <th className="p-3">CURRENT HASH</th>
                <th className="p-3">PREVIOUS HASH</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ops-800/80">
              {auditEvents.slice().reverse().map((ev) => (
                <tr key={ev.index} className="hover:bg-ops-850/50">
                  <td className="p-3 font-bold text-ops-accent">#{ev.index}</td>
                  <td className="p-3 text-gray-400">{ev.timestampIso.slice(11, 19)}Z</td>
                  <td className="p-3 text-white font-semibold">{ev.actorRole}</td>
                  <td className="p-3 text-emerald-400 font-bold">{ev.action}</td>
                  <td className="p-3 font-mono text-[10px] text-cyan-300">0x{ev.hash}</td>
                  <td className="p-3 font-mono text-[10px] text-gray-500">0x{ev.prevHash}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
