import React, { useState, useEffect } from "react";
import {
  Clock,
  CheckCircle,
  PhoneCall,
  Mail,
  MessageSquare,
  Sliders,
  X,
  Filter,
  TrendingUp,
  AlertCircle
} from "lucide-react";
import {
  ActivityLogEvent,
  ActivityChannel,
  getActivityEvents,
  getActivityStats,
  closeTaskActivityLoop,
  subscribeToEventLogger,
  getVendorCommunicationMetrics,
  VendorCommunicationMetrics
} from "../lib/services/event-logger";

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

  // Get list of unique vendor names from events
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

  const getChannelBadge = (event: ActivityLogEvent) => {
    if (event.channel === "system") {
      return (
        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-800 border border-slate-300 font-mono">
          <Sliders className="w-3 h-3 text-slate-600" aria-hidden="true" />
          SYSTEM MODIFICATION
        </span>
      );
    }
    if (event.channel === "whatsapp") {
      return (
        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-300 font-mono">
          <MessageSquare className="w-3 h-3 text-emerald-600" aria-hidden="true" />
          WHATSAPP SENT
        </span>
      );
    }
    if (event.channel === "email") {
      return (
        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded bg-blue-100 text-blue-800 border border-blue-300 font-mono">
          <Mail className="w-3 h-3 text-blue-600" aria-hidden="true" />
          EMAIL SENT
        </span>
      );
    }
    if (event.channel === "call" || event.channel === "loop_closed") {
      return (
        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded bg-purple-100 text-purple-800 border border-purple-300 font-mono">
          <CheckCircle className="w-3 h-3 text-purple-600" aria-hidden="true" />
          ✓ LOOP CLOSED
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-mono">
        {event.channel.toUpperCase()}
      </span>
    );
  };

  const content = (
    <div className="flex flex-col h-full space-y-4">
      {/* Top Metrics Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
          <span className="text-[10px] uppercase font-bold text-slate-500 block">Total Actions</span>
          <span className="text-lg font-extrabold text-slate-900 font-mono tabular-nums">
            {stats.total}
          </span>
        </div>
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
          <span className="text-[10px] uppercase font-bold text-amber-700 block">Awaiting Closure</span>
          <span className="text-lg font-extrabold text-amber-900 font-mono tabular-nums">
            {stats.pendingCallCount}
          </span>
        </div>
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3">
          <span className="text-[10px] uppercase font-bold text-emerald-700 block">Loops Closed</span>
          <span className="text-lg font-extrabold text-emerald-900 font-mono tabular-nums">
            {stats.closedLoopCount}
          </span>
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-3">
          <span className="text-[10px] uppercase font-bold text-blue-700 block">Messages Dispatched</span>
          <span className="text-lg font-extrabold text-blue-900 font-mono tabular-nums">
            {stats.whatsappCount + stats.emailCount}
          </span>
        </div>
      </div>

      {/* Vendor Frequency & Effectiveness Card */}
      {activeVendorMetrics && (
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-2.5 mb-3">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-indigo-600" aria-hidden="true" />
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Vendor Communication Cadence & Effectiveness
              </h3>
            </div>
            {vendorNames.length > 1 && (
              <div className="flex gap-1 flex-wrap">
                {vendorNames.map((name) => (
                  <button
                    key={name}
                    type="button"
                    onClick={() => setSelectedVendorForMetrics(name)}
                    className={`text-[11px] px-2 py-0.5 rounded font-medium transition-colors ${
                      activeVendorMetrics.vendorName === name
                        ? "bg-indigo-600 text-white font-semibold"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    {name}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs mb-3">
            <div>
              <span className="text-slate-500 text-[11px] block">Vendor Partner</span>
              <strong className="text-slate-900 font-semibold">{activeVendorMetrics.vendorName}</strong>
            </div>
            <div>
              <span className="text-slate-500 text-[11px] block">Effectiveness Score</span>
              <div className="flex items-center gap-1.5 font-mono">
                <strong className="text-slate-900 text-sm font-bold">
                  {activeVendorMetrics.effectivenessScore}%
                </strong>
                <span
                  className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${
                    activeVendorMetrics.effectivenessScore >= 80
                      ? "bg-emerald-100 text-emerald-800"
                      : activeVendorMetrics.effectivenessScore >= 50
                      ? "bg-amber-100 text-amber-800"
                      : "bg-rose-100 text-rose-800"
                  }`}
                >
                  {activeVendorMetrics.effectivenessLabel}
                </span>
              </div>
            </div>
            <div>
              <span className="text-slate-500 text-[11px] block">Outreach Breakdown</span>
              <span className="font-mono text-slate-800 text-[11px]">
                {activeVendorMetrics.calls} Calls · {activeVendorMetrics.messages} WA · {activeVendorMetrics.emails} Email
              </span>
            </div>
            <div>
              <span className="text-slate-500 text-[11px] block">Loop Closure Cadence</span>
              <span className="font-semibold text-slate-800 text-[11px]">
                {activeVendorMetrics.openLoops === 0
                  ? "✓ Loop Closed"
                  : `${activeVendorMetrics.openLoops} Open Follow-up(s)`}
              </span>
            </div>
          </div>
        </div>
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
            className={`px-2.5 py-1 rounded-lg font-medium whitespace-nowrap transition-colors text-xs ${
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
          filteredEvents.map((evt) => {
            const timeStr = new Date(evt.timestamp).toLocaleTimeString("en-IN", {
              hour: "2-digit",
              minute: "2-digit",
              second: "2-digit"
            });
            const isOpenCall = evt.loopStatus === "awaiting_call";

            return (
              <div
                key={evt.id}
                className={`bg-white border rounded-xl p-3.5 transition-all shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                  isOpenCall
                    ? "border-amber-300 bg-amber-50/20"
                    : "border-slate-200 hover:border-slate-300"
                }`}
              >
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <div className="text-[10px] font-mono text-slate-400 shrink-0 pt-0.5">
                    {timeStr}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      {getChannelBadge(evt)}
                      <span className="text-xs font-bold text-slate-900 truncate">
                        {evt.taskTitle}
                      </span>
                      {evt.vendorName && evt.vendorName !== "Deterministic Engine" && (
                        <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.2 rounded font-medium">
                          {evt.vendorName}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-700 leading-snug">{evt.summary}</p>
                    {evt.messageBody && (
                      <p className="text-[11px] font-mono text-slate-500 bg-slate-50 rounded p-1.5 mt-1 border border-slate-100 line-clamp-2">
                        &quot;{evt.messageBody}&quot;
                      </p>
                    )}
                    {evt.resolutionNote && (
                      <p className="text-[11px] text-emerald-800 mt-1 font-medium flex items-center gap-1">
                        <CheckCircle className="w-3 h-3 text-emerald-600 inline" aria-hidden="true" />
                        <span>{evt.resolutionNote}</span>
                      </p>
                    )}
                  </div>
                </div>

                {/* 1-Click Close Loop Action Button */}
                {isOpenCall && (
                  <div className="shrink-0 self-end sm:self-center">
                    <button
                      type="button"
                      onClick={() => handleCloseLoop(evt)}
                      className="utsav-btn bg-amber-600 hover:bg-amber-700 text-white text-xs px-3 py-1.5 font-semibold shadow-xs flex items-center gap-1.5"
                      aria-label={`Mark task ${evt.taskTitle} confirmed and close loop`}
                    >
                      <CheckCircle className="w-3.5 h-3.5" aria-hidden="true" />
                      <span>✓ Close Loop (Mark Confirmed)</span>
                    </button>
                  </div>
                )}
              </div>
            );
          })
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
              className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
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
              className="utsav-btn utsav-btn-secondary text-xs px-3 py-1 font-semibold"
            >
              Close
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ActivityHistoryPanel;
