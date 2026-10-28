import React, { useEffect, useState } from "react";
import {
  CheckCircle2,
  Clock,
  Circle,
  Lock,
  ArrowUpRight,
  Plus,
  Trash2,
  Edit2,
  Check,
  X,
  Mail,
  MessageCircle,
  PhoneCall,
  Sparkles,
  ChevronDown,
  ChevronUp
} from "lucide-react";
import { computeScheduledMilestones, ScheduledMilestone } from "../../lib/engine/dependency-graph";
import { CATEGORY_PASTEL } from "../../lib/pastel";
import { resolveThirdPartyVendorEmail } from "../../lib/services/communication";
import {
  buildEditableTemplate,
  closeTaskActivityLoop,
  EdgeCaseTemplateType,
  getActivityStats,
  subscribeToEventLogger
} from "../../lib/services/event-logger";
import { TMinusAlertService } from "../../lib/services/tminus-alert-service";
import { usePlannerStore } from "../../lib/store/usePlannerStore";
import { EventCategory, MilestoneTask } from "../../lib/types";
import { VendorActivityFrequencyChart } from "./VendorActivityFrequencyChart";

type TaskFilterView = "due_soon" | "all_pending" | "calls_needed" | "recent" | "completed" | EventCategory;

const QUICK_PRESETS: { title: string; category: EventCategory; days: number; urgency: MilestoneTask["urgency"] }[] = [
  { title: "Pandit & Muhurat", category: "venue", days: 45, urgency: "critical" },
  { title: "DJ & Sound", category: "decor", days: 30, urgency: "medium" },
  { title: "Bridal Makeup", category: "miscellaneous", days: 25, urgency: "critical" },
  { title: "Menu Tasting", category: "catering", days: 20, urgency: "medium" },
  { title: "Guest Kits", category: "logistics", days: 10, urgency: "low" }
];

const EDGE_CASE_OPTIONS: { id: EdgeCaseTemplateType; label: string }[] = [
  { id: "standard", label: "Standard" },
  { id: "delay_shift", label: "+30m Delay" },
  { id: "guest_surge", label: "+15% Surge" },
  { id: "backup_sos", label: "Backup SOS" }
];

function getConciseStatusLabel(task: ScheduledMilestone, hasPendingCall: boolean): string {
  if (task.status === "completed") return "Done";
  if (hasPendingCall) return "Call to close loop";
  if (task.isBlocked) return "Blocked";
  if (task.status === "in_progress") return "Needs finalization";
  return "Needs approval";
}

export const PendingTaskStrip: React.FC = () => {
  const milestones = usePlannerStore((s) => s.milestones);
  const eventDate = usePlannerStore((s) => s.eventDate);
  const eventTitle = usePlannerStore((s) => s.eventTitle);
  const cycleMilestoneStatus = usePlannerStore((s) => s.cycleMilestoneStatus);
  const addMilestoneTask = usePlannerStore((s) => s.addMilestoneTask);
  const updateMilestoneTask = usePlannerStore((s) => s.updateMilestoneTask);
  const removeMilestoneTask = usePlannerStore((s) => s.removeMilestoneTask);
  const navigateToOverview = usePlannerStore((s) => s.navigateToOverview);

  const [activeFilter, setActiveFilter] = useState<TaskFilterView>("due_soon");
  const [quickInput, setQuickInput] = useState("");
  const [isParsing, setIsParsing] = useState(false);
  const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDays, setEditDays] = useState(30);
  const [sentBadge, setSentBadge] = useState<Record<string, { wa?: boolean; email?: boolean; closed?: boolean }>>({});
  const [, setLogVersion] = useState(0);

  // Inline Editable Composer State for WhatsApp / 3rd-Party Email
  const [composer, setComposer] = useState<{
    taskId: string;
    channel: "whatsapp" | "email";
    edgeCase: EdgeCaseTemplateType;
    subject: string;
    body: string;
  } | null>(null);

  useEffect(() => {
    return subscribeToEventLogger(() => {
      setLogVersion((v) => v + 1);
    });
  }, []);

  const alertService = TMinusAlertService.getInstance();
  const scheduled = computeScheduledMilestones(milestones, eventDate);

  const filteredTasks = scheduled.filter((t) => {
    const taskStats = getActivityStats(t.id);
    if (activeFilter === "due_soon") {
      return t.status !== "completed" && (t.deadlineDaysBeforeEvent <= 45 || t.urgency === "critical");
    }
    if (activeFilter === "all_pending") {
      return t.status !== "completed";
    }
    if (activeFilter === "calls_needed") {
      return t.status !== "completed" && taskStats.pendingCallCount > 0;
    }
    if (activeFilter === "recent") {
      return true;
    }
    if (activeFilter === "completed") {
      return t.status === "completed";
    }
    return t.category === activeFilter;
  });

  const displayTasks =
    activeFilter === "recent"
      ? [...filteredTasks].reverse().slice(0, 8)
      : filteredTasks;

  const pendingCount = scheduled.filter((m) => m.status !== "completed").length;
  const completedCount = scheduled.length - pendingCount;
  const dueSoonCount = scheduled.filter(
    (m) => m.status !== "completed" && (m.deadlineDaysBeforeEvent <= 45 || m.urgency === "critical")
  ).length;
  const callsNeededCount = scheduled.filter(
    (m) => m.status !== "completed" && getActivityStats(m.id).pendingCallCount > 0
  ).length;

  const handleQuickAdd = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const text = quickInput.trim();
    if (!text) return;

    setIsParsing(true);
    try {
      const res = await fetch("/api/planner", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "parse_task", text })
      });
      const data = await res.json();
      if (res.ok && data.task) {
        addMilestoneTask({
          title: data.task.title,
          category: data.task.category,
          deadlineDaysBeforeEvent: data.task.deadlineDaysBeforeEvent,
          urgency: data.task.urgency,
          dependsOn: [],
          status: "pending"
        });
        setQuickInput("");
        setActiveFilter("all_pending");
      }
    } catch {
      const daysMatch = text.match(/(\d+)\s*(?:d|days?)/i);
      const days = daysMatch ? parseInt(daysMatch[1], 10) : 21;
      addMilestoneTask({
        title: text.replace(/\b\d+\s*(?:d|days?)\b/gi, "").trim() || text,
        category: "miscellaneous",
        deadlineDaysBeforeEvent: days,
        urgency: "medium",
        dependsOn: [],
        status: "pending"
      });
      setQuickInput("");
      setActiveFilter("all_pending");
    } finally {
      setIsParsing(false);
    }
  };

  const handleStartEdit = (task: ScheduledMilestone, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingTaskId(task.id);
    setEditTitle(task.title);
    setEditDays(task.deadlineDaysBeforeEvent);
  };

  const handleSaveEdit = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!editTitle.trim()) return;
    updateMilestoneTask(id, {
      title: editTitle.trim(),
      deadlineDaysBeforeEvent: Math.max(0, editDays)
    });
    setEditingTaskId(null);
  };

  const openEditableComposer = (
    task: ScheduledMilestone,
    channel: "whatsapp" | "email",
    e: React.MouseEvent
  ) => {
    e.stopPropagation();
    // Also dispatch immediate mock notification so 1-click icon tests & badge updates work immediately,
    // while opening the prefilled editable composer for human edge-case refinement.
    if (channel === "whatsapp") {
      const res = alertService.triggerTaskWhatsApp(task, eventTitle);
      if (res.ok) {
        setSentBadge((prev) => ({
          ...prev,
          [task.id]: { ...prev[task.id], wa: true }
        }));
      }
    } else {
      const res = alertService.triggerTaskEmail(task, eventTitle);
      if (res.ok) {
        setSentBadge((prev) => ({
          ...prev,
          [task.id]: { ...prev[task.id], email: true }
        }));
      }
    }

    const tpl = buildEditableTemplate(task, channel, "standard", eventTitle);
    setComposer({
      taskId: task.id,
      channel,
      edgeCase: "standard",
      subject: tpl.subject,
      body: tpl.body
    });
  };

  const handleSelectEdgeCasePreset = (
    task: ScheduledMilestone,
    edgeCase: EdgeCaseTemplateType
  ) => {
    if (!composer) return;
    const tpl = buildEditableTemplate(task, composer.channel, edgeCase, eventTitle);
    setComposer({
      ...composer,
      edgeCase,
      subject: tpl.subject,
      body: tpl.body
    });
  };

  const handleSendEditedTemplate = (task: ScheduledMilestone, alsoCloseLoop: boolean = false) => {
    if (!composer) return;
    if (composer.channel === "whatsapp") {
      const res = alertService.triggerTaskWhatsApp(
        task,
        eventTitle,
        composer.body,
        composer.edgeCase
      );
      if (res.ok) {
        setSentBadge((prev) => ({
          ...prev,
          [task.id]: { ...prev[task.id], wa: true }
        }));
      }
    } else {
      const res = alertService.triggerTaskEmail(
        task,
        eventTitle,
        undefined,
        composer.subject,
        composer.body,
        composer.edgeCase
      );
      if (res.ok) {
        setSentBadge((prev) => ({
          ...prev,
          [task.id]: { ...prev[task.id], email: true }
        }));
      }
    }

    if (alsoCloseLoop) {
      handleInstantCloseLoop(task, "human_call", `Sent edited ${composer.edgeCase} & confirmed on call`);
    }
    setComposer(null);
  };

  const handleInstantCloseLoop = (
    task: ScheduledMilestone,
    closedBy: "human_call" | "ai_assist",
    note?: string,
    e?: React.MouseEvent
  ) => {
    if (e) e.stopPropagation();
    const thirdPartyEmail = resolveThirdPartyVendorEmail(task.vendorContact, task.category);
    closeTaskActivityLoop({
      taskId: task.id,
      taskTitle: task.title,
      category: task.category,
      vendorName: task.vendorContact?.name || `${task.category} Vendor`,
      recipient: task.vendorContact?.phone || thirdPartyEmail,
      closedBy,
      resolutionNote:
        note ||
        (closedBy === "human_call"
          ? "Called vendor & closed the loop"
          : "AI assistant verified & closed the loop")
    });

    if (task.status !== "completed" && !task.isBlocked) {
      updateMilestoneTask(task.id, { status: "completed", delayStatus: "on_time" });
    }
    setSentBadge((prev) => ({
      ...prev,
      [task.id]: { ...prev[task.id], closed: true }
    }));
  };

  const handleJumpToOverview = (task: ScheduledMilestone, e: React.MouseEvent) => {
    e.stopPropagation();
    const sectionId = task.category === "catering" ? "vendor-section" : "budget-section";
    const targetTab = task.category === "catering" ? "vendor" : "budget";
    navigateToOverview(
      {
        sectionId,
        tab: targetTab,
        category: task.category,
        label: task.title
      },
      task.category
    );
  };

  return (
    <section aria-label="Tasks Hub" className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col gap-3">
      {/* 1. Concise Header & Filter Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-bold text-slate-900">Pending Tasks</h2>
          <span className="text-xs text-slate-500 font-mono tabular-nums">
            {pendingCount} open · {completedCount} done
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-100 rounded-lg text-xs">
          <button
            type="button"
            onClick={() => setActiveFilter("due_soon")}
            className={`px-2.5 py-1 font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
              activeFilter === "due_soon" ? "bg-white text-slate-900 shadow-2xs" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Urgent ({dueSoonCount})
          </button>
          <button
            type="button"
            onClick={() => setActiveFilter("calls_needed")}
            className={`px-2.5 py-1 font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
              activeFilter === "calls_needed" ? "bg-white text-slate-900 shadow-2xs" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Calls Needed ({callsNeededCount})
          </button>
          <button
            type="button"
            onClick={() => setActiveFilter("all_pending")}
            className={`px-2.5 py-1 font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
              activeFilter === "all_pending" ? "bg-white text-slate-900 shadow-2xs" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Pending ({pendingCount})
          </button>
          <button
            type="button"
            onClick={() => setActiveFilter("completed")}
            className={`px-2.5 py-1 font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
              activeFilter === "completed" ? "bg-white text-slate-900 shadow-2xs" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Done ({completedCount})
          </button>
        </div>
      </div>

      {/* 2. Compact Quick Add Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-2">
        <form onSubmit={handleQuickAdd} className="flex items-center gap-1.5 flex-1">
          <input
            type="text"
            value={quickInput}
            onChange={(e) => setQuickInput(e.target.value)}
            placeholder="Add task (e.g. Book DJ 30d)..."
            className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
          />
          <button
            type="submit"
            disabled={!quickInput.trim() || isParsing}
            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800 disabled:opacity-50 transition-colors whitespace-nowrap shrink-0"
          >
            <Plus className="w-3.5 h-3.5" aria-hidden="true" />
            <span>{isParsing ? "..." : "Add"}</span>
          </button>
        </form>

        <div className="flex flex-wrap items-center gap-1">
          {QUICK_PRESETS.map((preset) => {
            const pastel = CATEGORY_PASTEL[preset.category];
            return (
              <button
                key={preset.title}
                type="button"
                onClick={() => {
                  addMilestoneTask({
                    title: preset.title,
                    category: preset.category,
                    deadlineDaysBeforeEvent: preset.days,
                    urgency: preset.urgency,
                    dependsOn: [],
                    status: "pending"
                  });
                  setActiveFilter("all_pending");
                }}
                className={`inline-flex items-center gap-0.5 px-2 py-1 text-[11px] font-medium rounded-md border ${pastel.badgeBg} ${pastel.badgeText} ${pastel.border} hover:opacity-80 transition-opacity whitespace-nowrap shrink-0`}
              >
                <Plus className="w-2.5 h-2.5" aria-hidden="true" />
                <span>{preset.title}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. Progressive Disclosure Tasks Grid */}
      {displayTasks.length === 0 ? (
        <div className="py-5 text-center text-xs text-slate-600 bg-slate-50/60 rounded-lg border border-slate-100">
          No tasks in this view.{" "}
          <button
            type="button"
            onClick={() => setActiveFilter("all_pending")}
            className="font-semibold text-slate-900 underline ml-1"
          >
            Show all
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
          {displayTasks.map((task) => {
            const pastel = CATEGORY_PASTEL[task.category];
            const isExpanded = expandedTaskId === task.id;
            const isEditing = editingTaskId === task.id;
            const isComposing = composer?.taskId === task.id;
            const targetDateStr = task.targetDate.toISOString().slice(0, 10);
            const thirdPartyEmail = resolveThirdPartyVendorEmail(task.vendorContact, task.category);
            const feedback = sentBadge[task.id];
            const taskStats = getActivityStats(task.id);
            const hasPendingCall = taskStats.pendingCallCount > 0;
            const conciseStatus = getConciseStatusLabel(task, hasPendingCall);

            return (
              <div
                key={task.id}
                onClick={() => setExpandedTaskId((prev) => (prev === task.id ? null : task.id))}
                className={`rounded-xl p-2.5 border ${pastel.border} ${pastel.cardBg} transition-colors cursor-pointer flex flex-col gap-2`}
              >
                {/* Primary Minimal Row: Status Check + Title + Concise State + Small WA/Email/Call Icons */}
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      cycleMilestoneStatus(task.id);
                    }}
                    aria-label={`Status: ${task.status}`}
                    className={`p-1 rounded-md border transition-colors shrink-0 ${
                      task.status === "completed"
                        ? "bg-emerald-700 border-emerald-700 text-white"
                        : task.isBlocked
                        ? "bg-white border-slate-300 text-slate-500"
                        : task.status === "in_progress"
                        ? "bg-amber-100 border-amber-400 text-amber-900"
                        : "bg-white border-slate-300 text-slate-700 hover:border-slate-900"
                    }`}
                  >
                    {task.status === "completed" ? (
                      <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
                    ) : task.isBlocked ? (
                      <Lock className="w-3.5 h-3.5" aria-hidden="true" />
                    ) : task.status === "in_progress" ? (
                      <Clock className="w-3.5 h-3.5" aria-hidden="true" />
                    ) : (
                      <Circle className="w-3.5 h-3.5" aria-hidden="true" />
                    )}
                  </button>

                  {/* Title & Minimal Status */}
                  <div className="flex-1 min-w-0">
                    <div
                      className={`text-xs font-semibold truncate ${
                        task.status === "completed" ? "line-through text-slate-500" : "text-slate-900"
                      }`}
                    >
                      {task.title}
                    </div>
                    <div className="flex items-center gap-1.5 text-[11px] text-slate-600 flex-wrap">
                      <span
                        className={`font-medium ${
                          hasPendingCall && task.status !== "completed"
                            ? "text-amber-800"
                            : "text-slate-700"
                        }`}
                      >
                        {conciseStatus}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span className="font-mono tabular-nums">T-{task.deadlineDaysBeforeEvent}d</span>
                      {feedback?.wa && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span className="text-emerald-700 font-medium">WA Sent</span>
                        </>
                      )}
                      {feedback?.email && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span className="text-sky-700 font-medium">Email Sent</span>
                        </>
                      )}
                      {feedback?.closed && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span className="text-emerald-800 font-semibold">Loop Closed</span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Integrated Small Icon Buttons (WhatsApp + 3rd-Party Email + 1-Click Call Close Loop) */}
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={(e) => openEditableComposer(task, "whatsapp", e)}
                      aria-label={`WhatsApp vendor for ${task.title}`}
                      title={`WhatsApp ${task.vendorContact?.name || "Vendor"} (prefilled & editable)`}
                      className="p-1.5 rounded-md bg-white/80 hover:bg-white border border-slate-200/80 text-emerald-700 transition-colors"
                    >
                      <MessageCircle className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => openEditableComposer(task, "email", e)}
                      aria-label={`Email 3rd-party vendor for ${task.title}`}
                      title={`Email 3rd-party (${thirdPartyEmail})`}
                      className="p-1.5 rounded-md bg-white/80 hover:bg-white border border-slate-200/80 text-sky-700 transition-colors"
                    >
                      <Mail className="w-3.5 h-3.5" />
                    </button>
                    {task.status !== "completed" && (
                      <button
                        type="button"
                        onClick={(e) => handleInstantCloseLoop(task, "human_call", undefined, e)}
                        aria-label={`Close call loop for ${task.title}`}
                        title="1-Click: Log follow-up call & close loop"
                        className="p-1.5 rounded-md bg-white/80 hover:bg-slate-900 hover:text-white border border-slate-200/80 text-slate-700 transition-colors"
                      >
                        <PhoneCall className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <span className="p-0.5 text-slate-400">
                      {isExpanded ? (
                        <ChevronUp className="w-3.5 h-3.5" />
                      ) : (
                        <ChevronDown className="w-3.5 h-3.5" />
                      )}
                    </span>
                  </div>
                </div>

                {/* Inline Prefilled & Editable Edge-Case Template Composer */}
                {isComposing && composer && (
                  <div
                    onClick={(e) => e.stopPropagation()}
                    className="p-2.5 bg-white border border-slate-200 rounded-lg flex flex-col gap-2 text-xs cursor-default"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold text-slate-900">
                        {composer.channel === "whatsapp"
                          ? `WhatsApp · ${task.vendorContact?.name || "Vendor"}`
                          : `3rd-Party Email · ${thirdPartyEmail}`}
                      </span>
                      <button
                        type="button"
                        onClick={() => setComposer(null)}
                        className="text-slate-400 hover:text-slate-700"
                        aria-label="Close template editor"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* 1-Click Edge Case Template Switcher */}
                    <div className="flex flex-wrap items-center gap-1">
                      {EDGE_CASE_OPTIONS.map((opt) => (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => handleSelectEdgeCasePreset(task, opt.id)}
                          className={`px-2 py-0.5 text-[11px] font-medium rounded border transition-colors whitespace-nowrap shrink-0 ${
                            composer.edgeCase === opt.id
                              ? "bg-slate-900 text-white border-slate-900"
                              : "bg-slate-50 text-slate-600 border-slate-200 hover:text-slate-900"
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>

                    {composer.channel === "email" && (
                      <input
                        type="text"
                        value={composer.subject}
                        onChange={(e) =>
                          setComposer({ ...composer, subject: e.target.value })
                        }
                        aria-label="Email subject"
                        className="w-full px-2 py-1 text-[11px] bg-slate-50 border border-slate-200 rounded text-slate-900 font-medium"
                      />
                    )}

                    <textarea
                      rows={3}
                      value={composer.body}
                      onChange={(e) =>
                        setComposer({ ...composer, body: e.target.value })
                      }
                      aria-label="Editable notification message"
                      className="w-full p-2 text-[11px] bg-slate-50 border border-slate-200 rounded text-slate-800 leading-snug resize-y"
                    />

                    <div className="flex flex-wrap items-center justify-between gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleSendEditedTemplate(task, false)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold bg-slate-900 text-white rounded hover:bg-slate-800 whitespace-nowrap shrink-0"
                      >
                        <span>Send & Queue Call</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleSendEditedTemplate(task, true)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold bg-emerald-700 text-white rounded hover:bg-emerald-800 whitespace-nowrap shrink-0"
                      >
                        <PhoneCall className="w-3 h-3" />
                        <span>Send & Close Loop</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* Expanded Progressive Disclosure Details (Only visible when clicked) */}
                {isExpanded && (
                  <div
                    onClick={(e) => e.stopPropagation()}
                    className="pt-2 border-t border-slate-200/70 flex flex-col gap-2 text-[11px] text-slate-600 cursor-default"
                  >
                    {isEditing ? (
                      <div className="flex flex-col gap-1.5">
                        <input
                          type="text"
                          value={editTitle}
                          onChange={(e) => setEditTitle(e.target.value)}
                          className="w-full px-2 py-1 text-xs bg-white border border-slate-300 rounded font-medium text-slate-900"
                          autoFocus
                        />
                        <div className="flex items-center gap-1.5">
                          <span className="text-slate-500">T-Days:</span>
                          <input
                            type="number"
                            min={0}
                            max={365}
                            value={editDays}
                            onChange={(e) => setEditDays(Number(e.target.value))}
                            className="w-16 px-1.5 py-0.5 text-xs bg-white border border-slate-300 rounded font-mono text-slate-900"
                          />
                          <button
                            type="button"
                            onClick={(e) => handleSaveEdit(task.id, e)}
                            className="p-1 bg-slate-900 text-white rounded hover:bg-slate-800"
                          >
                            <Check className="w-3 h-3" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingTaskId(null)}
                            className="p-1 text-slate-500 hover:text-slate-900"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="font-medium text-slate-800">{pastel.name}</span>
                          <span>·</span>
                          <span className="font-mono tabular-nums">{targetDateStr}</span>
                          {task.timeSlot && (
                            <>
                              <span>·</span>
                              <span className="font-mono">{task.timeSlot}</span>
                            </>
                          )}
                        </div>

                        <div className="text-slate-700">
                          {task.vendorContact ? (
                            <span>
                              3rd-Party: <strong>{task.vendorContact.name}</strong> ({task.vendorContact.role}) ·{" "}
                              <span className="font-mono">{thirdPartyEmail}</span>
                            </span>
                          ) : (
                            <span>
                              3rd-Party Email: <span className="font-mono">{thirdPartyEmail}</span>
                            </span>
                          )}
                        </div>

                        {/* Vendor Communication Frequency & Effectiveness Visualization */}
                        <VendorActivityFrequencyChart
                          vendorName={task.vendorContact?.name || `${task.category} Partner`}
                          taskId={task.id}
                        />

                        {/* Zero-Friction Loop Closure Bar */}
                        {task.status !== "completed" && (
                          <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                            <button
                              type="button"
                              onClick={(e) =>
                                handleInstantCloseLoop(task, "human_call", "Called vendor & confirmed", e)
                              }
                              className="inline-flex items-center gap-1 px-2 py-1 bg-slate-900 text-white rounded font-semibold hover:bg-slate-800 whitespace-nowrap shrink-0"
                            >
                              <PhoneCall className="w-3 h-3" />
                              <span>Called · Close Loop</span>
                            </button>
                            <button
                              type="button"
                              onClick={(e) =>
                                handleInstantCloseLoop(task, "ai_assist", "AI verified vendor status", e)
                              }
                              className="inline-flex items-center gap-1 px-2 py-1 bg-white border border-slate-200 text-slate-700 rounded font-medium hover:bg-slate-50 whitespace-nowrap shrink-0"
                            >
                              <Sparkles className="w-3 h-3 text-amber-600" />
                              <span>AI Verify & Close</span>
                            </button>
                          </div>
                        )}

                        {task.isBlocked && task.blockingTaskTitles.length > 0 && (
                          <div className="text-amber-800 font-medium">
                            Prerequisite: {task.blockingTaskTitles.join(", ")}
                          </div>
                        )}

                        <div className="flex items-center justify-between pt-1">
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={(e) => handleStartEdit(task, e)}
                              aria-label="Edit task"
                              className="inline-flex items-center gap-1 px-2 py-0.5 bg-white border border-slate-200 rounded text-slate-700 hover:text-slate-950"
                            >
                              <Edit2 className="w-3 h-3" />
                              <span>Edit</span>
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                removeMilestoneTask(task.id);
                              }}
                              aria-label="Delete task"
                              className="inline-flex items-center gap-1 px-2 py-0.5 bg-white border border-slate-200 rounded text-rose-600 hover:bg-rose-50"
                            >
                              <Trash2 className="w-3 h-3" />
                              <span>Delete</span>
                            </button>
                          </div>

                          <button
                            type="button"
                            onClick={(e) => handleJumpToOverview(task, e)}
                            className="inline-flex items-center gap-0.5 font-semibold text-slate-700 hover:text-slate-950 underline underline-offset-2"
                          >
                            <span>{task.category === "catering" ? "Vendors" : "Budget"}</span>
                            <ArrowUpRight className="w-3 h-3" aria-hidden="true" />
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
};
