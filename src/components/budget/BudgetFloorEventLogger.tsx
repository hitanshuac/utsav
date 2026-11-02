/**
 * Real-time floor operations logger component.
 */
import type { FC } from "react";
import { useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { BudgetItem, EventCategory } from "../../types/planner";
import { logActivityEvent } from "../../lib/services/event-logger";

interface BudgetFloorEventLoggerProps {
  budgetItems: BudgetItem[];
  onLogRealTimeEvent?: (description: string, category?: string) => void;
}

export const BudgetFloorEventLogger: FC<BudgetFloorEventLoggerProps> = ({
  budgetItems,
  onLogRealTimeEvent
}) => {
  const [liveEventText, setLiveEventText] = useState<string>("" );
  const [liveEventCategory, setLiveEventCategory] = useState<EventCategory>("catering");

  const handleCommitLiveEvent = () => {
    if (!liveEventText.trim()) return;
    if (onLogRealTimeEvent) {
      onLogRealTimeEvent(liveEventText.trim(), liveEventCategory);
    } else {
      logActivityEvent({
        taskId: `live-${Date.now()}`,
        taskTitle: `Real-Time Event: ${liveEventText.trim().slice(0, 40)}`,
        category: liveEventCategory,
        channel: "system",
        vendorName: "Live Floor Ops",
        recipient: "Coordinator Team",
        summary: `[Real-Time Event Tracker]: ${liveEventText.trim()}`,
        loopStatus: "closed"
      });
    }
    setLiveEventText("");
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs mt-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3 mb-3">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-indigo-600 shrink-0" aria-hidden="true" />
          <div>
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wide">
              Real-Time Operations Tracker · Closed-Loop Execution
            </h3>
            <span className="text-[11px] text-slate-500">
              Track live ground changes, log vendor updates, and maintain an immutable audit trail.
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs font-mono">
          <span className="bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded font-bold">
            {budgetItems.filter((b) => !b.isEstimate).length}/{budgetItems.length} Quotes Locked
          </span>
          <span className="bg-indigo-50 text-indigo-800 border border-indigo-200 px-2 py-0.5 rounded font-bold">
            Active Floor Ops
          </span>
        </div>
      </div>

      <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
        <label htmlFor="live-event-input" className="text-xs font-semibold text-slate-700 block mb-1.5">
          + Log Real-Time Ground Change / Vendor Decision:
        </label>
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            id="live-event-input"
            type="text"
            value={liveEventText}
            onChange={(e) => setLiveEventText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && liveEventText.trim()) {
                handleCommitLiveEvent();
              }
            }}
            placeholder="e.g. Extra 25 chairs requested by family, or Caterer confirmed arrival at 4:30 PM..."
            className="flex-1 px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 outline-none focus:border-indigo-500"
          />
          <select
            value={liveEventCategory}
            onChange={(e) => setLiveEventCategory(e.target.value as EventCategory)}
            className="px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-medium text-slate-700 outline-none"
          >
            <option value="catering">Catering</option>
            <option value="decor">Decor</option>
            <option value="venue">Venue</option>
            <option value="photography">Photography</option>
            <option value="logistics">Logistics</option>
            <option value="miscellaneous">Miscellaneous</option>
          </select>
          <button
            type="button"
            onClick={handleCommitLiveEvent}
            disabled={!liveEventText.trim()}
            className="utsav-btn utsav-btn-primary text-xs px-3.5 py-1.5 font-bold shrink-0 disabled:opacity-50 cursor-pointer"
          >
            Record &amp; Close Loop
          </button>
        </div>
        <p className="text-[10px] text-slate-500 mt-1.5">
          Every logged event is timestamped, categorized, and added to the immutable audit trail with <code>loopStatus: closed</code>.
        </p>
      </div>
    </div>
  );
};
