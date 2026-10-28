import React, { useEffect, useState } from "react";
import {
  PhoneCall,
  MessageCircle,
  Mail,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Clock
} from "lucide-react";
import { CATEGORY_PASTEL } from "../../lib/pastel";
import {
  ActivityLogEvent,
  closeTaskActivityLoop,
  getActivityEvents,
  getActivityStats,
  subscribeToEventLogger
} from "../../lib/services/event-logger";
import { usePlannerStore } from "../../lib/store/usePlannerStore";

function formatShortTime(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  } catch {
    return "";
  }
}

export const ActivityLoopLogger: React.FC = () => {
  const milestones = usePlannerStore((s) => s.milestones);
  const updateMilestoneTask = usePlannerStore((s) => s.updateMilestoneTask);

  const [tick, setTick] = useState(0);
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeSubTab, setActiveSubTab] = useState<"calls" | "timeline">("calls");
  const [callNotes, setCallNotes] = useState<Record<string, string>>({});

  useEffect(() => {
    return subscribeToEventLogger(() => {
      setTick((t) => t + 1);
    });
  }, []);

  // Recompute stats & events whenever logger or store updates
  const stats = getActivityStats();
  const allEvents = getActivityEvents();
  const openLoopEvents = allEvents.filter((e) => e.loopStatus === "awaiting_call");

  // Group open loop events by taskId so each task requiring a follow-up call appears once in the Call Checklist
  const pendingCallTasks: ActivityLogEvent[] = [];
  const seenTaskIds = new Set<string>();
  for (const evt of openLoopEvents) {
    if (!seenTaskIds.has(evt.taskId)) {
      seenTaskIds.add(evt.taskId);
      pendingCallTasks.push(evt);
    }
  }

  const handleCloseLoop = (
    evt: ActivityLogEvent,
    closedBy: "human_call" | "ai_assist"
  ) => {
    const customNote = callNotes[evt.taskId]?.trim();
    closeTaskActivityLoop({
      taskId: evt.taskId,
      taskTitle: evt.taskTitle,
      category: evt.category,
      vendorName: evt.vendorName,
      recipient: evt.recipient,
      closedBy,
      resolutionNote:
        customNote ||
        (closedBy === "human_call"
          ? "Called vendor & confirmed final execution"
          : "AI assistant verified vendor readiness")
    });

    // Also mark the corresponding milestone task as completed to close the loop with zero friction
    const matchedTask = milestones.find((m) => m.id === evt.taskId);
    if (matchedTask && matchedTask.status !== "completed") {
      updateMilestoneTask(evt.taskId, { status: "completed", delayStatus: "on_time" });
    }

    setCallNotes((prev) => {
      const next = { ...prev };
      delete next[evt.taskId];
      return next;
    });
    setTick((t) => t + 1);
  };

  return (
    <section
      aria-label="Activity Logger and Call Loop Checklist"
      data-tick={tick}
      className="bg-white border border-slate-200 rounded-xl p-3.5 flex flex-col gap-3"
    >
      {/* Concise Top Summary Bar: Activity Counts + Most Recent Event */}
      <div
        onClick={() => setIsExpanded((prev) => !prev)}
        className="flex flex-wrap items-center justify-between gap-3 cursor-pointer select-none"
      >
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="font-bold text-slate-900">Activity & Call Loop</span>
          <span className="text-slate-300">·</span>

          {/* Counts of each activity & action done */}
          <span className="font-mono tabular-nums text-slate-700">
            Calls Needed:{" "}
            <strong className={stats.pendingCallCount > 0 ? "text-amber-700" : "text-slate-900"}>
              {stats.pendingCallCount}
            </strong>
          </span>
          <span className="text-slate-300">·</span>
          <span className="font-mono tabular-nums text-slate-600">
            WA: <strong>{stats.whatsappCount}</strong>
          </span>
          <span className="text-slate-300">·</span>
          <span className="font-mono tabular-nums text-slate-600">
            Email: <strong>{stats.emailCount}</strong>
          </span>
          <span className="text-slate-300">·</span>
          <span className="font-mono tabular-nums text-slate-600">
            Calls Done: <strong>{stats.callCount}</strong>
          </span>
          <span className="text-slate-300">·</span>
          <span className="font-mono tabular-nums text-emerald-700">
            Closed: <strong>{stats.closedLoopCount}</strong>
          </span>
        </div>

        {/* Most Recent Activity + Expand Toggle */}
        <div className="flex items-center gap-2 text-xs text-slate-600 min-w-0">
          {stats.mostRecent && (
            <span className="truncate max-w-xs sm:max-w-md text-[11px] text-slate-500">
              Latest: <strong className="text-slate-700">{stats.mostRecent.summary}</strong> (
              {formatShortTime(stats.mostRecent.timestamp)})
            </span>
          )}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setIsExpanded((prev) => !prev);
            }}
            className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-slate-700 bg-slate-100 rounded-md hover:bg-slate-200 transition-colors whitespace-nowrap shrink-0"
          >
            <span>{isExpanded ? "Hide" : "Close Loops"}</span>
            {isExpanded ? (
              <ChevronUp className="w-3.5 h-3.5" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5" />
            )}
          </button>
        </div>
      </div>

      {/* Progressive Disclosure Detail Section */}
      {isExpanded && (
        <div className="pt-2.5 border-t border-slate-100 flex flex-col gap-3">
          {/* Sub-navigation between Call Checklist (Close the Loop) and Full Timeline Log */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg text-xs">
              <button
                type="button"
                onClick={() => setActiveSubTab("calls")}
                className={`px-2.5 py-1 font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                  activeSubTab === "calls"
                    ? "bg-white text-slate-900 shadow-2xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Call Checklist ({pendingCallTasks.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveSubTab("timeline")}
                className={`px-2.5 py-1 font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                  activeSubTab === "timeline"
                    ? "bg-white text-slate-900 shadow-2xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Timeline Log ({allEvents.length})
              </button>
            </div>

            <span className="text-[11px] text-slate-500">
              Persistent log · 1-click closes the call loop & marks task done
            </span>
          </div>

          {/* VIEW 1: CALL CHECKLIST TO CLOSE THE LOOP */}
          {activeSubTab === "calls" && (
            <div className="flex flex-col gap-2">
              {pendingCallTasks.length === 0 ? (
                <div className="py-4 text-center text-xs text-slate-500 bg-slate-50 rounded-lg border border-slate-100">
                  All sent notifications have been followed up and closed.
                </div>
              ) : (
                pendingCallTasks.map((evt) => {
                  const pastel = CATEGORY_PASTEL[evt.category];
                  return (
                    <div
                      key={evt.id}
                      className={`p-2.5 rounded-lg border ${pastel.border} ${pastel.cardBg} flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs`}
                    >
                      <div className="flex flex-col gap-0.5 min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-bold text-slate-900">{evt.vendorName}</span>
                          <span className="text-slate-400">·</span>
                          <span className="font-semibold text-slate-800 truncate">
                            {evt.taskTitle}
                          </span>
                          <span className="text-slate-400">·</span>
                          <span className="font-mono text-[11px] text-amber-800">
                            Call pending
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-600 truncate">
                          {evt.summary}
                        </div>
                      </div>

                      {/* Zero-Friction Loop Closure Controls */}
                      <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                        <input
                          type="text"
                          value={callNotes[evt.taskId] ?? ""}
                          onChange={(e) =>
                            setCallNotes((prev) => ({
                              ...prev,
                              [evt.taskId]: e.target.value
                            }))
                          }
                          placeholder="Edge case / call note..."
                          className="w-40 px-2 py-1 text-[11px] bg-white border border-slate-200 rounded-md text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-900"
                        />
                        <button
                          type="button"
                          onClick={() => handleCloseLoop(evt, "human_call")}
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold bg-slate-900 text-white rounded-md hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0"
                        >
                          <PhoneCall className="w-3 h-3" />
                          <span>Called · Close Loop</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleCloseLoop(evt, "ai_assist")}
                          className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-medium bg-white border border-slate-200 text-slate-700 rounded-md hover:bg-slate-50 transition-colors whitespace-nowrap shrink-0"
                        >
                          <Sparkles className="w-3 h-3 text-amber-600" />
                          <span>AI Close</span>
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* VIEW 2: CHRONOLOGICAL PERSISTENT TIMELINE LOG */}
          {activeSubTab === "timeline" && (
            <div className="flex flex-col divide-y divide-slate-100 max-h-64 overflow-y-auto border border-slate-100 rounded-lg bg-slate-50/40">
              {allEvents.map((evt) => {
                const isClosed = evt.loopStatus === "closed";
                return (
                  <div
                    key={evt.id}
                    className="px-3 py-2 flex flex-wrap items-center justify-between gap-2 text-xs"
                  >
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      {evt.channel === "whatsapp" ? (
                        <MessageCircle className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      ) : evt.channel === "email" ? (
                        <Mail className="w-3.5 h-3.5 text-sky-600 shrink-0" />
                      ) : evt.channel === "ai_followup" ? (
                        <Sparkles className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                      ) : (
                        <PhoneCall className="w-3.5 h-3.5 text-slate-700 shrink-0" />
                      )}

                      <span className="font-semibold text-slate-900 truncate">
                        {evt.taskTitle}
                      </span>
                      <span className="text-slate-300">·</span>
                      <span className="text-slate-600 truncate">{evt.summary}</span>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 text-[11px]">
                      {isClosed ? (
                        <span className="inline-flex items-center gap-1 text-emerald-700 font-medium">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>Loop closed</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-amber-700 font-medium">
                          <Clock className="w-3 h-3" />
                          <span>Awaiting call</span>
                        </span>
                      )}
                      <span className="font-mono text-slate-400 tabular-nums">
                        {formatShortTime(evt.timestamp)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </section>
  );
};
