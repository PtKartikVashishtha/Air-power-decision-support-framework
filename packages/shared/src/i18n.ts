/**
 * Bilingual Military Tactical Localization (English / Hindi)
 * Integrated for Ministry of Defence (MoD) / Joint Air Command Evaluation
 */

export type SupportedLocale = 'en' | 'hi';

export const MILITARY_DICTIONARY: Record<string, { en: string; hi: string }> = {
  // Navigation & System Titles
  APP_TITLE: { en: 'AIR POWER // C2 DECISION-SUPPORT', hi: 'वायु शक्ति // सी२ निर्णय-समर्थन' },
  SECTOR_SUBTITLE: { en: 'WESTERN SECTOR // 6 BASES // 68 AIRFRAMES', hi: 'पश्चिमी कमान // ६ वायुसेना अड्डे // ६८ विमान' },
  UNCLASSIFIED_BANNER: {
    en: 'CLASSIFICATION: NOTIONAL / TRAINING DATA ONLY — UNCLASSIFIED DEFENCE SIMULATION (SIH-26250)',
    hi: 'वर्गीकरण: केवल काल्पनिक / प्रशिक्षण डेटा — अवर्गीकृत रक्षा सिमुलेशन (SIH-26250)',
  },

  // Tabs
  TAB_COP: { en: 'COMMON OPERATING PICTURE', hi: 'सामान्य प्रचालन चित्र (COP)' },
  TAB_RES: { en: 'RESOURCE BOARD', hi: 'संसाधन पट्ट (RESOURCE BOARD)' },
  TAB_MP: { en: 'MISSION PLANNER & ATO', hi: 'अभियान योजनाकार एवं वायु कार्य आदेश (ATO)' },
  TAB_PIL: { en: 'PLANNER-IN-THE-LOOP STUDIO', hi: 'मानव-सहयोगी योजना केंद्र (PIL)' },
  TAB_COA: { en: 'COA COMPARISON STUDIO', hi: 'कार्ययोजना तुलना केंद्र (COA)' },
  TAB_RETASK: { en: 'DYNAMIC RETASKING CONSOLE', hi: 'सक्रिय पुनर्लक्ष्यीकरण कंसोल (RETASK)' },
  TAB_DECONF: { en: '4D DECONFLICTION & TANKERS', hi: '४डी विसंबंधन एवं ईंधन भरण (TANKERS)' },
  TAB_WARGAME: { en: 'CLOSED-LOOP WARGAME SIMULATOR', hi: 'युद्ध खेल अनुकरण (WARGAME)' },
  TAB_EXPORT: { en: 'ATO / ACO EXPORT', hi: 'वायु कार्य आदेश निर्यात (ATO/ACO)' },
  TAB_BENCH: { en: 'BENCHMARK EVIDENCE HARNESS', hi: 'मानक प्रमाण परीक्षण (BENCHMARK)' },
  TAB_CHALLENGE: { en: 'MANUAL CHALLENGE MODE', hi: 'मानव योजना चुनौती (CHALLENGE)' },
  TAB_PRED: { en: 'PREDICTIVE ANALYTICS', hi: 'भविष्यसूचक विश्लेषण (PREDICTIVE)' },
  TAB_WHATIF: { en: 'WHAT-IF SANDBOX', hi: 'परिदृश्य सैंडबॉक्स (WHAT-IF)' },
  TAB_AUDIT: { en: 'AUDIT & FEEDS', hi: 'अंकेक्षण एवं सेंसर धाराएं (AUDIT)' },
  TAB_CONTESTED: { en: 'CONTESTED & EDGE OPS', hi: 'प्रतिस्पर्धी एवं अग्रिम प्रचालन (EDGE OPS)' },
  TAB_TRAINER: { en: 'STAFF COLLEGE TRAINER & AAR', hi: 'स्टाफ कॉलेज प्रशिक्षण एवं समीक्षा (AAR)' },
  TAB_XAI: { en: 'DECISION QUALITY & XAI', hi: 'निर्णय गुणवत्ता एवं व्याख्या (XAI)' },

  // Tactical Terms
  AIR_SUPERIORITY: { en: 'Air Superiority', hi: 'वायु श्रेष्ठता' },
  STRIKE: { en: 'Precision Strike', hi: 'सटीक प्रहार' },
  SEAD: { en: 'DEAD/SEAD Air Defense Suppression', hi: 'वायु रक्षा दमन (SEAD)' },
  TANKER: { en: 'Air-to-Air Refueling', hi: 'हवा से हवा में ईंधन भरण' },
  AEW_C: { en: 'Airborne Early Warning & Control', hi: 'हवाई प्रारंभिक चेतावनी एवं नियंत्रण' },
  TARGET: { en: 'Target', hi: 'लक्ष्य' },
  THREAT: { en: 'Threat', hi: 'संकट / खतरा' },
  FUEL: { en: 'Fuel Planned', hi: 'नियोजित ईंधन' },
  PILOT: { en: 'Pilot / Aircrew', hi: 'वैमानिक दल' },
  AIRBASE: { en: 'Airbase', hi: 'वायुसेना अड्डा' },
  RESERVE: { en: 'Strategic Reserve', hi: 'सामरिक आरक्षित बल' },
  SURVIVABILITY: { en: 'Survivability', hi: 'उत्तरजीविता' },
};

export function t(key: string, locale: SupportedLocale = 'en'): string {
  const entry = MILITARY_DICTIONARY[key];
  if (!entry) return key;
  return locale === 'hi' ? entry.hi : entry.en;
}
