import React, { useState } from "react";
import { Search, ChevronDown, Check, ShieldCheck } from "lucide-react";
import { PersonaLens } from "../types/planner";
import { JUDGE_PRESETS, JudgePreset } from "../lib/presets";

interface AppBarProps {
  currentPersona: PersonaLens;
  onSelectPersona: (persona: PersonaLens) => void;
  activePresetId: string;
  onSelectPreset: (preset: JudgePreset) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
}

export const AppBar: React.FC<AppBarProps> = ({
  currentPersona,
  onSelectPersona,
  activePresetId,
  onSelectPreset,
  searchQuery,
  onSearchChange
}) => {
  const [roleMenuOpen, setRoleMenuOpen] = useState(false);
  const [presetMenuOpen, setPresetMenuOpen] = useState(false);

  const personas: { id: PersonaLens; label: string; desc: string }[] = [
    { id: "family_host", label: "Family Host", desc: "Hospitality & Per-Plate Focus" },
    { id: "wedding_coordinator", label: "Wedding Coordinator", desc: "DAG Critical Path & Vendor SLAs" },
    { id: "community_organizer", label: "Community Organizer", desc: "Civic Permits & Mass Rationing" }
  ];

  const currentRoleLabel = personas.find((p) => p.id === currentPersona)?.label || "Family Host";

  return (
    <header className="utsav-r1-appbar" aria-label="Top Application Bar">
      {/* Brand & 4 Triage Dots */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <span className="font-extrabold text-xl tracking-tight text-slate-900 flex items-center gap-1.5">
            <span style={{ color: "var(--c-primary)" }}>Utsav</span>AI
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
          Deterministic Engine
        </span>
      </div>

      {/* Center: Instant Search / Filter Input */}
      <div className="hidden md:flex flex-1 max-w-md mx-4">
        <div className="relative w-full">
          <Search
            className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2"
            aria-hidden="true"
          />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search categories, milestones, or vendor clauses..."
            className="utsav-input pl-9 pr-3 py-1.5 text-xs rounded-lg"
            aria-label="Filter ledger items, milestones, and vendor clauses"
          />
        </div>
      </div>

      {/* Right Controls: Role Lens Dropdown + 1-Click Judge Scenario Preset Selector */}
      <div className="flex items-center gap-2.5">
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
            <span className="text-slate-500 font-normal">Lens:</span>
            <span className="font-semibold text-slate-800">{currentRoleLabel}</span>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400" aria-hidden="true" />
          </button>

          {roleMenuOpen && (
            <div
              role="menu"
              aria-label="Select Persona Lens"
              className="absolute right-0 mt-1.5 w-60 bg-white border border-slate-200 rounded-xl shadow-lg py-1.5 z-50 flex flex-col"
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
                    currentPersona === p.id ? "bg-amber-50/60 font-semibold text-slate-900" : "text-slate-700"
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
            <span>Judge Presets</span>
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
      </div>
    </header>
  );
};
