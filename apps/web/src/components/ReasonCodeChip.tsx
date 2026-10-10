'use client';

import React, { useState } from 'react';
import { getReasonCode, ReasonCodeEntry } from '@air-power/shared';

interface ReasonCodeChipProps {
  code?: string | null;
  customPlainEnglish?: string;
  showText?: boolean;
  className?: string;
}

export const ReasonCodeChip: React.FC<ReasonCodeChipProps> = ({
  code,
  customPlainEnglish,
  showText = false,
  className = '',
}) => {
  const [isTooltipOpen, setIsTooltipOpen] = useState(false);
  const entry: ReasonCodeEntry = getReasonCode(code);
  const plainEnglish = customPlainEnglish || entry.plainEnglish;

  return (
    <div
      className={`relative inline-flex items-center ${className}`}
      onMouseEnter={() => setIsTooltipOpen(true)}
      onMouseLeave={() => setIsTooltipOpen(false)}
      onFocus={() => setIsTooltipOpen(true)}
      onBlur={() => setIsTooltipOpen(false)}
    >
      <span
        tabIndex={0}
        role="button"
        aria-label={`Reason Code: ${entry.code}. ${plainEnglish}`}
        className={`inline-flex items-center gap-1 font-mono text-[9px] font-bold px-1.5 py-0.5 border cursor-help transition-colors select-none ${entry.badgeColor.bg} ${entry.badgeColor.text} ${entry.badgeColor.border}`}
      >
        <span className="material-symbols-outlined text-[10px] leading-none shrink-0">
          {entry.category === 'REJECTION'
            ? 'block'
            : entry.category === 'RETASKING'
            ? 'sync_alt'
            : entry.category === 'SAFETY'
            ? 'verified_user'
            : 'check_circle'}
        </span>
        <span className="truncate max-w-[120px]">{entry.code}</span>
        {showText && <span className="hidden sm:inline font-sans font-normal opacity-90 truncate max-w-[160px]">— {plainEnglish}</span>}
      </span>

      {/* Accessible Hover/Focus Tooltip */}
      {isTooltipOpen && (
        <div
          role="tooltip"
          className="absolute bottom-full left-0 mb-1.5 w-64 p-2 bg-surface-container-lowest border border-outline-variant shadow-xl z-50 text-[10px] font-sans text-on-surface pointer-events-none space-y-1"
          style={{ backdropFilter: 'blur(12px)' }}
        >
          <div className="flex items-center justify-between border-b border-outline-variant/40 pb-1">
            <span className="font-mono font-bold text-primary text-[9.5px]">{entry.code}</span>
            <span className="font-label-caps text-[8px] font-bold text-secondary uppercase">{entry.category}</span>
          </div>
          <div className="font-semibold text-primary text-[10.5px] leading-tight">{entry.title}</div>
          <p className="text-on-surface-variant leading-snug">{plainEnglish}</p>
          <div className="pt-0.5 text-[8.5px] text-on-surface-variant/80 font-mono italic">
            {entry.doctrineRule}
          </div>
        </div>
      )}
    </div>
  );
};
