import React, { useState, useEffect } from "react";
import { ChevronDown, Search, ShieldCheck, Check, Clock } from "lucide-react";
import { PersonaLens } from "../types/planner";
import { JUDGE_PRESETS, JudgePreset } from "../lib/presets";
import { getActivityEvents, subscribeToEventLogger } from "../lib/services/event-logger";
import { SupportedLanguage, TRANSLATIONS } from "../lib/i18n";

interface AppBarProps {
  currentPersona: PersonaLens;
  onSelectPersona: (persona: PersonaLens) => void;
  activePresetId?: string;
  onSelectPreset: (preset: JudgePreset) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onOpenActivityHistory?: () => void;
  language?: SupportedLanguage;
  onLanguageChange?: (lang: SupportedLanguage) => void;
}

export const AppBar: React.FC<AppBarProps> = ({
  currentPersona,
  onSelectPersona,
  activePresetId,
  onSelectPreset,
  searchQuery,
  onSearchChange,
  onOpenActivityHistory,
  language = "en",
  onLanguageChange
}) => {
  const t = TRANSLATIONS[language] || TRANSLATIONS.en;
  const [roleMenuOpen, setRoleMenuOpen] = useState(false);
  const [presetMenuOpen, setPresetMenuOpen] = useState(false);
  const [activityCount, setActivityCount] = useState<number>(0);

  useEffect(() => {
    const updateCount = () => setActivityCount(getActivityEvents().length);
    updateCount();
    const unsubscribe = subscribeToEventLogger(updateCount);
    return () => unsubscribe();
  }, []);

  const personas: { id: PersonaLens; label: string; desc: string }[] = [
    { id: "family_host", label: t.personaFamilyHost, desc: t.personaFamilyHostDesc },
    { id: "wedding_coordinator", label: t.personaWeddingCoord, desc: t.personaWeddingCoordDesc },
    { id: "community_organizer", label: t.personaCommunityOrg, desc: t.personaCommunityOrgDesc }
  ];

  const currentRoleLabel = personas.find((p) => p.id === currentPersona)?.label || t.personaFamilyHost;

  return (
    <header className="utsav-r1-appbar" aria-label="Top Application Bar">
      {/* Brand & 4 Triage Dots */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <span className="font-extrabold text-xl tracking-tight text-slate-900 flex items-center gap-1.5">
            <span style={{ color: "var(--c-primary)" }}>{t.appName.split(" ")[0]}</span>
            {t.appName.includes(" ") ? t.appName.split(" ").slice(1).join(" ") : "AI"}
          </span>
          {/* 4-Color Triage Dots: Crimson (Tier 1), Amber (Tier 2), Indigo (Tier 3), Emerald (Tier 4) */}
          <div
            className="flex items-center gap-1 ml-1"
            title="Triage Bands: Critical (Red) · Bottleneck (Amber) · Clarification (Indigo) · On-Track (Emerald)"
            aria-label="Triage status indicator dots"
          >
            <span className="w-2.5 h-2.5 rounded-full bg-rose-600 inline-block" aria-hidden="true" />
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" aria-hidden="true" />
            <span className="w-2.5 h-2.5 rounded-full bg-indigo-600 inline-block" aria-hidden="true" />
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 inline-block" aria-hidden="true" />
          </div>
        </div>

        <span className="hidden sm:inline-flex utsav-badge utsav-badge-ontrack ml-2">
          {t.deterministicEngine}
        </span>
      </div>

      {/* Center: Instant Search / Filter Input */}
      <div className="hidden md:flex flex-1 max-w-md mx-4">
        <div className="utsav-search-container">
          <Search size={16} className="text-slate-400 shrink-0" aria-hidden="true" />
          <input
            id="global-search-input"
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            onInput={(e) => onSearchChange((e.target as HTMLInputElement).value)}
            placeholder={t.searchPlaceholder}
            className="utsav-search-input"
            aria-label="Filter ledger items, milestones, and vendor clauses"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => onSearchChange("")}
              className="text-slate-400 hover:text-slate-700 text-xs px-1.5 py-0.5 rounded font-bold cursor-pointer shrink-0"
              aria-label="Clear search query"
            >
              ✕ Clear
            </button>
          )}
        </div>
      </div>

      {/* Right Controls: Role Lens Dropdown + Presets + Activity Log */}
      <div className="flex items-center gap-2">
        {/* Role Lens Dropdown with role="menu" */}
        <div className="relative">
          <button
            type="button"
            onClick={() => {
              setRoleMenuOpen((prev) => !prev);
              setPresetMenuOpen(false);
            }}
            aria-haspopup="menu"
            aria-expanded={roleMenuOpen}
            aria-label={`Role Lens: ${currentRoleLabel}`}
            className="utsav-btn utsav-btn-secondary text-xs px-2.5 py-1.5 font-medium flex items-center gap-1.5"
          >
            <span className="text-slate-500 font-normal">{t.roleLensLabel}:</span>
            <span className="font-semibold text-slate-800">{currentRoleLabel}</span>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400" aria-hidden="true" />
          </button>

          {roleMenuOpen && (
            <div
              role="menu"
              aria-label="Select Persona Lens"
              className="absolute right-0 mt-1.5 w-64 bg-white border border-slate-200 rounded-xl shadow-lg py-1.5 z-50 flex flex-col"
            >
              {personas.map((p) => (
                <button
                  key={p.id}
                  role="menuitem"
                  onClick={() => {
                    onSelectPersona(p.id);
                    setRoleMenuOpen(false);
                  }}
                  className={`w-full text-left px-3 py-2 text-xs flex items-start justify-between transition-colors hover:bg-slate-50 ${
                    currentPersona === p.id ? "bg-amber-50 font-semibold text-slate-900" : "text-slate-700"
                  }`}
                >
                  <div>
                    <div className="font-semibold text-slate-900">{p.label}</div>
                    <div className="text-[11px] text-slate-500">{p.desc}</div>
                  </div>
                  {currentPersona === p.id && (
                    <Check className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" aria-hidden="true" />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* 1-Click Judge Scenario Presets Selector */}
        <div className="relative">
          <button
            type="button"
            onClick={() => {
              setPresetMenuOpen((prev) => !prev);
              setRoleMenuOpen(false);
            }}
            aria-haspopup="menu"
            aria-expanded={presetMenuOpen}
            aria-label="Judge Scenario Presets"
            className="utsav-btn utsav-btn-primary text-xs px-3 py-1.5 font-semibold flex items-center gap-1.5 shadow-sm"
          >
            <ShieldCheck className="w-3.5 h-3.5" aria-hidden="true" />
            <span className="hidden sm:inline">{t.judgePresets}</span>
            <ChevronDown className="w-3.5 h-3.5" aria-hidden="true" />
          </button>

          {presetMenuOpen && (
            <div
              role="menu"
              aria-label="Judge Scenario Presets Menu"
              className="absolute right-0 mt-1.5 w-72 bg-white border border-slate-200 rounded-xl shadow-lg py-1.5 z-50 flex flex-col"
            >
              <div className="px-3 py-1 text-[11px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 mb-1">
                Hack2Skill Presets (&lt;10ms Load)
              </div>
              {Object.values(JUDGE_PRESETS).map((preset) => {
                const isActive = activePresetId === preset.id;
                return (
                  <button
                    key={preset.id}
                    role="menuitem"
                    onClick={() => {
                      onSelectPreset(preset);
                      setPresetMenuOpen(false);
                    }}
                    className={`w-full text-left px-3 py-2 text-xs flex items-start justify-between transition-colors hover:bg-slate-50 ${
                      isActive ? "bg-orange-50 font-semibold text-slate-900" : "text-slate-700"
                    }`}
                  >
                    <div>
                      <div className="font-semibold text-slate-900">{preset.name}</div>
                      <div className="text-[11px] text-slate-500">
                        ₹{(preset.budgetCap / 100000).toFixed(1)}L Cap · {preset.guestCount} Pax · {preset.daysRemaining}d Out
                      </div>
                    </div>
                    {isActive && (
                      <Check className="w-4 h-4 text-orange-600 shrink-0 mt-0.5" aria-hidden="true" />
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Activity Log & History Button with Live Badge */}
        {onOpenActivityHistory && (
          <button
            type="button"
            onClick={onOpenActivityHistory}
            className="utsav-btn bg-slate-900 hover:bg-slate-800 text-white text-xs px-2.5 py-1.5 font-semibold flex items-center gap-1.5 shadow-sm"
            aria-label={`Activity Log and History (${activityCount} events recorded)`}
          >
            <Clock className="w-3.5 h-3.5 text-orange-400" aria-hidden="true" />
            <span className="hidden sm:inline">{t.activityLog}</span>
            <span className="bg-orange-600 text-white text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold">
              {activityCount}
            </span>
          </button>
        )}
      </div>
    </header>
  );
};
