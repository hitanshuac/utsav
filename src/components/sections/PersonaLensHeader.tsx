/**
 * Persona Lens Header Component — Displays active role lens, priority focus, and quick-action filters.
 */
import type { FC } from "react";
import { UserCheck } from "lucide-react";
import { PersonaLens } from "../../types/planner";
import { TopicTabId } from "../TopicTabs";

interface PersonaLensHeaderProps {
  persona: PersonaLens;
  guestCount: number;
  cateringPerPlate: number;
  query: string;
  onSearchChange?: (query: string) => void;
  onClearFilter?: () => void;
  onTabChange?: (tab: TopicTabId) => void;
}

export const PersonaLensHeader: FC<PersonaLensHeaderProps> = ({
  persona,
  guestCount,
  cateringPerPlate,
  query,
  onSearchChange,
  onClearFilter,
  onTabChange
}) => {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-xs mb-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-200 text-indigo-700 flex items-center justify-center shrink-0 mt-0.5">
            <UserCheck className="w-4 h-4" aria-hidden="true" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <strong className="text-xs font-bold text-slate-900">
                {persona === "family_host" && "Viewing As: Family Host (Hospitality & Feast Protection Lens)"}
                {persona === "wedding_coordinator" && "Viewing As: Wedding Coordinator (Contractual SLA & Critical Path Lens)"}
                {persona === "community_organizer" && "Viewing As: Community Organizer (Civic Permits & Mass Safety Lens)"}
              </strong>
              <span className="text-[10px] uppercase font-mono font-bold px-1.5 py-0.2 rounded bg-indigo-100 text-indigo-800">
                Active Persona
              </span>
            </div>
            <p className="text-[11px] text-slate-600 mt-1 leading-relaxed">
              {persona === "family_host" &&
                `Focus: Food quality & per-plate costs (₹${cateringPerPlate.toLocaleString("en-IN")}/plate for ${guestCount} guests). Protects the feast meal; trims aesthetic decor or miscellaneous buffers first if budget overruns.`}
              {persona === "wedding_coordinator" &&
                `Focus: Milestone deadlines & vendor contracts. Enforces timeline prerequisites and flags missing 18% GST or unverified quotes.`}
              {persona === "community_organizer" &&
                `Focus: Municipal NOCs & crowd safety. Prioritizes Fire Safety permits (T-40d), stage permissions, and volunteer assignments for ${guestCount} attendees.`}
            </p>
          </div>
        </div>
      </div>

      {/* Dynamic Role Quick Action Pills */}
      <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center gap-2 flex-wrap text-xs">
        <span className="text-[10px] uppercase font-mono font-bold text-slate-400">Role Shortcuts:</span>
        {persona === "family_host" && (
          <>
            <button
              type="button"
              onClick={() => onSearchChange?.("catering")}
              className="px-2.5 py-1 rounded-md text-[11px] font-semibold bg-amber-50 hover:bg-amber-100 border border-amber-300 text-amber-900 cursor-pointer transition-colors"
            >
              🍲 Focus: Feast &amp; Catering
            </button>
            <button
              type="button"
              onClick={() => onSearchChange?.("venue")}
              className="px-2.5 py-1 rounded-md text-[11px] font-semibold bg-amber-50 hover:bg-amber-100 border border-amber-300 text-amber-900 cursor-pointer transition-colors"
            >
              🏰 Focus: Venue &amp; Hospitality
            </button>
            {onTabChange && (
              <button
                type="button"
                onClick={() => onTabChange("budget")}
                className="px-2.5 py-1 rounded-md text-[11px] font-semibold bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-800 cursor-pointer transition-colors"
              >
                ✨ Protect Feast in Trade-Offs →
              </button>
            )}
          </>
        )}

        {persona === "wedding_coordinator" && (
          <>
            <button
              type="button"
              onClick={() => onSearchChange?.("estimate")}
              className="px-2.5 py-1 rounded-md text-[11px] font-semibold bg-blue-50 hover:bg-blue-100 border border-blue-300 text-blue-900 cursor-pointer transition-colors"
            >
              ⚡ Focus: Unverified Quotes
            </button>
            {onTabChange && (
              <button
                type="button"
                onClick={() => onTabChange("vendor")}
                className="px-2.5 py-1 rounded-md text-[11px] font-semibold bg-indigo-50 hover:bg-indigo-100 border border-indigo-300 text-indigo-900 cursor-pointer transition-colors"
              >
                📜 Audit Vendor Quotes (18% GST) →
              </button>
            )}
            {onTabChange && (
              <button
                type="button"
                onClick={() => onTabChange("overview")}
                className="px-2.5 py-1 rounded-md text-[11px] font-semibold bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-800 cursor-pointer transition-colors"
              >
                ⏱️ Review Critical Path SLAs →
              </button>
            )}
          </>
        )}

        {persona === "community_organizer" && (
          <>
            <button
              type="button"
              onClick={() => onSearchChange?.("logistics")}
              className="px-2.5 py-1 rounded-md text-[11px] font-semibold bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 text-emerald-900 cursor-pointer transition-colors"
            >
              🏛️ Focus: Logistics &amp; Power
            </button>
            <button
              type="button"
              onClick={() => onSearchChange?.("permit")}
              className="px-2.5 py-1 rounded-md text-[11px] font-semibold bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 text-emerald-900 cursor-pointer transition-colors"
            >
              📢 Municipal NOC &amp; Fire Safety
            </button>
            {onTabChange && (
              <button
                type="button"
                onClick={() => onTabChange("overview")}
                className="px-2.5 py-1 rounded-md text-[11px] font-semibold bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-800 cursor-pointer transition-colors"
              >
                👥 Volunteer Roster Milestones →
              </button>
            )}
          </>
        )}

        {query && onClearFilter && (
          <button
            type="button"
            onClick={onClearFilter}
            className="text-[11px] font-semibold text-rose-700 hover:underline cursor-pointer ml-auto"
          >
            [Clear Filter]
          </button>
        )}
      </div>
    </div>
  );
};
