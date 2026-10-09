'use client';

import React from 'react';

// ==========================================
// 1. PANEL PRIMITIVE
// ==========================================
export interface PanelProps {
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  badge?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
  bodyClassName?: string;
  headerClassName?: string;
  children: React.ReactNode;
}

export const Panel: React.FC<PanelProps> = ({
  title,
  subtitle,
  badge,
  actions,
  className = '',
  bodyClassName = '',
  headerClassName = '',
  children,
}) => {
  return (
    <div
      className={`bg-surface-container-lowest border border-outline-variant shadow-xs flex flex-col min-w-0 min-h-0 max-w-full ${className}`}
    >
      {(title || subtitle || badge || actions) && (
        <div
          className={`px-3 py-2 border-b border-outline-variant bg-surface-container-low flex items-center justify-between gap-2 min-w-0 shrink-0 ${headerClassName}`}
        >
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <div className="min-w-0 flex-1">
              {title && (
                <div className="font-headline-md text-xs font-bold uppercase tracking-wider text-primary truncate">
                  {title}
                </div>
              )}
              {subtitle && (
                <div className="font-label-data-sm text-[10px] text-on-surface-variant truncate">
                  {subtitle}
                </div>
              )}
            </div>
            {badge && <div className="shrink-0">{badge}</div>}
          </div>
          {actions && <div className="flex items-center gap-1.5 shrink-0">{actions}</div>}
        </div>
      )}
      <div className={`p-3 min-w-0 min-h-0 flex-1 ${bodyClassName}`}>{children}</div>
    </div>
  );
};

// ==========================================
// 2. SCROLL AREA PRIMITIVE
// ==========================================
export interface ScrollAreaProps {
  maxHeight?: string | number;
  className?: string;
  orientation?: 'vertical' | 'horizontal' | 'both';
  children: React.ReactNode;
}

export const ScrollArea: React.FC<ScrollAreaProps> = ({
  maxHeight,
  className = '',
  orientation = 'vertical',
  children,
}) => {
  const overflowClasses =
    orientation === 'vertical'
      ? 'overflow-y-auto overflow-x-hidden'
      : orientation === 'horizontal'
      ? 'overflow-x-auto overflow-y-hidden'
      : 'overflow-auto';

  return (
    <div
      className={`min-w-0 min-h-0 max-w-full w-full ${overflowClasses} ${className}`}
      style={maxHeight ? { maxHeight } : undefined}
    >
      {children}
    </div>
  );
};

// ==========================================
// 3. DATA TABLE PRIMITIVE
// ==========================================
export interface DataTableProps {
  headers: Array<{ key: string; label: string; align?: 'left' | 'center' | 'right'; width?: string }>;
  rows: Array<Record<string, React.ReactNode>>;
  keyField?: string;
  maxHeight?: string | number;
  className?: string;
  emptyMessage?: string;
}

export const DataTable: React.FC<DataTableProps> = ({
  headers,
  rows,
  keyField = 'id',
  maxHeight,
  className = '',
  emptyMessage = 'NO RECORDS IN CURRENT FILTER',
}) => {
  return (
    <div className={`w-full min-w-0 max-w-full border border-outline-variant bg-surface-container-lowest overflow-hidden flex flex-col ${className}`}>
      <div
        className="w-full min-w-0 overflow-x-auto overflow-y-auto"
        style={maxHeight ? { maxHeight } : undefined}
      >
        <table className="w-full text-left border-collapse text-xs">
          <thead className="bg-surface-container-low text-on-surface-variant font-label-caps text-[10px] uppercase tracking-wider sticky top-0 z-10 border-b border-outline-variant">
            <tr>
              {headers.map((h) => (
                <th
                  key={h.key}
                  className={`py-2 px-3 whitespace-nowrap font-bold ${
                    h.align === 'right' ? 'text-right' : h.align === 'center' ? 'text-center' : 'text-left'
                  }`}
                  style={h.width ? { width: h.width } : undefined}
                >
                  {h.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-outline-variant/40 font-label-data-sm text-[11px]">
            {rows.length === 0 ? (
              <tr>
                <td colSpan={headers.length} className="py-6 text-center text-on-surface-variant italic">
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              rows.map((r, idx) => (
                <tr
                  key={String(r[keyField] || idx)}
                  className="hover:bg-surface-container-low/70 transition-colors"
                >
                  {headers.map((h) => (
                    <td
                      key={h.key}
                      className={`py-1.5 px-3 min-w-0 ${
                        h.align === 'right' ? 'text-right' : h.align === 'center' ? 'text-center' : 'text-left'
                      }`}
                    >
                      {r[h.key]}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// ==========================================
// 4. TRUNCATED TEXT PRIMITIVE
// ==========================================
export interface TruncatedTextProps {
  text: string;
  maxWidth?: string | number;
  className?: string;
  asBadge?: boolean;
}

export const TruncatedText: React.FC<TruncatedTextProps> = ({
  text,
  maxWidth,
  className = '',
  asBadge = false,
}) => {
  return (
    <span
      title={text}
      style={maxWidth ? { maxWidth } : undefined}
      className={`truncate inline-block align-middle ${
        asBadge
          ? 'px-1.5 py-0.5 bg-surface-container text-primary font-mono text-[10px] font-bold border border-outline-variant rounded-xs'
          : ''
      } ${className}`}
    >
      {text}
    </span>
  );
};

// ==========================================
// 5. STAT CARD PRIMITIVE
// ==========================================
export interface StatCardProps {
  label: string;
  value: React.ReactNode;
  subtitle?: string;
  delta?: { value: string; isPositive?: boolean };
  icon?: string;
  className?: string;
}

export const StatCard: React.FC<StatCardProps> = ({
  label,
  value,
  subtitle,
  delta,
  icon,
  className = '',
}) => {
  return (
    <div
      className={`p-3 bg-surface-container-lowest border border-outline-variant shadow-xs flex flex-col justify-between min-w-0 min-h-0 ${className}`}
    >
      <div className="flex items-center justify-between gap-1.5 min-w-0 mb-1">
        <span className="font-label-caps text-[10px] uppercase tracking-wider text-on-surface-variant font-bold truncate">
          {label}
        </span>
        {icon && (
          <span className="material-symbols-outlined text-on-surface-variant text-[15px] shrink-0">
            {icon}
          </span>
        )}
      </div>
      <div className="flex items-baseline justify-between gap-1 min-w-0">
        <div className="font-headline-md text-lg lg:text-xl font-bold text-primary truncate tracking-tight">
          {value}
        </div>
        {delta && (
          <span
            className={`font-label-data-sm text-[10px] font-bold shrink-0 ${
              delta.isPositive ? 'text-green-700' : 'text-red-700'
            }`}
          >
            {delta.value}
          </span>
        )}
      </div>
      {subtitle && (
        <div className="font-label-data-sm text-[10px] text-on-surface-variant truncate mt-0.5">
          {subtitle}
        </div>
      )}
    </div>
  );
};
