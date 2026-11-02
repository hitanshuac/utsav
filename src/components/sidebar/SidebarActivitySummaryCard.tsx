/**
 * Sidebar Activity Summary & Loop-Closure Counter Card.
 */
import type { FC } from "react";
import { useState, useEffect } from "react";
import { Clock } from "lucide-react";
import { getActivityStats, subscribeToEventLogger } from "../../lib/services/event-logger";

interface SidebarActivitySummaryCardProps {
  onOpenActivityHistory?: () => void;
}

export const SidebarActivitySummaryCard: FC<SidebarActivitySummaryCardProps> = ({
  onOpenActivityHistory
}) => {
  const [stats, setStats] = useState(() => getActivityStats());

  useEffect(() => {
    const update = () => setStats(getActivityStats());
    update();
    const unsub = subscribeToEventLogger(update);
    return () => unsub();
  }, []);

  return (
    <div className="utsav-card shadow-xs">
      <div className="utsav-card-header">
        <h2 className="utsav-card-title flex items-center gap-2">
          <Clock className="w-4 h-4 text-orange-600" aria-hidden="true" />
          <span>Activity &amp; Loop Closure</span>
        </h2>
        <span className="utsav-badge utsav-badge-ontrack text-[10px]">
          {stats.total} Logged
        </span>
      </div>

      <p className="text-xs text-slate-500 mb-3">
        Ephemeral in-memory activity tracking across all modifications and vendor dispatches.
      </p>

      <div className="grid grid-cols-2 gap-2 text-xs mb-3 font-mono">
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-2 text-center">
          <span className="text-[10px] text-slate-500 uppercase block">Pending Calls</span>
          <strong className="text-amber-700 font-bold text-sm">{stats.pendingCallCount}</strong>
        </div>
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-2 text-center">
          <span className="text-[10px] text-slate-500 uppercase block">Closed Loops</span>
          <strong className="text-emerald-700 font-bold text-sm">{stats.closedLoopCount}</strong>
        </div>
      </div>

      {onOpenActivityHistory && (
        <button
          type="button"
          onClick={onOpenActivityHistory}
          className="utsav-btn utsav-btn-secondary w-full text-xs py-2 font-semibold flex items-center justify-center gap-1.5 cursor-pointer"
        >
          <span>📜 Open Full Activity History Log →</span>
        </button>
      )}
    </div>
  );
};
