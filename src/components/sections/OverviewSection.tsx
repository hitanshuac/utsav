/**
 * Overview Section Component — Executive event execution summary and milestone health metrics.
 */
import type { FC } from "react";
import { Shield, ArrowRight } from "lucide-react";
import { BudgetItem, MilestoneTask, PersonaLens } from "../../types/planner";
import { TopicTabId } from "../TopicTabs";

interface OverviewSectionProps {
  persona: PersonaLens;
  guestCount: number;
  baseGuestCount: number;
  cateringPerPlate: number;
  milestones: MilestoneTask[];
  totalBudgetCap: number;
  budgetItems: BudgetItem[];
  bottlenecks: string[];
  daysRemaining: number;
  onTabChange?: (tab: TopicTabId) => void;
}

export const OverviewSection: FC<OverviewSectionProps> = ({
  persona,
  guestCount,
  baseGuestCount,
  cateringPerPlate,
  milestones,
  totalBudgetCap,
  budgetItems,
  bottlenecks,
  daysRemaining,
  onTabChange
}) => {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3 mb-3">
        <div>
          <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
            <Shield className="w-4 h-4 text-emerald-600" aria-hidden="true" />
            <span>Executive Event Execution Summary</span>
          </h3>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Step 1 Milestone Progress &amp; Core Health Indicators
          </p>
        </div>

        {onTabChange && (
          <button
            type="button"
            onClick={() => onTabChange("budget")}
            className="utsav-btn utsav-btn-primary text-xs px-3 py-1.5 font-bold shadow-xs flex items-center gap-1.5 self-start sm:self-auto cursor-pointer"
          >
            <span>Proceed to Step 2: Budget &amp; Trade-Offs</span>
            <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
        {persona === "family_host" && (
          <>
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-2.5">
              <span className="text-slate-500 text-[11px] block">Confirmed Guests</span>
              <strong className="text-slate-900 font-bold font-mono text-sm">
                {guestCount} Pax ({(guestCount / baseGuestCount).toFixed(2)}x)
              </strong>
            </div>
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-2.5">
              <span className="text-slate-500 text-[11px] block">Feast Cost / Plate</span>
              <strong className="text-emerald-700 font-bold font-mono text-sm">
                ₹{cateringPerPlate.toLocaleString("en-IN")}/plate
              </strong>
            </div>
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-2.5">
              <span className="text-slate-500 text-[11px] block">Hospitality Milestones</span>
              <strong className="text-slate-900 font-bold font-mono text-sm">
                {milestones.filter((m) => (m.category === "catering" || m.category === "venue") && m.status === "completed").length} / {milestones.filter((m) => m.category === "catering" || m.category === "venue").length} Locked
              </strong>
            </div>
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-2.5">
              <span className="text-slate-500 text-[11px] block">Feast &amp; Catering Buffer</span>
              <strong className="text-emerald-600 font-bold font-mono text-sm">
                Protected (Catering on track)
              </strong>
            </div>
          </>
        )}

        {persona === "wedding_coordinator" && (
          <>
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-2.5">
              <span className="text-slate-500 text-[11px] block">Budget Ceiling</span>
              <strong className="text-slate-900 font-bold font-mono text-sm">
                ₹{totalBudgetCap.toLocaleString("en-IN")}
              </strong>
            </div>
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-2.5">
              <span className="text-slate-500 text-[11px] block">Unverified Estimates</span>
              <strong className="text-amber-700 font-bold font-mono text-sm">
                {budgetItems.filter((b) => b.isEstimate).length} Quotes Pending
              </strong>
            </div>
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-2.5">
              <span className="text-slate-500 text-[11px] block">Critical Path Bottlenecks</span>
              <strong
                className={`font-bold font-mono text-sm ${
                  bottlenecks.length > 0 ? "text-red-600" : "text-emerald-600"
                }`}
              >
                {bottlenecks.length > 0 ? `${bottlenecks.length} Blocked` : "All Clear"}
              </strong>
            </div>
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-2.5">
              <span className="text-slate-500 text-[11px] block">Lead Time Deficits</span>
              <strong className="text-indigo-700 font-bold font-mono text-sm">
                {milestones.filter((m) => (m.leadTimeDays || m.deadlineDaysBeforeEvent) > daysRemaining && m.status !== "completed").length} Tasks Due
              </strong>
            </div>
          </>
        )}

        {persona === "community_organizer" && (
          <>
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-2.5">
              <span className="text-slate-500 text-[11px] block">Mass Headcount</span>
              <strong className="text-slate-900 font-bold font-mono text-sm">
                {guestCount} Expected Attendees
              </strong>
            </div>
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-2.5">
              <span className="text-slate-500 text-[11px] block">Civic Permits &amp; NOC</span>
              <strong className="text-emerald-700 font-bold font-mono text-sm">
                {milestones.filter((m) => m.title.toLowerCase().includes("permit") || m.title.toLowerCase().includes("noc") || m.title.toLowerCase().includes("safety")).every((m) => m.status === "completed") ? "All Cleared" : "Action Needed"}
              </strong>
            </div>
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-2.5">
              <span className="text-slate-500 text-[11px] block">Power &amp; Sound Grid</span>
              <strong className="text-slate-900 font-bold font-mono text-sm">
                {budgetItems.find((b) => b.category === "logistics")?.allocatedAmount ? `₹${budgetItems.find((b) => b.category === "logistics")!.allocatedAmount.toLocaleString("en-IN")}` : "Allocated"}
              </strong>
            </div>
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-2.5">
              <span className="text-slate-500 text-[11px] block">Logistics Tasks</span>
              <strong className="text-indigo-700 font-bold font-mono text-sm">
                {milestones.filter((m) => m.category === "logistics").length} Crew Milestones
              </strong>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
