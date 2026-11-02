/**
 * Live Activity & Loop-Closure Audit History Drawer & Section.
 */
import React, { useState, useEffect } from "react";
import { Clock, X, Filter } from "lucide-react";
import {
  ActivityLogEvent,
  getActivityEvents,
  getActivityStats,
  closeTaskActivityLoop,
  subscribeToEventLogger,
  getVendorCommunicationMetrics,
  VendorCommunicationMetrics
} from "../lib/services/event-logger";
import { VendorMetricsCard } from "./activity/VendorMetricsCard";
import { ActivityEventItem } from "./activity/ActivityEventItem";

interface ActivityHistoryPanelProps {
  isOpen?: boolean;
  onClose?: () => void;
  isEmbedded?: boolean;
}

export const ActivityHistoryPanel: React.FC<ActivityHistoryPanelProps> = ({
  isOpen = true,
  onClose,
  isEmbedded = false
}) => {
  const [events, setEvents] = useState<ActivityLogEvent[]>([]);
  const [filterChannel, setFilterChannel] = useState<string>("all");
  const [selectedVendorForMetrics, setSelectedVendorForMetrics] = useState<string | null>(null);

  const reload = () => {
    setEvents(getActivityEvents());
  };

  useEffect(() => {
    reload();
    const unsubscribe = subscribeToEventLogger(() => {
      reload();
    });
    return () => unsubscribe();
  }, []);

  const stats = getActivityStats();

  const vendorNames = Array.from(
    new Set(events.map((e) => e.vendorName).filter(Boolean))
  ).filter((v) => v !== "Deterministic Engine" && v !== "System");

  const activeVendorMetrics: VendorCommunicationMetrics | null = selectedVendorForMetrics
    ? getVendorCommunicationMetrics(selectedVendorForMetrics)
    : vendorNames.length > 0
    ? getVendorCommunicationMetrics(vendorNames[0])
    : null;

  const handleCloseLoop = (event: ActivityLogEvent) => {
    closeTaskActivityLoop({
      taskId: event.taskId,
      taskTitle: event.taskTitle,
      category: event.category,
      vendorName: event.vendorName,
      recipient: event.recipient,
      closedBy: "human_call",
      resolutionNote: `Confirmed deliverables and timeline with ${event.vendorName} via verbal phone call.`
    });
  };

  const filteredEvents = events.filter((e) => {
    if (filterChannel === "all") return true;
    if (filterChannel === "awaiting_call") return e.loopStatus === "awaiting_call";
    if (filterChannel === "loop_closed") return e.loopStatus === "closed" || e.channel === "loop_closed";
    if (filterChannel === "system") return e.channel === "system";
    if (filterChannel === "whatsapp") return e.channel === "whatsapp";
    if (filterChannel === "email") return e.channel === "email";
    return true;
  });

  const content = (
    <div className="space-y-4">
      {/* Vendor Communication Metrics Card */}
      {activeVendorMetrics && (
        <VendorMetricsCard
          metrics={activeVendorMetrics}
          vendorNames={vendorNames}
          selectedVendor={selectedVendorForMetrics}
          onSelectVendor={setSelectedVendorForMetrics}
        />
      )}

      {/* Filter Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
        <Filter className="w-3.5 h-3.5 text-slate-400 shrink-0 ml-1" aria-hidden="true" />
        {[
          { id: "all", label: `All (${events.length})` },
          { id: "awaiting_call", label: `Awaiting Call (${stats.pendingCallCount})` },
          { id: "loop_closed", label: `Closed (${stats.closedLoopCount})` },
          { id: "system", label: "Modifications" },
          { id: "whatsapp", label: "WhatsApp" },
          { id: "email", label: "Email" }
        ].map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => setFilterChannel(f.id)}
            className={`px-2.5 py-1 rounded-lg font-medium whitespace-nowrap transition-colors text-xs cursor-pointer ${
              filterChannel === f.id
                ? "bg-slate-900 text-white font-semibold"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Activity Timeline List */}
      <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 max-h-[500px]">
        {filteredEvents.length === 0 ? (
          <div className="text-center py-8 text-slate-400 text-xs">
            No logged events match the selected filter.
          </div>
        ) : (
          filteredEvents.map((evt) => (
            <ActivityEventItem key={evt.id} event={evt} onCloseLoop={handleCloseLoop} />
          ))
        )}
      </div>
    </div>
  );

  if (isEmbedded) {
    return (
      <section aria-labelledby="activity-history-title" className="utsav-card">
        <div className="utsav-card-header">
          <div>
            <h2 id="activity-history-title" className="utsav-card-title flex items-center gap-2">
              <Clock className="w-4 h-4 text-orange-600" aria-hidden="true" />
              <span>Live Activity &amp; Loop-Closure History</span>
              <span className="text-xs font-normal text-slate-500 font-mono">
                (100% Ephemeral In-Memory Audit Trail)
              </span>
            </h2>
          </div>
          <span className="utsav-badge utsav-badge-ontrack font-mono text-[10px]">
            {events.length} Actions Recorded
          </span>
        </div>
        {content}
      </section>
    );
  }

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900 bg-opacity-70 animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="activity-drawer-title"
      onClick={(e) => {
        if (e.target === e.currentTarget && onClose) onClose();
      }}
    >
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Drawer Header */}
        <div className="bg-slate-50 border-b border-slate-200 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-orange-100 text-orange-600 flex items-center justify-center">
              <Clock className="w-4 h-4" aria-hidden="true" />
            </div>
            <div>
              <h2 id="activity-drawer-title" className="text-sm font-bold text-slate-900">
                Live Activity &amp; Loop-Closure Audit History
              </h2>
              <p className="text-xs text-slate-500">
                Chronological in-memory log of all modifications, vendor dispatches, and verbal call closures
              </p>
            </div>
          </div>

          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
              aria-label="Close activity history dialog"
            >
              <X className="w-4 h-4" aria-hidden="true" />
            </button>
          )}
        </div>

        {/* Drawer Body */}
        <div className="p-6 overflow-y-auto flex-1">{content}</div>

        {/* Drawer Footer */}
        <div className="bg-slate-50 border-t border-slate-200 px-6 py-3 flex items-center justify-between text-xs text-slate-500">
          <span>Zero-PII compliant · In-memory state only · Zero disk/cookie persistence</span>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="utsav-btn utsav-btn-secondary text-xs px-3 py-1 font-semibold cursor-pointer"
            >
              Close
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
