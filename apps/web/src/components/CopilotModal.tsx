'use client';

import React, { useState, useRef, useEffect } from 'react';
import { PlanCOA, CopilotCommandAST, DryRunPreview, ClarificationDetails } from '@air-power/shared';

interface CopilotModalProps {
  onPlanUpdated: (plan: PlanCOA) => void;
  onClose?: () => void;
}

interface ChatMessage {
  id: string;
  sender: 'USER' | 'COPILOT';
  text: string;
  action?: string;
  ast?: CopilotCommandAST;
  preview?: DryRunPreview;
  clarification?: ClarificationDetails;
  isConfirmed?: boolean;
}

export const CopilotModal: React.FC<CopilotModalProps> = ({ onPlanUpdated, onClose }) => {
  const [query, setQuery] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'init',
      sender: 'COPILOT',
      text: 'TACTICAL AI COPILOT OPERATIONAL (OFFLINE DETERMINISTIC C2 COMPILER). Ready to parse operational retasking commands, fleet readiness queries, and grounded counterfactual explanations.',
    },
  ]);
  const [loading, setLoading] = useState(false);
  const [pendingConfirm, setPendingConfirm] = useState<{ messageId: string; ast: CopilotCommandAST } | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading]);

  const handleSend = async (textToSend?: string) => {
    const q = (textToSend || query).trim();
    if (!q) return;

    setQuery('');
    const userMsgId = `usr-${Date.now()}`;
    setMessages((prev) => [...prev, { id: userMsgId, sender: 'USER', text: q }]);
    setLoading(true);

    try {
      const res = await fetch('http://localhost:3001/api/copilot/command', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: q }),
      });
      if (res.ok) {
        const data = await res.json();
        const copilotMsgId = `cop-${Date.now()}`;

        if (data.requiresConfirmation && data.ast) {
          setPendingConfirm({ messageId: copilotMsgId, ast: data.ast });
        }

        setMessages((prev) => [
          ...prev,
          {
            id: copilotMsgId,
            sender: 'COPILOT',
            text: data.response || 'Command compiled into Tactical AST.',
            action: data.action,
            ast: data.ast,
            preview: data.preview,
            clarification: data.clarification,
          },
        ]);

        if (data.plan) {
          onPlanUpdated(data.plan);
        }
      } else {
        setMessages((prev) => [
          ...prev,
          { id: `err-${Date.now()}`, sender: 'COPILOT', text: 'Error: Local Copilot compiler returned non-200 status.' },
        ]);
      }
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        { id: `err-${Date.now()}`, sender: 'COPILOT', text: 'Connection failed: Unable to reach tactical decision-support API.' },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmAction = async (msgId: string, ast: CopilotCommandAST) => {
    setLoading(true);
    try {
      const res = await fetch('http://localhost:3001/api/copilot/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ast }),
      });
      if (res.ok) {
        const data = await res.json();
        setPendingConfirm(null);
        setMessages((prev) =>
          prev.map((m) => (m.id === msgId ? { ...m, isConfirmed: true } : m))
        );
        setMessages((prev) => [
          ...prev,
          {
            id: `conf-${Date.now()}`,
            sender: 'COPILOT',
            text: `[COMMAND COMMITTED]: ${data.message}`,
            action: data.action,
          },
        ]);
        if (data.plan) {
          onPlanUpdated(data.plan);
        }
      }
    } catch (err) {
      alert('Failed to execute confirmed commander action.');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelAction = (msgId: string) => {
    setPendingConfirm(null);
    setMessages((prev) => [
      ...prev,
      {
        id: `canc-${Date.now()}`,
        sender: 'COPILOT',
        text: 'Action cancelled by operator. No changes committed to operational plan.',
      },
    ]);
  };

  const handleUndo = async () => {
    setLoading(true);
    try {
      const res = await fetch('http://localhost:3001/api/copilot/undo', {
        method: 'POST',
      });
      if (res.ok) {
        const data = await res.json();
        setMessages((prev) => [
          ...prev,
          {
            id: `undo-${Date.now()}`,
            sender: 'COPILOT',
            text: data.message,
            action: 'UNDO_RESTORED',
          },
        ]);
        if (data.plan) {
          onPlanUpdated(data.plan);
        }
      }
    } catch (err) {
      alert('Failed to undo last action.');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <div className="w-[460px] max-w-[calc(100vw-2rem)] bg-surface-container-lowest border border-outline-variant shadow-xl flex flex-col font-sans text-xs min-w-0 overflow-hidden">
      {/* Daylight JAOC Header */}
      <div className="px-3.5 py-2.5 bg-surface-container-low border-b border-outline-variant flex items-center justify-between gap-2 shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-6 h-6 rounded bg-primary flex items-center justify-center text-on-primary font-bold text-xs shrink-0">
            <span className="material-symbols-outlined text-[15px]">smart_toy</span>
          </div>
          <div className="flex flex-col min-w-0">
            <span className="font-label-caps text-xs text-primary font-bold tracking-wider truncate">
              TACTICAL COPILOT // C2 COMPILER
            </span>
            <span className="font-label-data-sm text-[9px] text-[#15803d] font-bold tracking-tight">
              OFFLINE AIR-GAPPED // ZOD AST
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={handleUndo}
            disabled={loading}
            className="h-6 px-2 bg-surface-container-lowest border border-outline-variant font-label-data-sm text-[10px] text-on-surface hover:bg-surface-container font-bold flex items-center gap-1 transition shrink-0"
            type="button"
            title="Restore previous plan state from undo stack"
          >
            <span className="material-symbols-outlined text-[13px]">undo</span>
            <span>Undo</span>
          </button>
          {onClose && (
            <button
              onClick={onClose}
              className="h-6 w-6 text-on-surface-variant hover:text-on-surface flex items-center justify-center transition shrink-0"
              type="button"
              title="Close Copilot"
            >
              <span className="material-symbols-outlined text-[16px]">close</span>
            </button>
          )}
        </div>
      </div>

      {/* Suggested Quick Action Chips */}
      <div className="px-3 py-2 bg-surface-container-lowest border-b border-outline-variant/60 flex flex-wrap gap-1.5 shrink-0 max-h-24 overflow-y-auto">
        {[
          'Retask strike packages around new SAM battery in Sector 4',
          'Report combat fleet readiness and pilot fatigue status',
          'Why was tail SB021 assigned to Target T01 instead of T03?',
          'Switch operational plan to Minimum Risk COA',
          'Close Base Bhuj due to runway cratering',
        ].map((prompt, i) => (
          <button
            key={i}
            onClick={() => handleSend(prompt)}
            disabled={loading}
            className="bg-surface-container hover:bg-surface-container-high border border-outline-variant/70 text-on-surface px-2 py-0.5 text-[10px] font-medium transition text-left truncate max-w-full"
            type="button"
          >
            &ldquo;{prompt}&rdquo;
          </button>
        ))}
      </div>

      {/* Chat Messages Container */}
      <div
        ref={scrollRef}
        className="p-3 bg-surface-container-lowest h-[320px] overflow-y-auto space-y-3 font-sans min-w-0"
      >
        {messages.map((m) => (
          <div
            key={m.id}
            className={`flex flex-col min-w-0 ${m.sender === 'USER' ? 'items-end' : 'items-start'}`}
          >
            <div className="text-[9px] text-on-surface-variant font-bold mb-0.5 tracking-wider uppercase">
              {m.sender === 'USER' ? 'TACTICAL OPERATOR' : 'AI COPILOT (VAYU-BRAIN)'}
            </div>

            <div
              className={`p-2.5 max-w-[92%] text-xs leading-relaxed border min-w-0 break-words ${
                m.sender === 'USER'
                  ? 'bg-primary-container/20 text-on-surface border-primary/30 font-medium'
                  : 'bg-surface-container-low text-on-surface border-outline-variant'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <span className="whitespace-pre-wrap">{m.text}</span>
                {m.sender === 'COPILOT' && (
                  <button
                    onClick={() => copyToClipboard(m.text)}
                    className="text-on-surface-variant hover:text-primary transition shrink-0 mt-0.5"
                    title="Copy message text"
                    type="button"
                  >
                    <span className="material-symbols-outlined text-[13px]">content_copy</span>
                  </button>
                )}
              </div>

              {/* Action Badge */}
              {m.action && (
                <div className="mt-2 pt-1.5 border-t border-outline-variant/60 text-[10px] text-[#15803d] flex items-center gap-1 font-bold">
                  <span className="material-symbols-outlined text-[13px]">check_circle</span>
                  <span>EXECUTED: {m.action}</span>
                </div>
              )}

              {/* Clarification Options */}
              {m.clarification?.options && !m.isConfirmed && (
                <div className="mt-2 pt-2 border-t border-outline-variant/60 flex flex-wrap gap-1">
                  <span className="w-full text-[10px] text-on-surface-variant font-bold mb-0.5">
                    Select an option:
                  </span>
                  {m.clarification.options.map((opt, oi) => (
                    <button
                      key={oi}
                      onClick={() => handleSend(opt)}
                      className="px-2 py-1 bg-surface-container-high hover:bg-primary hover:text-on-primary border border-outline-variant font-label-data-sm text-[10px] font-bold transition"
                      type="button"
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              )}

              {/* Dry-Run Confirmation Card */}
              {m.preview && !m.isConfirmed && pendingConfirm?.messageId === m.id && (
                <div className="mt-2.5 p-2.5 bg-surface-container border border-secondary/50 flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <span className="font-label-caps text-[10px] text-secondary font-bold uppercase tracking-wider">
                      DRY-RUN IMPACT PREVIEW
                    </span>
                    <span className="px-1.5 py-0.5 bg-[#f0fdf4] text-[#15803d] border border-[#bbf7d0] font-label-data-sm text-[9px] font-bold">
                      STABILITY: {m.preview.stabilityIndex}%
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-1 text-[10px]">
                    <div className="p-1 bg-surface-container-lowest border border-outline-variant text-center">
                      <div className="text-on-surface-variant text-[9px]">Targets Δ</div>
                      <div className="font-bold font-label-data-sm text-primary">
                        {m.preview.kpiDelta.coveredTargetsDelta >= 0 ? '+' : ''}
                        {m.preview.kpiDelta.coveredTargetsDelta}
                      </div>
                    </div>
                    <div className="p-1 bg-surface-container-lowest border border-outline-variant text-center">
                      <div className="text-on-surface-variant text-[9px]">Risk Δ</div>
                      <div className="font-bold font-label-data-sm text-[#15803d]">
                        {m.preview.kpiDelta.riskDelta >= 0 ? '+' : ''}
                        {m.preview.kpiDelta.riskDelta}%
                      </div>
                    </div>
                    <div className="p-1 bg-surface-container-lowest border border-outline-variant text-center">
                      <div className="text-on-surface-variant text-[9px]">Fuel Δ</div>
                      <div className="font-bold font-label-data-sm text-on-surface">
                        {m.preview.kpiDelta.fuelDeltaKg} kg
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-1.5 pt-1">
                    <button
                      onClick={() => handleCancelAction(m.id)}
                      className="px-2 py-1 bg-surface-container-lowest text-on-surface-variant hover:text-on-surface border border-outline-variant text-[10px] font-bold transition"
                      type="button"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => handleConfirmAction(m.id, m.ast!)}
                      className="px-2.5 py-1 bg-primary text-on-primary hover:bg-primary-container font-label-caps text-[10px] font-bold tracking-wider transition flex items-center gap-1 shadow-xs"
                      type="button"
                    >
                      <span className="material-symbols-outlined text-[13px]">gavel</span>
                      <span>AUTHORIZE &amp; COMMIT</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div className="text-on-surface-variant text-xs italic flex items-center gap-2">
            <div className="w-3.5 h-3.5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            <span>Compiling deterministic AST and computing dry-run preview...</span>
          </div>
        )}
      </div>

      {/* Input bar */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSend();
        }}
        className="p-2.5 bg-surface-container-low border-t border-outline-variant flex gap-2 shrink-0"
      >
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Issue natural language command (e.g. Retask around SAM-02)..."
          className="flex-1 bg-surface-container-lowest border border-outline-variant px-3 py-1.5 text-xs text-on-surface placeholder:text-on-surface-variant/60 focus:outline-none focus:border-primary font-sans"
        />
        <button
          type="submit"
          disabled={loading || !query.trim()}
          className="bg-primary hover:bg-primary-container text-on-primary font-label-caps text-[11px] font-bold px-3 py-1.5 transition flex items-center gap-1 shadow-xs disabled:opacity-50"
        >
          <span>TRANSMIT</span>
          <span className="material-symbols-outlined text-[13px]">send</span>
        </button>
      </form>
    </div>
  );
};
