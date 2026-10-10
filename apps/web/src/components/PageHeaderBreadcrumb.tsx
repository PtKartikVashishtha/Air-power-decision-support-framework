'use client';

import React from 'react';
import { SupportedLocale, t } from '@air-power/shared';
import { ALL_SERVICES } from './ServicesDirectoryModal';

interface PageHeaderBreadcrumbProps {
  activeTab: number;
  onNavigateHome: () => void;
  onOpenDirectory: () => void;
  locale: SupportedLocale;
  customAction?: React.ReactNode;
}

export const PageHeaderBreadcrumb: React.FC<PageHeaderBreadcrumbProps> = ({
  activeTab,
  onNavigateHome,
  onOpenDirectory,
  locale,
  customAction,
}) => {
  // If we are on the Home 7-step overview (99), we show a clean banner introducing the multi-page suite
  if (activeTab === 99) {
    return (
      <div className="mb-6 p-4 sm:p-5 bg-white border border-slate-200 rounded-lg shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start sm:items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-[#0284c7] text-white flex items-center justify-center shrink-0 shadow-xs">
            <span className="material-symbols-outlined text-[24px]">flag</span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-slate-900 tracking-tight">
                7-Step Guided Evaluation Flow
              </h2>
              <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-mono font-bold rounded">
                RECOMMENDED JURY PATH
              </span>
            </div>
            <p className="text-xs text-slate-600 mt-0.5">
              Step through the complete mission cycle below, or browse any of our 11 deep-dive analytical modules.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            onClick={onOpenDirectory}
            className="px-3.5 py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-xs"
            type="button"
          >
            <span className="material-symbols-outlined text-[16px] text-sky-600">apps</span>
            <span>All 18 Operations Directory</span>
          </button>
          {customAction}
        </div>
      </div>
    );
  }

  const currentService = ALL_SERVICES.find((s) => s.idx === activeTab);
  const title = currentService
    ? t(currentService.titleKey, locale) || currentService.defaultTitle
    : `Operation Screen ${activeTab}`;

  return (
    <div className="mb-5 space-y-3">
      {/* Top Breadcrumb Strip */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-3.5 py-2 bg-white border border-slate-200 rounded-md shadow-xs text-xs">
        <div className="flex items-center gap-2 flex-wrap min-w-0">
          <button
            onClick={onNavigateHome}
            className="flex items-center gap-1.5 text-sky-700 hover:text-sky-900 font-bold transition-colors group"
            type="button"
          >
            <span className="material-symbols-outlined text-[16px] group-hover:-translate-x-0.5 transition-transform">
              arrow_back
            </span>
            <span>7-Step Mission Plan</span>
          </button>

          <span className="text-slate-300">/</span>

          <span className="text-slate-500 font-medium">Operations</span>

          <span className="text-slate-300">/</span>

          <span className="font-semibold text-slate-900 truncate">
            {title}
          </span>

          {currentService?.code && (
            <span className="ml-1 px-1.5 py-0.2 bg-slate-100 text-slate-600 border border-slate-200 text-[10px] font-mono font-bold rounded">
              {currentService.code}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={onOpenDirectory}
            className="px-2.5 py-1 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 rounded text-xs font-medium flex items-center gap-1 transition-colors"
            type="button"
            title="Browse all 18 command modules"
          >
            <span className="material-symbols-outlined text-[14px] text-sky-600">apps</span>
            <span>All Operations Hub (18)</span>
          </button>
        </div>
      </div>

      {/* Explanatory Context Card (Spacious, Clear, Human-Readable) */}
      {currentService && (
        <div className="p-4 bg-white border border-slate-200 rounded-lg shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-3 min-w-0">
            <div className="w-9 h-9 rounded-md bg-sky-50 border border-sky-200 text-sky-700 flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-[20px]">{currentService.icon}</span>
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <h1 className="text-sm font-bold text-slate-900 uppercase tracking-tight">
                  {title}
                </h1>
                <span className="px-2 py-0.2 bg-sky-50 text-sky-700 border border-sky-200 text-[9px] font-mono font-bold rounded">
                  {currentService.badge}
                </span>
                <span className="px-1.5 py-0.2 bg-slate-100 text-slate-600 border border-slate-200 text-[9px] font-bold rounded">
                  ROLE: {currentService.role}
                </span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed max-w-4xl">
                {currentService.summary}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 border-t md:border-t-0 pt-2 md:pt-0 border-slate-100">
            <span className="px-2.5 py-1 bg-amber-50 text-amber-800 border border-amber-200 text-[10px] font-bold uppercase rounded">
              Advisory Decision Support // Human In The Loop
            </span>
            {customAction}
          </div>
        </div>
      )}
    </div>
  );
};
