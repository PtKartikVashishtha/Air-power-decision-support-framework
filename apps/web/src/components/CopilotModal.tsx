'use client';

import React, { useState } from 'react';
import { Bot, Send, Sparkles, Terminal, CheckCircle2 } from 'lucide-react';
import { PlanCOA } from '@air-power/shared';

interface CopilotModalProps {
  onPlanUpdated: (plan: PlanCOA) => void;
}

export const CopilotModal: React.FC<CopilotModalProps> = ({ onPlanUpdated }) => {
  const [query, setQuery] = useState('');
  const [messages, setMessages] = useState<Array<{ sender: 'USER' | 'COPILOT'; text: string; action?: string }>>([
    {
      sender: 'COPILOT',
      text: 'TACTICAL AI COPILOT READY (OFFLINE AIR-GAPPED MODE). You may issue natural language tactical queries, retask commands, or request assignment explanations.',
    },
  ]);
  const [loading, setLoading] = useState(false);

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!query.trim()) return;

    const userText = query;
    setQuery('');
    setMessages((prev) => [...prev, { sender: 'USER', text: userText }]);
    setLoading(true);

    try {
      const res = await fetch('http://localhost:3001/api/copilot/command', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: userText }),
      });
      if (res.ok) {
        const data = await res.json();
        setMessages((prev) => [
          ...prev,
          { sender: 'COPILOT', text: data.response, action: data.action },
        ]);
        if (data.plan) {
          onPlanUpdated(data.plan);
        }
      }
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        { sender: 'COPILOT', text: 'Error connecting to local tactical copilot inference engine.' },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-ops-900 border border-ops-700/60 rounded-lg p-4 font-mono text-xs space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-ops-800 pb-2">
        <div className="flex items-center space-x-2 text-ops-accent font-bold text-sm">
          <Bot className="w-5 h-5 text-ops-accent" />
          <span>TACTICAL AI COPILOT // DETERMINISTIC COMMAND COMPILER</span>
        </div>
        <span className="px-2 py-0.5 bg-emerald-950 text-emerald-400 border border-emerald-800 rounded text-[10px] font-bold">
          LOCAL OFFLINE FALLBACK ACTIVE
        </span>
      </div>

      {/* Suggested Quick Prompts */}
      <div className="flex flex-wrap gap-2 text-[11px]">
        {[
          'Retask strike packages around new SAM battery',
          'Report combat fleet readiness and pilot fatigue status',
          'Generate high-priority Max-Effect strike plan',
          'Explain assignment rationale for lead strike sortie',
        ].map((prompt, i) => (
          <button
            key={i}
            onClick={() => {
              setQuery(prompt);
            }}
            className="bg-ops-850 hover:bg-ops-800 border border-ops-700/60 text-gray-300 px-2.5 py-1 rounded transition text-[10px]"
          >
            &ldquo;{prompt}&rdquo;
          </button>
        ))}
      </div>

      {/* Chat Messages Log */}
      <div className="bg-ops-950 border border-ops-800 rounded p-3 h-[280px] overflow-y-auto space-y-3">
        {messages.map((m, idx) => (
          <div
            key={idx}
            className={`flex flex-col ${m.sender === 'USER' ? 'items-end' : 'items-start'}`}
          >
            <div className="text-[10px] text-gray-400 mb-0.5">
              {m.sender === 'USER' ? 'TACTICAL OPERATOR' : 'AI COPILOT (VAYU-BRAIN)'}
            </div>
            <div
              className={`p-2.5 rounded max-w-[85%] leading-relaxed ${
                m.sender === 'USER'
                  ? 'bg-ops-accent/20 border border-ops-accent/40 text-cyan-100'
                  : 'bg-ops-850 border border-ops-700/60 text-gray-200'
              }`}
            >
              {m.text}
              {m.action && (
                <div className="mt-1 pt-1 border-t border-ops-700/50 text-[10px] text-emerald-400 flex items-center gap-1 font-bold">
                  <CheckCircle2 className="w-3 h-3" />
                  <span>ACTION EXECUTED: {m.action}</span>
                </div>
              )}
            </div>
          </div>
        ))}
        {loading && (
          <div className="text-gray-400 text-xs italic flex items-center gap-2">
            <div className="w-3 h-3 border-2 border-ops-accent border-t-transparent rounded-full animate-spin" />
            <span>Parsing command into Zod schema...</span>
          </div>
        )}
      </div>

      {/* Input bar */}
      <form onSubmit={handleSend} className="flex gap-2">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Issue tactical natural language command..."
          className="flex-1 bg-ops-950 border border-ops-700/80 rounded px-3 py-2 text-xs text-gray-200 focus:outline-none focus:border-ops-accent"
        />
        <button
          type="submit"
          disabled={loading || !query.trim()}
          className="bg-ops-accent hover:bg-cyan-300 text-ops-950 font-bold px-4 py-2 rounded flex items-center gap-1.5 transition disabled:opacity-50"
        >
          <Send className="w-3.5 h-3.5" />
          <span>TRANSMIT</span>
        </button>
      </form>
    </div>
  );
};
