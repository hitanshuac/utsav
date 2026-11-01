import React, { useState, useMemo } from "react";
import {
  GitBranch,
  Lock,
  CheckCircle,
  Clock,
  ArrowRight,
  Send,
  MessageSquare,
  Mail,
  Table as TableIcon,
  Layers,
  ChevronRight
} from "lucide-react";
import { MilestoneTask } from "../types/planner";
import { computeDelayCascade, DelayImpactSummary } from "../lib/engine/delay-cascade";
import {
  triggerWhatsAppNotification,
  triggerEmailNotification,
  resolveThirdPartyVendorEmail
} from "../lib/services/communication";
import {
  buildEditableTemplate,
  EdgeCaseTemplateType,
  logActivityEvent
} from "../lib/services/event-logger";
import { SupportedLanguage, TRANSLATIONS } from "../lib/i18n";

interface VisualDependencyFlowchartProps {
  milestones: MilestoneTask[];
  topologicalOrder: string[];
  bottlenecks: string[];
  daysRemaining: number;
  eventTitle: string;
  onCycleTaskStatus: (taskId: string) => void;
  onUpdateTaskStatus?: (taskId: string, status: "pending" | "in_progress" | "completed") => void;
  onActionTriggered?: (actionName: string, details: string, deltas?: any[]) => void;
  language?: SupportedLanguage;
}

interface StageColumn {
  stageNumber: number;
  title: string;
  subtitle: string;
  tasks: MilestoneTask[];
}

export const VisualDependencyFlowchart: React.FC<VisualDependencyFlowchartProps> = ({
  milestones,
  topologicalOrder,
  bottlenecks,
  daysRemaining,
  eventTitle,
  onCycleTaskStatus,
  onUpdateTaskStatus,
  onActionTriggered,
  language = "en"
}) => {
  const t = TRANSLATIONS[language] || TRANSLATIONS.en;
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(milestones[0]?.id || null);
  const [activeDelayImpact, setActiveDelayImpact] = useState<DelayImpactSummary | null>(null);
  const [activeChannel, setActiveChannel] = useState<"whatsapp" | "email">("whatsapp");
  const [activeTemplateType, setActiveTemplateType] = useState<EdgeCaseTemplateType>("standard");
  const [customBody, setCustomBody] = useState<string>("");
  const [customSubject, setCustomSubject] = useState<string>("");
  const [dispatchFeedback, setDispatchFeedback] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"flowchart" | "table">("flowchart");

  // Map of tasks for O(1) lookup
  const taskMap = useMemo(() => {
    const map = new Map<string, MilestoneTask>();
    milestones.forEach((m) => map.set(m.id, m));
    return map;
  }, [milestones]);

  // Selected task
  const selectedTask = selectedTaskId ? taskMap.get(selectedTaskId) || null : null;

  // Topological Stages Partitioning (Kahn's DAG depth)
  const stages: StageColumn[] = useMemo(() => {
    const depthMap = new Map<string, number>();

    const getDepth = (id: string, visited: Set<string> = new Set()): number => {
      if (depthMap.has(id)) return depthMap.get(id)!;
      if (visited.has(id)) return 0;
      visited.add(id);

      const task = taskMap.get(id);
      if (!task || task.dependsOn.length === 0) {
        depthMap.set(id, 0);
        return 0;
      }

      let maxParentDepth = 0;
      for (const pId of task.dependsOn) {
        maxParentDepth = Math.max(maxParentDepth, getDepth(pId, new Set(visited)) + 1);
      }
      depthMap.set(id, maxParentDepth);
      return maxParentDepth;
    };

    milestones.forEach((m) => getDepth(m.id));

    const s0: MilestoneTask[] = [];
    const s1: MilestoneTask[] = [];
    const s2: MilestoneTask[] = [];
    const s3: MilestoneTask[] = [];

    milestones.forEach((m) => {
      const d = depthMap.get(m.id) || 0;
      if (d === 0) s0.push(m);
      else if (d === 1) s1.push(m);
      else if (d === 2) s2.push(m);
      else s3.push(m);
    });

    return [
      {
        stageNumber: 1,
        title: "STAGE 1: FOUNDATION",
        subtitle: "Venue & Prerequisites",
        tasks: s0
      },
      {
        stageNumber: 2,
        title: "STAGE 2: CORE EXPERIENCE",
        subtitle: "Catering, Decor & AV",
        tasks: s1
      },
      {
        stageNumber: 3,
        title: "STAGE 3: CREW & LOGISTICS",
        subtitle: "Technical & Soundcheck",
        tasks: s2
      },
      {
        stageNumber: 4,
        title: "STAGE 4: EXECUTION",
        subtitle: "Auspicious Handover",
        tasks: s3
      }
    ];
  }, [milestones, taskMap]);

  // Synchronize message body when selected task or template changes
  React.useEffect(() => {
    if (!selectedTask) return;

    const template = buildEditableTemplate(
      selectedTask,
      activeChannel,
      activeTemplateType,
      eventTitle
    );

    setCustomBody(template.body);
    setCustomSubject(template.subject);
  }, [selectedTaskId, activeTemplateType, activeChannel, selectedTask, eventTitle]);

  const handleSelectNode = (taskId: string) => {
    setSelectedTaskId(taskId);
    setActiveDelayImpact(null);
    setDispatchFeedback(null);

    const task = taskMap.get(taskId);
    if (task) {
      logActivityEvent({
        taskId: task.id,
        taskTitle: `Inspected Node: ${task.title}`,
        category: task.category,
        channel: "system",
        vendorName: task.vendorContact?.name || "Deterministic Engine",
        recipient: "Coordinator Ops",
        summary: `Inspected milestone ${task.id.toUpperCase()}: "${task.title}". Status: ${task.status}. Lead time: ${task.leadTimeDays || task.deadlineDaysBeforeEvent}d.`,
        loopStatus: "closed"
      });
    }
  };

  const handleStatusChange = (status: "pending" | "in_progress" | "completed") => {
    if (!selectedTaskId) return;
    if (onUpdateTaskStatus) {
      onUpdateTaskStatus(selectedTaskId, status);
    } else {
      onCycleTaskStatus(selectedTaskId);
    }
  };

  const handleSimulateDelay = (minutes: number) => {
    if (!selectedTaskId) return;
    const impact = computeDelayCascade(milestones, selectedTaskId, minutes);
    setActiveDelayImpact(impact);

    logActivityEvent({
      taskId: selectedTaskId,
      taskTitle: `Simulated +${minutes}m Delay Cascade`,
      category: selectedTask?.category || "logistics",
      channel: "system",
      vendorName: selectedTask?.vendorContact?.name || "Deterministic Engine",
      recipient: "Operations Bridge",
      summary: `Simulated +${minutes}m delay on ${selectedTaskId.toUpperCase()}: ${impact.downstreamAffectedTasks.length} downstream tasks affected. ${impact.criticalMuhuratAtRisk ? "CRITICAL MUHURAT AT RISK." : "Buffer absorbed delay."}`,
      loopStatus: "closed"
    });

    if (onActionTriggered && selectedTask) {
      onActionTriggered(
        `⚡ Simulated +${minutes}m Delay Cascade`,
        impact.riskMessage || `Simulated +${minutes}m delay.`,
        [
          {
            label: "Delay Added",
            before: "0 mins",
            after: `+${minutes} mins`,
            diff: `+${minutes}m`
          },
          {
            label: "Downstream Tasks Impacted",
            before: "0",
            after: `${impact.downstreamAffectedTasks.length}`,
            diff: `${impact.downstreamAffectedTasks.length} tasks`
          },
          {
            label: "Muhurat Schedule",
            before: "On-Track",
            after: impact.criticalMuhuratAtRisk ? "AT RISK (Dinner delayed)" : "Safe (Buffer Absorbed)",
            diff: impact.criticalMuhuratAtRisk ? "Delayed" : "Safe"
          }
        ]
      );
    }
  };

  const handleDispatch = () => {
    if (!selectedTask) return;

    const vendorPhone = selectedTask.vendorContact?.phone || "+919876543210";
    const vendorEmail = resolveThirdPartyVendorEmail(selectedTask.vendorContact);
    const vendorName = selectedTask.vendorContact?.name || "Assigned Partner";

    if (activeChannel === "whatsapp") {
      triggerWhatsAppNotification({
        taskId: selectedTask.id,
        taskTitle: selectedTask.title,
        category: selectedTask.category,
        phone: vendorPhone,
        vendorName,
        message: customBody
      });
      setDispatchFeedback(`Dispatched WhatsApp template to ${vendorName} (${vendorPhone}).`);
    } else {
      triggerEmailNotification({
        taskId: selectedTask.id,
        taskTitle: selectedTask.title,
        category: selectedTask.category,
        to: vendorEmail,
        vendorName,
        subject: customSubject,
        body: customBody
      });
      setDispatchFeedback(`Dispatched RFC 5322 Email template to ${vendorName} (${vendorEmail}).`);
    }

    logActivityEvent({
      taskId: selectedTask.id,
      taskTitle: `Vendor Communication: ${selectedTask.title}`,
      category: selectedTask.category,
      channel: activeChannel,
      vendorName,
      recipient: activeChannel === "whatsapp" ? vendorPhone : vendorEmail,
      summary: `Dispatched ${activeTemplateType} template via ${activeChannel.toUpperCase()} to ${vendorName}: "${customBody.slice(0, 80)}..."`,
      loopStatus: "closed"
    });

    if (onActionTriggered) {
      onActionTriggered(
        `Dispatched Vendor Outreach (${activeChannel.toUpperCase()})`,
        `Negotiation message sent to ${vendorName}. Immutable activity event logged.`,
        [
          {
            label: "Recipient",
            before: "—",
            after: `${vendorName} (${activeChannel === "whatsapp" ? vendorPhone : vendorEmail})`,
            diff: "Contacted"
          },
          {
            label: "Channel",
            before: "Draft",
            after: activeChannel.toUpperCase(),
            diff: "Sent"
          },
          {
            label: "Edge-Case Template",
            before: "—",
            after: activeTemplateType,
            diff: "Active"
          }
        ]
      );
    }
  };

  // Find downstream tasks that depend on a given task
  const getDownstreamTasks = (taskId: string): MilestoneTask[] => {
    return milestones.filter((m) => m.dependsOn.includes(taskId));
  };

  return (
    <section aria-labelledby="visual-flowchart-title" className="utsav-card">
      {/* Header with View Toggle */}
      <div className="utsav-card-header flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 id="visual-flowchart-title" className="utsav-card-title flex items-center gap-2">
            <GitBranch className="w-5 h-5 text-indigo-600" aria-hidden="true" />
            <span>{t.flowchartTitle}</span>
            <span className="text-xs font-normal text-slate-500 font-mono">
              ({t.flowchartKahnDag})
            </span>
          </h2>
        </div>

        <div className="flex items-center gap-2">
          {/* Flowchart vs Table toggle */}
          <div className="bg-slate-100 p-0.5 rounded-lg border border-slate-200 flex items-center">
            <button
              type="button"
              onClick={() => setViewMode("flowchart")}
              className={`text-xs px-2.5 py-1 rounded-md font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                viewMode === "flowchart"
                  ? "bg-white text-slate-900 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Layers className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Flowchart</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode("table")}
              className={`text-xs px-2.5 py-1 rounded-md font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                viewMode === "table"
                  ? "bg-white text-slate-900 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <TableIcon className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Table</span>
            </button>
          </div>

          {bottlenecks.length > 0 && (
            <span className="utsav-badge utsav-badge-timeline font-mono text-[10px]">
              {bottlenecks.length} Bottleneck(s)
            </span>
          )}
        </div>
      </div>

      <p className="text-xs text-slate-600 mb-3 leading-relaxed">
        {t.flowchartSubtitle}
      </p>

      {/* OVERARCHING STAGE PROGRESSION TRACK (VISUAL CONNECTIVITY PIPELINE) */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-2.5 mb-4 overflow-x-auto">
        <div className="flex items-center justify-between min-w-[620px] gap-2">
          {stages.map((stage, idx) => {
            const allCompleted = stage.tasks.length > 0 && stage.tasks.every((t) => t.status === "completed");
            const hasBlocked = stage.tasks.some((t) => bottlenecks.includes(t.id));
            return (
              <React.Fragment key={stage.stageNumber}>
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <span
                    className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                      allCompleted
                        ? "bg-emerald-600 text-white"
                        : hasBlocked
                        ? "bg-red-600 text-white critical-pulse-dot"
                        : "bg-indigo-600 text-white"
                    }`}
                  >
                    {allCompleted ? "✓" : stage.stageNumber}
                  </span>
                  <div className="truncate">
                    <span className="text-[11px] font-bold text-slate-800 block truncate">
                      {stage.title.replace(/^STAGE \d+:\s*/, "")}
                    </span>
                    <span className="text-[9px] text-slate-500 block truncate font-mono">
                      {stage.tasks.length} task(s) · {stage.subtitle}
                    </span>
                  </div>
                </div>
                {idx < stages.length - 1 && (
                  <ChevronRight className="w-4 h-4 text-slate-400 shrink-0 mx-1" aria-hidden="true" />
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* VIEW 1: INTERACTIVE VISUAL FLOWCHART */}
      {viewMode === "flowchart" && (
        <div className="space-y-4">
          {/* Stage-by-Stage Columns */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 relative overflow-x-auto pb-2">
            {stages.map((stage) => (
              <div
                key={stage.stageNumber}
                className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex flex-col gap-2.5 min-w-[220px]"
              >
                {/* Stage Header */}
                <div className="border-b border-slate-200 pb-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-extrabold uppercase text-slate-700 tracking-wider">
                      {stage.title}
                    </span>
                    <span className="text-[10px] font-mono text-slate-400">
                      {stage.tasks.length} task(s)
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-500">{stage.subtitle}</span>
                </div>

                {/* Nodes in this Stage */}
                <div className="flex flex-col gap-2 flex-1">
                  {stage.tasks.length === 0 ? (
                    <div className="text-[11px] text-slate-400 py-3 text-center italic">
                      No milestones in this tier
                    </div>
                  ) : (
                    stage.tasks.map((task) => {
                      const isSelected = selectedTaskId === task.id;
                      const isBottleneck = bottlenecks.includes(task.id);
                      const hasUncompletedPrereq = task.dependsOn.some((pId) => {
                        const parent = taskMap.get(pId);
                        return parent && parent.status !== "completed";
                      });

                      const isCriticalPathAlert =
                        isBottleneck ||
                        hasUncompletedPrereq ||
                        (task.urgency === "critical" && task.status !== "completed") ||
                        ((task.leadTimeDays ?? task.deadlineDaysBeforeEvent) > daysRemaining && task.status !== "completed");

                      const downstream = getDownstreamTasks(task.id);

                      return (
                        <div
                          key={task.id}
                          onClick={() => handleSelectNode(task.id)}
                          role="button"
                          tabIndex={0}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") handleSelectNode(task.id);
                          }}
                          className={`cursor-pointer rounded-xl p-3 border transition-all text-left shadow-xs ${
                            isCriticalPathAlert
                              ? `critical-flash-card ${isSelected ? "ring-2 ring-red-600" : ""}`
                              : isSelected
                              ? "border-indigo-600 bg-white ring-2 ring-indigo-600"
                              : "bg-white border-slate-200 hover:border-slate-300"
                          }`}
                        >
                          <div className="flex items-start justify-between gap-1 mb-1.5">
                            <div className="flex items-center gap-1.5">
                              {isCriticalPathAlert && (
                                <span className="critical-pulse-dot shrink-0" aria-hidden="true" />
                              )}
                              <span className="text-[10px] font-mono font-bold text-slate-500">
                                {task.id.toUpperCase()}
                              </span>
                              <span className="text-[9px] uppercase px-1.5 py-0.2 rounded font-semibold bg-slate-100 text-slate-600">
                                {task.category}
                              </span>
                            </div>

                            <span
                              className={`text-[9px] font-bold px-1.5 py-0.5 rounded font-mono uppercase ${
                                task.status === "completed"
                                  ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                                  : task.status === "in_progress"
                                  ? "bg-amber-100 text-amber-800 border border-amber-200"
                                  : "bg-slate-100 text-slate-700 border border-slate-200"
                              }`}
                            >
                              {task.status.replace("_", " ")}
                            </span>
                          </div>

                          <h3 className="text-xs font-bold text-slate-900 leading-snug mb-1">
                            {task.title}
                          </h3>

                          <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono mt-1">
                            <span>Lead: {task.leadTimeDays || task.deadlineDaysBeforeEvent}d</span>
                            {hasUncompletedPrereq && (
                              <span className="text-red-700 flex items-center gap-0.5 font-sans font-bold">
                                <Lock className="w-2.5 h-2.5" />
                                <span>Blocked</span>
                              </span>
                            )}
                          </div>

                          {/* Explicit Visual Dependency Badges */}
                          <div className="mt-2 pt-1.5 border-t border-slate-100 flex flex-col gap-1 text-[9px] font-mono">
                            {task.dependsOn.length > 0 ? (
                              <div className="flex items-center gap-1 text-slate-600">
                                <span className="text-slate-400">Requires:</span>
                                {task.dependsOn.map((pId) => {
                                  const pTask = taskMap.get(pId);
                                  const isPrereqDone = pTask?.status === "completed";
                                  return (
                                    <span
                                      key={pId}
                                      className={`px-1 rounded font-bold ${
                                        isPrereqDone
                                          ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                          : "bg-red-50 text-red-700 border border-red-300"
                                      }`}
                                    >
                                      {pId.toUpperCase()} {isPrereqDone ? "✓" : "🔒"}
                                    </span>
                                  );
                                })}
                              </div>
                            ) : (
                              <div className="text-slate-400">Root Milestone (No Prereqs)</div>
                            )}

                            {downstream.length > 0 && (
                              <div className="flex items-center gap-1 text-indigo-700">
                                <span className="text-slate-400">Unlocks:</span>
                                {downstream.map((d) => (
                                  <span
                                    key={d.id}
                                    className="bg-indigo-50 text-indigo-700 border border-indigo-200 px-1 rounded font-bold"
                                  >
                                    {d.id.toUpperCase()} →
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            ))}
          </div>



          {/* INTERACTIVE NODE INSPECTION & EXECUTION PANEL */}
          {selectedTask && (
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-3 mb-4">
                <div>
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="text-xs font-mono font-bold bg-slate-200 text-slate-800 px-2 py-0.5 rounded">
                      {selectedTask.id.toUpperCase()}
                    </span>
                    <h3 className="text-sm font-bold text-slate-900">{selectedTask.title}</h3>
                    <span className="text-[11px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-mono">
                      Category: {selectedTask.category}
                    </span>
                  </div>
                  <div className="text-xs text-slate-500 font-mono">
                    Lead Time: <strong>{selectedTask.leadTimeDays || selectedTask.deadlineDaysBeforeEvent} days</strong> ·
                    Vendor: <strong>{selectedTask.vendorContact?.name || "Assigned Partner"}</strong>
                  </div>
                </div>

                {/* Status Toggle Switcher */}
                <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-xl p-1 shadow-xs">
                  <span className="text-[11px] font-semibold text-slate-500 px-2">Status:</span>
                  {(["pending", "in_progress", "completed"] as const).map((st) => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => handleStatusChange(st)}
                      className={`text-xs px-2.5 py-1 rounded-lg font-semibold transition-colors capitalize cursor-pointer ${
                        selectedTask.status === st
                          ? st === "completed"
                            ? "bg-emerald-600 text-white shadow-xs"
                            : st === "in_progress"
                            ? "bg-amber-500 text-white shadow-xs"
                            : "bg-slate-800 text-white shadow-xs"
                          : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-100"
                      }`}
                    >
                      {st.replace("_", " ")}
                    </button>
                  ))}
                </div>
              </div>

              {/* Sub-Panels: Delay Cascade & Vendor Outreach (Clean Roomy Layout) */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Left: Delay Cascade Simulator */}
                <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col justify-between shadow-xs">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-orange-600" aria-hidden="true" />
                        <span>{t.flowchartDelayCascade}</span>
                      </h4>
                      <span className="text-[10px] font-mono text-slate-400">BFS Graph Traversal</span>
                    </div>

                    <p className="text-[11px] text-slate-500 mb-3 leading-relaxed">
                      Simulate ceremony delays on this node to forecast downstream impact on Muhurat rituals and dinner schedules.
                    </p>

                    {/* Delay Buttons with Responsive Grid and No Overflow */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-3">
                      <button
                        type="button"
                        onClick={() => handleSimulateDelay(30)}
                        className="utsav-btn bg-amber-50 hover:bg-amber-100 border border-amber-300 text-amber-900 text-xs px-3 py-2 font-semibold text-center whitespace-normal leading-tight shadow-xs cursor-pointer"
                      >
                        {t.flowchartSimulate30m}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSimulateDelay(60)}
                        className="utsav-btn bg-rose-50 hover:bg-rose-100 border border-rose-300 text-rose-900 text-xs px-3 py-2 font-semibold text-center whitespace-normal leading-tight shadow-xs cursor-pointer"
                      >
                        {t.flowchartSimulate60m}
                      </button>
                    </div>

                    {/* Delay Impact Output */}
                    {activeDelayImpact && (
                      <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs space-y-1.5">
                        <div className="flex items-center justify-between">
                          <strong className="text-amber-900 font-bold">
                            Cascade Results (+{activeDelayImpact.delayMinutes} mins):
                          </strong>
                          {activeDelayImpact.criticalMuhuratAtRisk && (
                            <span className="text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-300 px-1.5 py-0.2 rounded uppercase">
                              Muhurat at Risk
                            </span>
                          )}
                        </div>
                        <p className="text-slate-700 leading-snug">{activeDelayImpact.riskMessage}</p>
                        {activeDelayImpact.downstreamAffectedTasks.length > 0 && (
                          <div className="text-[11px] text-slate-600 mt-1">
                            <strong>Affected Downstream:</strong>{" "}
                            {activeDelayImpact.downstreamAffectedTasks.map((t) => t.title).join(", ")}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Right: Vendor Communication & 4 Editable Templates */}
                <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col justify-between shadow-xs">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                        <Send className="w-3.5 h-3.5 text-emerald-600" aria-hidden="true" />
                        <span>{t.flowchartVendorOutreach}</span>
                      </h4>
                      <div className="flex items-center gap-1 text-[11px]">
                        <button
                          type="button"
                          onClick={() => setActiveChannel("whatsapp")}
                          className={`px-2 py-0.5 rounded font-semibold cursor-pointer ${
                            activeChannel === "whatsapp"
                              ? "bg-emerald-600 text-white"
                              : "text-slate-600 hover:bg-slate-100"
                          }`}
                        >
                          WhatsApp
                        </button>
                        <button
                          type="button"
                          onClick={() => setActiveChannel("email")}
                          className={`px-2 py-0.5 rounded font-semibold cursor-pointer ${
                            activeChannel === "email"
                              ? "bg-blue-600 text-white"
                              : "text-slate-600 hover:bg-slate-100"
                          }`}
                        >
                          Email
                        </button>
                      </div>
                    </div>

                    {/* 4 Template Buttons with Clean Wrapping */}
                    <div className="flex gap-1.5 flex-wrap mb-2.5">
                      {[
                        { id: "standard" as const, label: "Standard Lock" },
                        { id: "delay_30m" as const, label: "+30m Delay" },
                        { id: "budget_surge" as const, label: "+15% Surge Buffer" },
                        { id: "backup_sos" as const, label: "Emergency SOS" }
                      ].map((tmpl) => (
                        <button
                          key={tmpl.id}
                          type="button"
                          onClick={() => setActiveTemplateType(tmpl.id)}
                          className={`text-[10px] px-2 py-1 rounded font-medium transition-colors cursor-pointer ${
                            activeTemplateType === tmpl.id
                              ? "bg-slate-900 text-white font-semibold"
                              : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                          }`}
                        >
                          {tmpl.label}
                        </button>
                      ))}
                    </div>

                    {/* Editable Message Box */}
                    {activeChannel === "email" && (
                      <input
                        type="text"
                        value={customSubject}
                        onChange={(e) => setCustomSubject(e.target.value)}
                        placeholder="Email Subject"
                        className="utsav-input text-xs font-mono mb-1.5 py-1"
                        aria-label="Email Subject"
                      />
                    )}
                    <textarea
                      rows={3}
                      value={customBody}
                      onChange={(e) => setCustomBody(e.target.value)}
                      className="utsav-input text-xs font-mono resize-y mb-2"
                      aria-label="Editable vendor message content"
                    />

                    {dispatchFeedback && (
                      <div className="text-[11px] text-slate-700 bg-slate-50 border border-slate-200 rounded p-1.5 mb-2">
                        {dispatchFeedback}
                      </div>
                    )}
                  </div>

                  {/* Dispatch Action */}
                  <div className="flex justify-end pt-1">
                    <button
                      type="button"
                      onClick={handleDispatch}
                      className={`utsav-btn text-xs px-3.5 py-2 font-semibold text-white shadow-xs flex items-center gap-1.5 cursor-pointer ${
                        activeChannel === "whatsapp" ? "bg-emerald-600 hover:bg-emerald-700" : "bg-blue-600 hover:bg-blue-700"
                      }`}
                    >
                      {activeChannel === "whatsapp" ? (
                        <>
                          <MessageSquare className="w-3.5 h-3.5" aria-hidden="true" />
                          <span>{t.flowchartDispatchWhatsapp}</span>
                        </>
                      ) : (
                        <>
                          <Mail className="w-3.5 h-3.5" aria-hidden="true" />
                          <span>Dispatch via 3rd-Party Email</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* VIEW 2: TABULAR VIEW (KAHN'S ORDER) */}
      {viewMode === "table" && (
        <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200">
                <th className="py-2.5 px-3">Order</th>
                <th className="py-2.5 px-3">Milestone Title</th>
                <th className="py-2.5 px-3">Category</th>
                <th className="py-2.5 px-3">Lead Time</th>
                <th className="py-2.5 px-3">Prerequisites</th>
                <th className="py-2.5 px-3 text-right">Status Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {topologicalOrder.map((id, idx) => {
                const task = taskMap.get(id);
                if (!task) return null;
                const isBottleneck = bottlenecks.includes(task.id);
                const hasUncompletedPrereq = task.dependsOn.some((pId) => {
                  const parent = taskMap.get(pId);
                  return parent && parent.status !== "completed";
                });

                return (
                  <tr
                    key={task.id}
                    className={`hover:bg-slate-50 transition-colors ${
                      isBottleneck ? "bg-amber-50" : ""
                    }`}
                  >
                    <td className="py-2.5 px-3 font-mono font-bold text-slate-500">{idx + 1}</td>
                    <td className="py-2.5 px-3">
                      <div className="font-semibold text-slate-900 flex items-center gap-1.5">
                        {isBottleneck && (
                          <span className="critical-pulse-dot shrink-0" aria-hidden="true" />
                        )}
                        <span>{task.title}</span>
                      </div>
                    </td>
                    <td className="py-2.5 px-3 uppercase text-[10px] font-mono text-slate-600">
                      {task.category}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-slate-600">
                      {task.leadTimeDays || task.deadlineDaysBeforeEvent}d
                    </td>
                    <td className="py-2.5 px-3">
                      {task.dependsOn.length > 0 ? (
                        <span className="text-[11px] font-mono text-slate-600">
                          {task.dependsOn.join(", ")}
                        </span>
                      ) : (
                        <span className="text-[11px] text-slate-400 font-mono">None (Root)</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <button
                        type="button"
                        onClick={() => onCycleTaskStatus(task.id)}
                        className={`utsav-btn text-xs px-2.5 py-1 font-semibold cursor-pointer ${
                          task.status === "completed"
                            ? "utsav-badge-ontrack border-emerald-300"
                            : task.status === "in_progress"
                            ? "utsav-badge-timeline border-amber-300"
                            : "bg-slate-100 text-slate-700 border-slate-300"
                        }`}
                      >
                        {task.status === "completed" && <CheckCircle className="w-3 h-3" />}
                        {task.status === "pending" && hasUncompletedPrereq && (
                          <Lock className="w-3 h-3 text-red-600" />
                        )}
                        <span className="capitalize">{task.status.replace("_", " ")}</span>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
};

export default VisualDependencyFlowchart;
