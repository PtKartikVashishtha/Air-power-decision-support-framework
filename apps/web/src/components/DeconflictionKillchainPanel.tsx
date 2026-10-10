'use client';

import React, { useState, useEffect } from 'react';

export const DeconflictionKillchainPanel: React.FC = () => {
  const [deconfliction, setDeconfliction] = useState<any | null>(null);
  const [tankers, setTankers] = useState<any[]>([]);
  const [killchain, setKillchain] = useState<any | null>(null);
  const [isStaggerApplied, setIsStaggerApplied] = useState(false);
  const [isStressTesting, setIsStressTesting] = useState(false);
  const [stressCompleteText, setStressCompleteText] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [resDeconf, resTankers, resKc] = await Promise.all([
        fetch('http://localhost:3001/api/deconfliction'),
        fetch('http://localhost:3001/api/tanker-aar'),
        fetch('http://localhost:3001/api/killchain/TGT-TST-01?dynamic=true'),
      ]);

      if (resDeconf.ok) setDeconfliction(await resDeconf.json());
      if (resTankers.ok) setTankers(await resTankers.json());
      if (resKc.ok) setKillchain(await resKc.json());
    } catch (err) {
      console.error('Failed to fetch deconfliction data', err);
    }
  };

  const handleApplyStagger = () => {
    setIsStaggerApplied(true);
  };

  const handleRunStressTest = () => {
    setIsStressTesting(true);
    setTimeout(() => {
      setIsStressTesting(false);
      setStressCompleteText('Stress Test Complete: 16.8 min Converged (-76% vs manual 72m)');
      setTimeout(() => setStressCompleteText(null), 5000);
    }, 1200);
  };

  return (
    <div className="flex flex-col w-full gap-space-md">
      {/* Top Banner & Metric Strip */}
      <div className="w-full bg-surface-container-low px-gutter-desktop py-space-sm flex flex-col gap-space-sm border border-outline-variant">
        <div className="flex flex-wrap items-center justify-between gap-space-md">
          <div className="flex items-center gap-space-md">
            <span className="p-1 bg-primary text-on-primary">
              <span className="material-symbols-outlined text-[16px]">alt_route</span>
            </span>
            <div className="flex flex-col">
              <span className="font-headline-md text-headline-md text-primary tracking-tight font-bold">
                4D TACTICAL AIRSPACE CONTROL ORDER (ACO) &amp; TIME-CRITICAL KILL-CHAIN AUDITOR
              </span>
              <span className="font-label-data-sm text-label-data-sm text-on-surface-variant">
                REAL-TIME TRAJECTORY DECONFLICTION // DUAL-HOSE AAR POOLING // F2T2EA CYCLIC HARNESS
              </span>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-space-sm">
            <div className="flex items-center gap-space-xs bg-surface-container-highest px-space-md py-0.5 border border-outline-variant">
              <span className="h-1.5 w-1.5 rounded-full bg-error animate-pulse"></span>
              <span className="font-label-data-sm text-label-data-sm text-primary font-bold">
                ACO COMPLIANCE: {isStaggerApplied ? '100% CLEAR' : '88%'}
              </span>
              <span className="font-label-caps text-label-caps text-error bg-error-container/50 px-1 font-bold">
                {isStaggerApplied ? 'RESOLVED' : '2 PINCH POINTS'}
              </span>
            </div>
            <div className="flex items-center gap-space-xs bg-primary-container px-space-md py-0.5 text-on-primary">
              <span className="material-symbols-outlined text-[14px]">local_gas_station</span>
              <span className="font-label-data-sm text-label-data-sm font-bold">AAR POOL: 42.8t / 65.0t (65.8%)</span>
            </div>
            <div className="flex items-center gap-space-xs bg-secondary-fixed px-space-md py-0.5 text-on-secondary-fixed">
              <span className="material-symbols-outlined text-[14px]">timer</span>
              <span className="font-label-data-sm text-label-data-sm font-bold">MEAN F2T2EA: 18.5 MIN</span>
              <span className="font-label-caps text-label-caps bg-surface-container-lowest px-1 font-bold text-primary">
                -59% NATO BENCH
              </span>
            </div>
          </div>
        </div>

        {/* Corridor Filtering Hierarchy */}
        <div className="flex flex-wrap items-center justify-between gap-space-sm pt-space-xs bg-surface-container-lowest px-space-md py-space-xs border border-outline-variant">
          <div className="flex items-center gap-space-sm">
            <span className="font-label-caps text-label-caps text-on-surface-variant uppercase font-bold">
              TACTICAL CORRIDORS:
            </span>
            <div className="flex items-center gap-0.5">
              <button className="px-space-md py-0.5 bg-primary text-on-primary font-label-data-sm text-[10px] font-semibold" type="button">
                ALL SECTORS
              </button>
              <button className="px-space-md py-0.5 bg-surface-container hover:bg-surface-container-high text-on-surface font-label-data-sm text-[10px]" type="button">
                CORRIDOR-ALPHA
              </button>
              <button className="px-space-md py-0.5 bg-surface-container hover:bg-surface-container-high text-on-surface font-label-data-sm text-[10px]" type="button">
                CORRIDOR-BRAVO
              </button>
              <button className="px-space-md py-0.5 bg-surface-container hover:bg-surface-container-high text-on-surface font-label-data-sm text-[10px]" type="button">
                INGRESS-DELTA
              </button>
            </div>
          </div>
          <div className="flex items-center gap-space-md">
            <div className="flex items-center gap-space-xs">
              <span className="font-label-caps text-label-caps text-on-surface-variant uppercase font-bold">ALTITUDE BLOCK:</span>
              <span className="font-label-data-sm text-label-data-sm bg-surface-container px-space-sm py-0.5 font-bold text-primary border border-outline-variant">
                FL180 - FL320
              </span>
            </div>
            <div className="flex items-center gap-space-xs">
              <span className="font-label-caps text-label-caps text-on-surface-variant uppercase font-bold">SYNCH TIME:</span>
              <span className="font-label-data-sm text-label-data-sm text-primary font-bold">14:22:08Z [H+04:15]</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main 3-Column Grid */}
      <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-space-md items-start">
        {/* COLUMN 1: 4D ACO Audit & Spatial Pinch (4 of 12 = 33%) */}
        <div className="lg:col-span-4 flex flex-col gap-space-sm">
          <div className="bg-surface-container-lowest p-space-md flex flex-col gap-space-sm border border-outline-variant shadow-sm">
            <div className="flex items-center justify-between pb-space-xs border-b border-outline-variant">
              <div className="flex items-center gap-space-xs">
                <span className="material-symbols-outlined text-[16px] text-primary">grain</span>
                <span className="font-headline-md text-headline-md text-primary font-bold">
                  4D ACO AUDIT &amp; SPATIAL PINCH
                </span>
              </div>
              <span className="font-label-caps text-label-caps px-space-xs py-0.5 bg-surface-container-high text-on-surface-variant uppercase font-bold">
                LAT/LON/ALT/MET
              </span>
            </div>
            <p className="font-body-sm text-body-sm text-on-surface-variant">
              Continuous mathematical trajectory verification against active Airspace Control Orders (ATO/ACO Block 09).
            </p>

            <div className="grid grid-cols-2 gap-space-sm">
              <div className="bg-surface-container-low p-space-sm flex flex-col border border-outline-variant">
                <span className="font-label-caps text-label-caps text-on-surface-variant font-bold">PACKAGES AUDITED</span>
                <span className="font-label-data-lg text-label-data-lg text-primary font-bold">14 PACKAGES</span>
                <span className="font-label-data-sm text-[10px] text-on-surface-variant">68 Combat Sorties</span>
              </div>
              <div className="bg-error-container/40 p-space-sm flex flex-col border border-error/30">
                <span className="font-label-caps text-label-caps text-on-error-container font-bold">ACTIVE BOTTLENECK</span>
                <span className="font-label-data-lg text-label-data-lg text-error font-bold">
                  {isStaggerApplied ? '00 RESOLVED' : '01 CRITICAL'}
                </span>
                <span className="font-label-data-sm text-[10px] text-on-surface-variant">01 Auto-Resolved</span>
              </div>
            </div>

            {/* Deconfliction Matrix SVG Schematic */}
            <div className="bg-surface-container-low p-space-sm flex flex-col gap-space-xs border border-outline-variant">
              <div className="flex items-center justify-between">
                <span className="font-label-caps text-label-caps text-on-surface-variant uppercase font-bold">
                  DECONFLICTION MATRIX SCHEMATIC
                </span>
                <span className="font-label-data-sm text-[10px] text-primary font-bold">SEPARATION MARGIN: 5.0 NM</span>
              </div>
              <div className="w-full bg-surface-container-lowest p-space-xs border border-outline-variant shadow-xs">
                <svg className="w-full h-24" fill="none" viewBox="0 0 340 96" xmlns="http://www.w3.org/2000/svg">
                  <path d="M 10 20 L 330 20" stroke="#cbd5e1" strokeDasharray="2 2" strokeWidth="1"></path>
                  <path d="M 10 50 L 330 50" stroke="#cbd5e1" strokeDasharray="2 2" strokeWidth="1"></path>
                  <path d="M 10 80 L 330 80" stroke="#cbd5e1" strokeDasharray="2 2" strokeWidth="1"></path>
                  <text fill="#74777e" fontFamily="JetBrains Mono" fontSize="8" x="12" y="15">FL300</text>
                  <text fill="#74777e" fontFamily="JetBrains Mono" fontSize="8" x="12" y="45">FL240</text>
                  <text fill="#74777e" fontFamily="JetBrains Mono" fontSize="8" x="12" y="75">FL180</text>
                  <line stroke="#006398" strokeWidth="2" x1="40" x2="160" y1="20" y2="48"></line>
                  <circle cx="40" cy="20" fill="#006398" r="3"></circle>
                  <text fill="#006398" fontFamily="JetBrains Mono" fontSize="8" x="45" y="18">TIGER-11 (H+01:42)</text>
                  <line stroke="#ba1a1a" strokeWidth="2" x1="80" x2="160" y1="80" y2="52"></line>
                  <circle cx="80" cy="80" fill="#ba1a1a" r="3"></circle>
                  <text fill="#ba1a1a" fontFamily="JetBrains Mono" fontSize="8" x="85" y="76">JAGUAR-02 (H+01:42)</text>
                  <rect fill="#ffdad6" fillOpacity="0.6" height="22" width="22" x="150" y="38"></rect>
                  <circle cx="160" cy="50" fill="#ba1a1a" r="5"></circle>
                  <circle cx="160" cy="50" r="10" stroke="#ba1a1a" strokeDasharray="2 2"></circle>
                  <text fill="#ba1a1a" fontFamily="JetBrains Mono" fontSize="8" fontWeight="bold" x="180" y="46">
                    PINCH: WP KILO
                  </text>
                  <text fill="#ba1a1a" fontFamily="JetBrains Mono" fontSize="7" x="180" y="56">
                    &lt;1.2NM / 400ft
                  </text>
                  <line stroke="#006398" strokeDasharray="3 3" strokeWidth="1.5" x1="160" x2="310" y1="48" y2="48"></line>
                  <line stroke="#74777e" strokeDasharray="3 3" strokeWidth="1.5" x1="160" x2="310" y1="52" y2="70"></line>
                  <text fill="#006398" fontFamily="JetBrains Mono" fontSize="8" x="240" y="42">CORRIDOR-ALPHA</text>
                </svg>
              </div>
            </div>

            {/* Conflict List & Stagger Action */}
            <div className="flex flex-col gap-space-sm pt-space-xs">
              <div className="bg-surface-container p-space-sm flex flex-col gap-space-xs border border-outline-variant">
                <div className="flex items-center justify-between">
                  <span className="px-space-xs py-0.5 bg-error text-on-error font-label-caps text-label-caps font-bold">
                    CRITICAL BOTTLENECK // CORRIDOR-ALPHA
                  </span>
                  <span className="font-label-data-sm text-[10px] text-error font-bold">CONFLICT #01</span>
                </div>
                <div className="flex items-center justify-between text-on-surface">
                  <span className="font-label-data-md text-label-data-md font-bold">JAGUAR-02 (AMB) vs TIGER-11 (AMB)</span>
                  <span className="font-label-data-sm text-label-data-sm text-on-surface-variant font-bold">WAYPOINT KILO</span>
                </div>
                <div className="text-on-surface-variant font-body-sm text-[11px] leading-tight flex flex-col gap-0.5 bg-surface-container-lowest p-space-xs border border-outline-variant">
                  <div><span className="font-bold text-primary">Spatio-Temporal Point:</span> 30.82N, 75.14E at MET H+01:42</div>
                  <div><span className="font-bold text-primary">Separation Violation:</span> 1.18 NM lateral (Min Req: 5.0 NM) | 400 ft vertical</div>
                  <div className="text-error font-semibold">
                    <span className="font-bold">Algorithmic Resolution:</span> Stagger departure by +3.0 min for JAGUAR-02 to yield 5.4 NM clean separation.
                  </div>
                </div>
                <div className="flex items-center justify-between pt-space-xs">
                  <span className="font-label-data-sm text-[10px] text-on-surface-variant">
                    ETA ADJUST: JAGUAR-02 ({isStaggerApplied ? 'H+01:45' : 'H+01:42'})
                  </span>
                  <button
                    onClick={handleApplyStagger}
                    disabled={isStaggerApplied}
                    className={`h-6 px-space-md font-headline-md text-[11px] uppercase tracking-wider transition-colors flex items-center gap-space-xs font-bold ${
                      isStaggerApplied
                        ? 'bg-surface-container-highest text-primary border border-outline-variant'
                        : 'bg-secondary text-on-secondary hover:bg-primary shadow-xs'
                    }`}
                    type="button"
                  >
                    <span className="material-symbols-outlined text-[12px]">
                      {isStaggerApplied ? 'done_all' : 'check'}
                    </span>
                    <span>{isStaggerApplied ? 'Stagger Applied (+3m)' : 'Apply +3m Stagger'}</span>
                  </button>
                </div>
              </div>

              {/* Resolved Conflict 2 */}
              <div className="bg-surface-container-low p-space-sm flex flex-col gap-space-xs border border-outline-variant">
                <div className="flex items-center justify-between">
                  <span className="px-space-xs py-0.5 bg-surface-container-highest text-primary font-label-caps text-label-caps font-bold">
                    RESOLVED // CORRIDOR-BRAVO
                  </span>
                  <span className="font-label-data-sm text-[10px] text-on-surface-variant">CONFLICT #02</span>
                </div>
                <div className="flex items-center justify-between text-on-surface">
                  <span className="font-label-data-md text-label-data-md font-bold text-primary">
                    VIPER-31 (CAP) vs CAMEL-01 (TANKER IL-78)
                  </span>
                  <span className="font-label-data-sm text-label-data-sm text-on-surface-variant">WP SIERRA</span>
                </div>
                <p className="font-body-sm text-[11px] text-on-surface-variant leading-tight bg-surface-container-lowest p-space-xs border border-outline-variant">
                  <span className="font-bold text-primary">Resolution Executed:</span> Altitude crossing at FL240 during tanker descent resolved by step climb of VIPER-31 to FL280. Safe vertical separation 4,000 ft confirmed.
                </p>
              </div>

              <div className="bg-surface-container-lowest p-space-sm flex items-center justify-between border border-outline-variant">
                <div className="flex items-center gap-space-xs">
                  <span className="material-symbols-outlined text-[16px] text-secondary">verified</span>
                  <span className="font-label-data-sm text-label-data-sm text-primary font-bold">
                    12 Active Corridors Fully Deconflicted
                  </span>
                </div>
                <span className="font-label-caps text-label-caps text-on-surface-variant font-bold">AUTO-POLL: 5s</span>
              </div>
            </div>
          </div>
        </div>

        {/* COLUMN 2: Tanker AAR Orbit Optimization (4 of 12 = 33%) */}
        <div className="lg:col-span-4 flex flex-col gap-space-sm">
          <div className="bg-surface-container-lowest p-space-md flex flex-col gap-space-sm border border-outline-variant shadow-sm">
            <div className="flex items-center justify-between pb-space-xs border-b border-outline-variant">
              <div className="flex items-center gap-space-xs">
                <span className="material-symbols-outlined text-[16px] text-primary">connecting_airports</span>
                <span className="font-headline-md text-headline-md text-primary font-bold">
                  AAR TANKER ORBIT OPTIMIZATION
                </span>
              </div>
              <span className="font-label-caps text-label-caps px-space-xs py-0.5 bg-secondary-fixed text-on-secondary-fixed uppercase font-bold">
                DINO-SAAR PROTOCOL
              </span>
            </div>
            <p className="font-body-sm text-body-sm text-on-surface-variant">
              Dynamic fuel offload schedule, dual-hose hose-drogue basket queues, and bingo buffer protection.
            </p>

            {/* Tanker Status Card */}
            <div className="bg-surface-container p-space-sm flex flex-col gap-space-xs border border-outline-variant">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-space-xs">
                  <span className="font-label-caps text-label-caps bg-primary text-on-primary px-space-xs py-0.5 font-bold">
                    HEAVY-01
                  </span>
                  <span className="font-headline-md text-headline-md text-primary font-bold">
                    IL-78MKI #RK-101 [CAMEL-01]
                  </span>
                </div>
                <span className="font-label-data-sm text-label-data-sm font-bold text-secondary">ON STATION</span>
              </div>

              <div className="grid grid-cols-2 gap-space-xs font-label-data-sm text-[11px] text-on-surface-variant bg-surface-container-lowest p-space-xs border border-outline-variant">
                <div><span className="text-primary font-semibold">Home Base:</span> Adampur (ADM)</div>
                <div><span className="text-primary font-semibold">Orbit Station:</span> ORBIT-NORTH</div>
                <div><span className="text-primary font-semibold">Track Alt:</span> FL260 (26,000 ft)</div>
                <div><span className="text-primary font-semibold">Offload Pool:</span> 65,000 kg Jet A-1</div>
              </div>

              {/* Fuel Pool Segmentation Bar */}
              <div className="flex flex-col gap-1 pt-space-xs">
                <div className="flex items-center justify-between font-label-caps text-[10px]">
                  <span className="text-on-surface-variant font-bold">TANKER FUEL SEGMENTATION POOL</span>
                  <span className="text-primary font-bold">TOTAL: 65,000 KG</span>
                </div>
                <div className="w-full h-5 bg-surface-container-high flex overflow-hidden border border-outline-variant">
                  <div className="bg-primary h-full flex items-center justify-center text-[9px] font-label-data-sm text-on-primary font-bold" style={{ width: '65.8%' }}>
                    COMMITTED 65.8%
                  </div>
                  <div className="bg-secondary h-full flex items-center justify-center text-[9px] font-label-data-sm text-on-secondary font-bold" style={{ width: '18.5%' }}>
                    BINGO 18.5%
                  </div>
                  <div className="bg-primary-fixed-dim h-full flex items-center justify-center text-[9px] font-label-data-sm text-on-primary-fixed-variant font-bold" style={{ width: '15.7%' }}>
                    FREE 15.7%
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-1 pt-1 font-label-data-sm text-[10px]">
                  <div className="flex flex-col bg-surface-container-lowest p-1 border border-outline-variant">
                    <span className="text-on-surface-variant font-bold">COMMITTED:</span>
                    <span className="text-primary font-bold">42,800 kg</span>
                  </div>
                  <div className="flex flex-col bg-surface-container-lowest p-1 border border-outline-variant">
                    <span className="text-on-surface-variant font-bold">BINGO RESERVE:</span>
                    <span className="text-secondary font-bold">12,000 kg</span>
                  </div>
                  <div className="flex flex-col bg-surface-container-lowest p-1 border border-outline-variant">
                    <span className="text-on-surface-variant font-bold">UNALLOCATED:</span>
                    <span className="text-primary font-bold">10,200 kg</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Receivers Queue */}
            <div className="flex flex-col gap-space-xs">
              <span className="font-label-caps text-label-caps text-on-surface-variant uppercase font-bold">
                SCHEDULED RECEIVER STRIKE PACKAGES
              </span>

              <div className="bg-surface-container-low p-space-sm flex flex-col gap-0.5 border border-outline-variant">
                <div className="flex items-center justify-between">
                  <span className="font-label-data-md text-label-data-md font-bold text-primary">
                    TIGER-11 &amp; 12 (2x SU-30MKI)
                  </span>
                  <span className="px-space-xs py-0.5 bg-primary-container text-on-primary font-label-caps text-[9px] font-bold">
                    BASKET 1 (PORT)
                  </span>
                </div>
                <div className="flex items-center justify-between font-label-data-sm text-[11px] text-on-surface-variant">
                  <span>WINDOW: H+01:30 - H+01:45 MET</span>
                  <span className="text-primary font-bold">14,000 kg (7,000 kg ea)</span>
                </div>
                <div className="flex items-center justify-between pt-0.5">
                  <span className="font-label-data-sm text-[10px] text-secondary font-semibold">
                    STATUS: CONFIRMED - FUEL CLEARED
                  </span>
                  <span className="font-label-caps text-[9px] text-on-surface-variant font-bold">PROBE LOCKED</span>
                </div>
              </div>

              <div className="bg-surface-container-low p-space-sm flex flex-col gap-0.5 border border-outline-variant">
                <div className="flex items-center justify-between">
                  <span className="font-label-data-md text-label-data-md font-bold text-primary">
                    HAWK-21 (1x RAFALE #RB-008)
                  </span>
                  <span className="px-space-xs py-0.5 bg-secondary text-on-secondary font-label-caps text-[9px] font-bold">
                    BASKET 2 (STARBOARD)
                  </span>
                </div>
                <div className="flex items-center justify-between font-label-data-sm text-[11px] text-on-surface-variant">
                  <span>WINDOW: H+02:10 - H+02:22 MET</span>
                  <span className="text-primary font-bold">6,500 kg Jet A-1</span>
                </div>
                <div className="flex items-center justify-between pt-0.5">
                  <span className="font-label-data-sm text-[10px] text-secondary font-semibold">
                    STATUS: CONFIRMED QUEUED
                  </span>
                  <span className="font-label-caps text-[9px] text-on-surface-variant font-bold">STANDBY TANK</span>
                </div>
              </div>

              <div className="bg-surface-container-low p-space-sm flex flex-col gap-0.5 border border-outline-variant">
                <div className="flex items-center justify-between">
                  <span className="font-label-data-md text-label-data-md font-bold text-primary">
                    CONTINGENCY MARGIN (EMERGENCY RTB)
                  </span>
                  <span className="px-space-xs py-0.5 bg-surface-container-highest text-on-surface-variant font-label-caps text-[9px] font-bold">
                    CENTER DROGUE
                  </span>
                </div>
                <div className="flex items-center justify-between font-label-data-sm text-[11px] text-on-surface-variant">
                  <span>WINDOW: H+02:35 - H+02:50 MET</span>
                  <span className="text-primary font-bold">22,300 kg MARGIN</span>
                </div>
                <div className="flex items-center justify-between pt-0.5">
                  <span className="font-label-data-sm text-[10px] text-on-surface-variant font-bold">
                    STANDBY FOR WEAPONS-RELEASE DIVERT
                  </span>
                  <span className="font-label-caps text-[9px] text-primary font-bold">HOT READY</span>
                </div>
              </div>
            </div>

            {/* Orbit Maplet SVG */}
            <div className="bg-surface-container-low p-space-sm flex flex-col gap-space-xs border border-outline-variant">
              <div className="flex items-center justify-between">
                <span className="font-label-caps text-label-caps text-on-surface-variant uppercase font-bold">
                  ORBIT MAPLET // ORBIT-NORTH RACETRACK
                </span>
                <span className="font-label-data-sm text-[10px] text-primary font-bold">LEG LENGTH: 48 NM</span>
              </div>
              <div className="w-full bg-surface-container-lowest p-space-xs border border-outline-variant shadow-xs">
                <svg className="w-full h-20" fill="none" viewBox="0 0 340 80" xmlns="http://www.w3.org/2000/svg">
                  <rect fill="none" height="40" rx="20" stroke="#006398" strokeWidth="2" width="200" x="70" y="20"></rect>
                  <circle cx="70" cy="40" fill="#006398" r="3"></circle>
                  <circle cx="270" cy="40" fill="#006398" r="3"></circle>
                  <text fill="#43474d" fontFamily="JetBrains Mono" fontSize="8" x="60" y="15">ANCHOR WEST (31.10N)</text>
                  <text fill="#43474d" fontFamily="JetBrains Mono" fontSize="8" x="210" y="15">ANCHOR EAST (31.15N)</text>
                  <polygon fill="#001428" points="170,17 180,20 170,23"></polygon>
                  <text fill="#001428" fontFamily="JetBrains Mono" fontSize="9" fontWeight="bold" x="145" y="32">
                    CAMEL-01 [280 KTAS]
                  </text>
                  <path d="M 20 70 L 65 45" stroke="#74777e" strokeDasharray="2 2" strokeWidth="1.5"></path>
                  <text fill="#74777e" fontFamily="JetBrains Mono" fontSize="7" x="15" y="76">INGRESS DELTA</text>
                  <path d="M 275 45 L 320 70" stroke="#74777e" strokeDasharray="2 2" strokeWidth="1.5"></path>
                  <text fill="#74777e" fontFamily="JetBrains Mono" fontSize="7" x="260" y="76">EGRESS TANGO</text>
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* COLUMN 3: F2T2EA Kill-Chain Velocity (4 of 12 = 33%) */}
        <div className="lg:col-span-4 flex flex-col gap-space-sm">
          <div className="bg-surface-container-lowest p-space-md flex flex-col gap-space-sm border border-outline-variant shadow-sm">
            <div className="flex items-center justify-between pb-space-xs border-b border-outline-variant">
              <div className="flex items-center gap-space-xs">
                <span className="material-symbols-outlined text-[16px] text-primary">bolt</span>
                <span className="font-headline-md text-headline-md text-primary font-bold">
                  F2T2EA KILL-CHAIN VELOCITY
                </span>
              </div>
              <span className="font-label-caps text-label-caps px-space-xs py-0.5 bg-secondary-fixed text-on-secondary-fixed uppercase font-bold">
                TIME-CRITICAL TEL TARGET
              </span>
            </div>
            <p className="font-body-sm text-body-sm text-on-surface-variant">
              Comparative cycle duration benchmark: Dynamic MILP orchestration vs legacy manual AOC staff.
            </p>

            <div className="bg-surface-container p-space-sm flex flex-col gap-space-xs border border-outline-variant">
              <div className="grid grid-cols-2 gap-space-sm">
                <div className="bg-surface-container-lowest p-space-sm flex flex-col border border-outline-variant">
                  <span className="font-label-caps text-label-caps text-secondary font-bold">DYNAMIC ORCHESTRATION</span>
                  <span className="font-label-data-lg text-label-data-lg text-secondary font-bold">18.5 MIN</span>
                  <span className="font-label-data-sm text-[10px] text-on-surface-variant">Closed-Loop Algorithmic</span>
                </div>
                <div className="bg-surface-container-lowest p-space-sm flex flex-col border border-outline-variant">
                  <span className="font-label-caps text-label-caps text-on-surface-variant font-bold">MANUAL STAFF LEGACY</span>
                  <span className="font-label-data-lg text-label-data-lg text-on-surface-variant font-bold">72.0 MIN</span>
                  <span className="font-label-data-sm text-[10px] text-error font-semibold">+53.5m Delay (TEL Moves)</span>
                </div>
              </div>
              <div className="flex items-center justify-between bg-secondary-fixed px-space-md py-space-xs text-on-secondary-fixed">
                <span className="font-label-caps text-label-caps font-bold">CYCLE COMPRESSION MARGIN</span>
                <span className="font-label-data-sm text-label-data-sm font-bold">74% TIME REDUCTION (-53.5 MIN)</span>
              </div>
            </div>

            {/* 6-Stage Timeline Breakdown */}
            <div className="flex flex-col gap-1.5">
              <span className="font-label-caps text-label-caps text-on-surface-variant uppercase font-bold">
                6-STAGE F2T2EA CYCLE COMPARISON
              </span>

              {/* Step 1 */}
              <div className="bg-surface-container-low p-space-xs flex flex-col gap-1 border border-outline-variant">
                <div className="flex items-center justify-between">
                  <span className="font-label-data-sm text-[11px] font-bold text-primary">1. FIND // SATELLITE &amp; AEW&amp;C</span>
                  <div className="flex items-center gap-space-sm font-label-data-sm text-[10px]">
                    <span className="text-secondary font-bold">DYNAMIC: 2.0m</span>
                    <span className="text-on-surface-variant">MANUAL: 4.5m</span>
                  </div>
                </div>
                <div className="w-full bg-surface-container-highest h-1.5 flex">
                  <div className="bg-secondary h-full" style={{ width: '44%' }}></div>
                </div>
                <span className="font-label-data-sm text-[9px] text-on-surface-variant">
                  Automated SAR radar cueing + space layer telemetry fusion
                </span>
              </div>

              {/* Step 2 */}
              <div className="bg-surface-container-low p-space-xs flex flex-col gap-1 border border-outline-variant">
                <div className="flex items-center justify-between">
                  <span className="font-label-data-sm text-[11px] font-bold text-primary">2. FIX // GEOLOCATION &amp; CLASSIFY</span>
                  <div className="flex items-center gap-space-sm font-label-data-sm text-[10px]">
                    <span className="text-secondary font-bold">DYNAMIC: 1.5m</span>
                    <span className="text-on-surface-variant">MANUAL: 6.0m</span>
                  </div>
                </div>
                <div className="w-full bg-surface-container-highest h-1.5 flex">
                  <div className="bg-secondary h-full" style={{ width: '25%' }}></div>
                </div>
                <span className="font-label-data-sm text-[9px] text-on-surface-variant">
                  Deep learning multi-sensor correlation against known TEL signatures
                </span>
              </div>

              {/* Step 3 */}
              <div className="bg-surface-container-low p-space-xs flex flex-col gap-1 border border-outline-variant">
                <div className="flex items-center justify-between">
                  <span className="font-label-data-sm text-[11px] font-bold text-primary">3. TRACK // MOTION ESTIMATION</span>
                  <div className="flex items-center gap-space-sm font-label-data-sm text-[10px]">
                    <span className="text-secondary font-bold">DYNAMIC: 2.0m</span>
                    <span className="text-on-surface-variant">MANUAL: 5.5m</span>
                  </div>
                </div>
                <div className="w-full bg-surface-container-highest h-1.5 flex">
                  <div className="bg-secondary h-full" style={{ width: '36%' }}></div>
                </div>
                <span className="font-label-data-sm text-[9px] text-on-surface-variant">
                  Extended Kalman kinematic trajectory filtering
                </span>
              </div>

              {/* Step 4: CRITICAL BOTTLENECK */}
              <div className="bg-error-container/30 p-space-xs flex flex-col gap-1 border border-error/40">
                <div className="flex items-center justify-between">
                  <span className="font-label-data-sm text-[11px] font-bold text-error">
                    4. TARGET // PAIRING (CRITICAL BOTTLENECK)
                  </span>
                  <div className="flex items-center gap-space-sm font-label-data-sm text-[10px]">
                    <span className="text-secondary font-bold">DYNAMIC: 4.5m</span>
                    <span className="text-error font-bold">MANUAL: 38.0m</span>
                  </div>
                </div>
                <div className="w-full bg-surface-container-highest h-2 flex">
                  <div className="bg-secondary h-full" style={{ width: '12%' }}></div>
                  <div className="bg-error h-full" style={{ width: '88%' }}></div>
                </div>
                <div className="font-body-sm text-[10px] text-error font-medium leading-tight">
                  ⚠️ Manual staff requires 38 mins for telephone base coordination &amp; ordnance checking. Dynamic ALNS engine pairs ordnance &amp; fuel in 4.2 seconds.
                </div>
              </div>

              {/* Step 5 */}
              <div className="bg-surface-container-low p-space-xs flex flex-col gap-1 border border-outline-variant">
                <div className="flex items-center justify-between">
                  <span className="font-label-data-sm text-[11px] font-bold text-primary">5. ENGAGE // INGRESS &amp; RELEASE</span>
                  <div className="flex items-center gap-space-sm font-label-data-sm text-[10px]">
                    <span className="text-secondary font-bold">DYNAMIC: 7.0m</span>
                    <span className="text-on-surface-variant">MANUAL: 14.0m</span>
                  </div>
                </div>
                <div className="w-full bg-surface-container-highest h-1.5 flex">
                  <div className="bg-secondary h-full" style={{ width: '50%' }}></div>
                </div>
                <span className="font-label-data-sm text-[9px] text-on-surface-variant">
                  Optimized high-speed supersonic ingress dash + standoff launch
                </span>
              </div>

              {/* Step 6 */}
              <div className="bg-surface-container-low p-space-xs flex flex-col gap-1 border border-outline-variant">
                <div className="flex items-center justify-between">
                  <span className="font-label-data-sm text-[11px] font-bold text-primary">6. ASSESS // POST-STRIKE BDA</span>
                  <div className="flex items-center gap-space-sm font-label-data-sm text-[10px]">
                    <span className="text-secondary font-bold">DYNAMIC: 1.5m</span>
                    <span className="text-on-surface-variant">MANUAL: 4.0m</span>
                  </div>
                </div>
                <div className="w-full bg-surface-container-highest h-1.5 flex">
                  <div className="bg-secondary h-full" style={{ width: '37%' }}></div>
                </div>
                <span className="font-label-data-sm text-[9px] text-on-surface-variant">
                  Automated SIGINT/SAR confirmation of thermal destruction signature
                </span>
              </div>
            </div>

            {/* Stress Test Button */}
            <button
              onClick={handleRunStressTest}
              disabled={isStressTesting}
              className="mt-space-xs w-full h-8 bg-primary text-on-primary font-headline-md text-[11px] uppercase tracking-wider hover:bg-primary-container transition-colors flex items-center justify-center gap-space-sm font-bold shadow-xs"
              type="button"
            >
              <span className={`material-symbols-outlined text-[14px] ${isStressTesting ? 'animate-spin' : ''}`}>
                {isStressTesting ? 'refresh' : 'speed'}
              </span>
              <span>
                {isStressTesting
                  ? 'Computing Dynamic Solution (ALNS)...'
                  : stressCompleteText || 'Run Kill-Chain Stress Test on Fleeting TEL Target'}
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Footer Diagnostic Bar */}
      <div className="w-full bg-surface-container-low px-gutter-desktop py-space-xs flex items-center justify-between font-label-data-sm text-[10px] text-on-surface-variant border border-outline-variant">
        <div className="flex items-center gap-space-lg">
          <span>ACO SOLVER KERNEL: ANYTIME ALNS + MILP BOUND</span>
          <span>//</span>
          <span>SPATIAL SAMPLING: 0.1 SEC INTERVALS</span>
          <span>//</span>
          <span>COLLISION BUFFER: 5.0 NM HORIZ / 2,000 FT VERT</span>
        </div>
        <div className="flex items-center gap-space-md">
          <span className="text-primary font-bold">DECONFLICTION ENGINE: NOMINAL</span>
          <span className="h-2 w-2 rounded-full bg-primary animate-pulse"></span>
        </div>
      </div>
    </div>
  );
};
