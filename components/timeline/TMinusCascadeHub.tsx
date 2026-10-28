import React, { useState } from "react";
import {
  AlertTriangle,
  Clock,
  MessageCircle,
  CheckCircle2,
  Calendar,
  Phone,
  RotateCcw,
  Sparkles,
  ChevronRight
} from "lucide-react";
import { computeScheduledMilestones } from "../../lib/engine/dependency-graph";
import { computeDelayCascade, buildWhatsAppReminderUrl } from "../../lib/engine/delay-cascade";
import { CATEGORY_PASTEL } from "../../lib/pastel";
import { usePlannerStore } from "../../lib/store/usePlannerStore";
import { MilestoneTask, TMinusStage } from "../../lib/types";

export function TMinusCascadeHub() {
  const milestones = usePlannerStore((s) => s.milestones);
  const eventDate = usePlannerStore((s) => s.eventDate);
  const markTaskDelay = usePlannerStore((s) => s.markTaskDelay);
  const cycleMilestoneStatus = usePlannerStore((s) => s.cycleMilestoneStatus);

  const [stageFilter, setStageFilter] = useState<TMinusStage | "all">("all");
  const [activeDelayedId, setActiveDelayedId] = useState<string | null>("m8"); // Default inspect Baraat

  const scheduled = computeScheduledMilestones(milestones, eventDate);

  // Active inspected task delay calculation
  const targetTask = milestones.find((m) => m.id === activeDelayedId);
  const delayMinutes = targetTask?.delayMinutes ?? 0;
  const cascadeImpact = computeDelayCascade(milestones, activeDelayedId || "", delayMinutes);

  const filteredTasks = scheduled.filter((task) => {
    if (stageFilter === "all") return true;
    return task.tMinusStage === stageFilter;
  });

  const stages: { id: TMinusStage | "all"; label: string; count: number }[] = [
    { id: "all", label: "All Items", count: scheduled.length },
    {
      id: "day_of",
      label: "Day-Of Muhurat",
      count: scheduled.filter((m) => m.tMinusStage === "day_of").length
    },
    {
      id: "t_24h",
      label: "T-24h Setup",
      count: scheduled.filter((m) => m.tMinusStage === "t_24h").length
    },
    {
      id: "t_7",
      label: "T-7d Deliveries",
      count: scheduled.filter((m) => m.tMinusStage === "t_7").length
    },
    {
      id: "t_30",
      label: "T-30d Contracts",
      count: scheduled.filter((m) => m.tMinusStage === "t_30").length
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header & Stage Filter */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse" />
              <h2 className="text-xl font-bold text-slate-900 tracking-tight">
                T-Minus & Delay Cascade Command
              </h2>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Deterministic schedule tracking with downstream ritual impact warnings and 1-click vendor WhatsApp dispatch.
            </p>
          </div>

          {/* Quick Stage Filter Pills */}
          <div className="flex flex-wrap gap-1.5 p-1 bg-slate-100 rounded-xl">
            {stages.map((st) => {
              const active = stageFilter === st.id;
              return (
                <button
                  key={st.id}
                  onClick={() => setStageFilter(st.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    active
                      ? "bg-white text-slate-900 shadow-2xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  {st.label}
                  <span
                    className={`ml-1.5 px-1.5 py-0.5 rounded-full text-[10px] ${
                      active ? "bg-slate-900 text-white" : "bg-slate-200 text-slate-700"
                    }`}
                  >
                    {st.count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Live Delay Cascade Alert Banner */}
        {cascadeImpact.riskMessage && (
          <div
            className={`p-4 rounded-xl border flex items-start gap-3 transition-all ${
              cascadeImpact.criticalMuhuratAtRisk
                ? "bg-amber-50/90 border-amber-200 text-amber-950"
                : "bg-blue-50/80 border-blue-200 text-blue-950"
            }`}
          >
            <AlertTriangle
              className={`w-5 h-5 shrink-0 mt-0.5 ${
                cascadeImpact.criticalMuhuratAtRisk ? "text-amber-600" : "text-blue-600"
              }`}
            />
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider">
                  {cascadeImpact.criticalMuhuratAtRisk
                    ? "Downstream Muhurat Risk Alert"
                    : "Schedule Delay Impact"}
                </span>
                <span className="text-xs font-semibold text-slate-600">
                  Delay: +{cascadeImpact.delayMinutes} mins on &quot;{cascadeImpact.taskTitle}&quot;
                </span>
              </div>
              <p className="text-sm font-medium mt-1 leading-relaxed">
                {cascadeImpact.riskMessage}
              </p>
              {cascadeImpact.downstreamAffectedTasks.length > 0 && (
                <div className="mt-2.5 flex flex-wrap gap-2">
                  {cascadeImpact.downstreamAffectedTasks.map((t) => (
                    <span
                      key={t.id}
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium border ${
                        t.isMuhuratCritical
                          ? "bg-amber-100 text-amber-900 border-amber-300 font-semibold"
                          : "bg-white/80 text-slate-700 border-slate-200"
                      }`}
                    >
                      <span>{t.title}</span>
                      <span className="text-[10px] opacity-75">+{t.cumulativeDelayMinutes}m</span>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Milestones & Timeline Grid */}
      <div className="space-y-3">
        {filteredTasks.map((task) => {
          const colors = CATEGORY_PASTEL[task.category];
          const isInspected = activeDelayedId === task.id;
          const currentDelay = task.delayMinutes ?? 0;
          const targetDateStr =
            task.targetDate instanceof Date
              ? task.targetDate.toISOString().slice(0, 10)
              : String(task.targetDate);

          const waUrl = task.vendorContact
            ? buildWhatsAppReminderUrl(
                task.vendorContact.phone,
                task.vendorContact.name,
                task.title,
                task.timeSlot,
                task.delayStatus
              )
            : null;

          return (
            <div
              key={task.id}
              onClick={() => setActiveDelayedId(task.id)}
              className={`bg-white rounded-2xl border p-4.5 transition-all cursor-pointer ${
                isInspected
                  ? "border-slate-800 shadow-sm ring-1 ring-slate-800"
                  : "border-slate-200 hover:border-slate-300"
              }`}
            >
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                {/* Left: Info */}
                <div className="flex items-start gap-3.5">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      cycleMilestoneStatus(task.id);
                    }}
                    title="Click to cycle status"
                    className="mt-1 transition-transform hover:scale-110"
                  >
                    {task.status === "completed" ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                    ) : (
                      <div
                        className={`w-5 h-5 rounded-full border-2 transition-colors ${
                          task.status === "in_progress"
                            ? "border-amber-500 bg-amber-50"
                            : "border-slate-300 hover:border-slate-500"
                        }`}
                      />
                    )}
                  </button>

                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`px-2 py-0.5 rounded-md text-[11px] font-semibold uppercase tracking-wider border ${colors.badgeBg} ${colors.badgeText} ${colors.border}`}
                      >
                        {task.category}
                      </span>
                      {task.timeSlot && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-semibold bg-slate-100 text-slate-800">
                          <Clock className="w-3 h-3 text-slate-500" />
                          {task.timeSlot}
                        </span>
                      )}
                      {task.urgency === "critical" && (
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                          MUHURAT CRITICAL
                        </span>
                      )}
                      {currentDelay > 0 && (
                        <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                          +{currentDelay}m DELAYED
                        </span>
                      )}
                    </div>

                    <h3
                      className={`text-sm font-semibold mt-1.5 ${
                        task.status === "completed"
                          ? "line-through text-slate-400"
                          : "text-slate-900"
                      }`}
                    >
                      {task.title}
                    </h3>

                    {/* Vendor Contact details */}
                    {task.vendorContact && (
                      <div className="flex items-center gap-2 mt-1 text-xs text-slate-500">
                        <Phone className="w-3 h-3 text-slate-400" />
                        <span>{task.vendorContact.name} ({task.vendorContact.role})</span>
                        <span className="text-slate-300">•</span>
                        <span>{task.vendorContact.phone}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Right: Delay Simulator & Actions */}
                <div
                  className="flex flex-wrap items-center gap-2 shrink-0 pt-2 lg:pt-0 border-t lg:border-t-0 border-slate-100"
                  onClick={(e) => e.stopPropagation()}
                >
                  {/* Quick Delay Adjuster */}
                  <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-xl p-1">
                    <span className="text-[11px] font-medium text-slate-500 px-2">Delay:</span>
                    <button
                      onClick={() => markTaskDelay(task.id, 0, "on_time")}
                      title="On Time"
                      className={`px-2 py-1 rounded-lg text-[11px] font-semibold transition-colors ${
                        currentDelay === 0
                          ? "bg-emerald-600 text-white"
                          : "text-slate-600 hover:bg-slate-200"
                      }`}
                    >
                      On Time
                    </button>
                    {[15, 30, 45, 60].map((mins) => (
                      <button
                        key={mins}
                        onClick={() => markTaskDelay(task.id, mins, "delayed")}
                        className={`px-2 py-1 rounded-lg text-[11px] font-semibold transition-colors ${
                          currentDelay === mins
                            ? "bg-amber-600 text-white"
                            : "text-slate-600 hover:bg-slate-200"
                        }`}
                      >
                        +{mins}m
                      </button>
                    ))}
                  </div>

                  {/* WhatsApp Ping */}
                  {waUrl && (
                    <a
                      href={waUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 transition-colors"
                      title="Send WhatsApp update to vendor"
                    >
                      <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
                      WhatsApp Ping
                    </a>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
