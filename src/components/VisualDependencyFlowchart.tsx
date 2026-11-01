import React, { useState, useMemo } from "react";
import {
  GitBranch,
  Lock,
  Unlock,
  CheckCircle,
  AlertTriangle,
  Clock,
  ArrowRight,
  Send,
  MessageSquare,
  Mail,
  Table as TableIcon,
  Layers,
  Sparkles
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

interface VisualDependencyFlowchartProps {
  milestones: MilestoneTask[];
  topologicalOrder: string[];
  bottlenecks: string[];
  daysRemaining: number;
  eventTitle: string;
  onCycleTaskStatus: (taskId: string) => void;
  onUpdateTaskStatus?: (taskId: string, status: "pending" | "in_progress" | "completed") => void;
  onActionTriggered?: (actionName: string, details: string, deltas?: any[]) => void;
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
  onActionTriggered
}) => {
  const [viewMode, setViewMode] = useState<"flowchart" | "table">("flowchart");
  const [selectedTaskId, setSelectedTaskId] = useState<string>(
    bottlenecks[0] || topologicalOrder[0] || (milestones[0]?.id ?? "")
  );

  // Vendor outreach interactive state
  const [activeTemplateType, setActiveTemplateType] = useState<EdgeCaseTemplateType>("standard");
  const [activeChannel, setActiveChannel] = useState<"whatsapp" | "email">("whatsapp");
  const [customSubject, setCustomSubject] = useState<string>("");
  const [customBody, setCustomBody] = useState<string>("");
  const [activeDelayImpact, setActiveDelayImpact] = useState<DelayImpactSummary | null>(null);
  const [dispatchFeedback, setDispatchFeedback] = useState<string | null>(null);

  const taskMap = useMemo(() => {
    return new Map<string, MilestoneTask>(milestones.map((m) => [m.id, m]));
  }, [milestones]);

  const selectedTask = taskMap.get(selectedTaskId) || milestones[0];

  // Group milestones into 4 topological stages
  const stages: StageColumn[] = useMemo(() => {
    const depthMap = new Map<string, number>();

    // Calculate topological depth for each task in ordered sequence
    for (const id of topologicalOrder) {
      const task = taskMap.get(id);
      if (!task) continue;

      if (!task.dependsOn || task.dependsOn.length === 0) {
        depthMap.set(id, 0);
      } else {
        let maxParentDepth = 0;
        for (const pId of task.dependsOn) {
          const pDepth = depthMap.get(pId) ?? 0;
          if (pDepth > maxParentDepth) maxParentDepth = pDepth;
        }
        depthMap.set(id, maxParentDepth + 1);
      }
    }

    const s1Tasks: MilestoneTask[] = [];
    const s2Tasks: MilestoneTask[] = [];
    const s3Tasks: MilestoneTask[] = [];
    const s4Tasks: MilestoneTask[] = [];

    for (const id of topologicalOrder) {
      const task = taskMap.get(id);
      if (!task) continue;
      const depth = depthMap.get(id) ?? 0;

      if (depth === 0) {
        s1Tasks.push(task);
      } else if (depth === 1) {
        s2Tasks.push(task);
      } else if (depth === 2) {
        s3Tasks.push(task);
      } else {
        s4Tasks.push(task);
      }
    }

    return [
      {
        stageNumber: 1,
        title: "Stage 1: Foundation",
        subtitle: "Venue & Prerequisites",
        tasks: s1Tasks
      },
      {
        stageNumber: 2,
        title: "Stage 2: Core Experience",
        subtitle: "Catering, Decor & AV",
        tasks: s2Tasks
      },
      {
        stageNumber: 3,
        title: "Stage 3: Crew & Logistics",
        subtitle: "Technical & Soundcheck",
        tasks: s3Tasks
      },
      {
        stageNumber: 4,
        title: "Stage 4: Execution",
        subtitle: "Auspicious Handover",
        tasks: s4Tasks
      }
    ];
  }, [milestones, topologicalOrder, taskMap]);

  // Sync editable template when selected task or template type changes
  React.useEffect(() => {
    if (selectedTask) {
      const tpl = buildEditableTemplate(selectedTask, activeChannel, activeTemplateType, eventTitle);
      setCustomSubject(tpl.subject);
      setCustomBody(tpl.body);
      setDispatchFeedback(null);
    }
  }, [selectedTaskId, activeChannel, activeTemplateType, eventTitle]);

  const handleSelectNode = (taskId: string) => {
    setSelectedTaskId(taskId);
    setActiveDelayImpact(null);
    setDispatchFeedback(null);
  };

  const handleStatusChange = (status: "pending" | "in_progress" | "completed") => {
    if (!selectedTask) return;
    if (onUpdateTaskStatus) {
      onUpdateTaskStatus(selectedTask.id, status);
    } else {
      onCycleTaskStatus(selectedTask.id);
    }

    if (onActionTriggered) {
      onActionTriggered(
        `Updated Task Status: ${selectedTask.title}`,
        `Changed status from '${selectedTask.status}' to '${status}'. Any dependent downstream tasks are dynamically evaluated.`,
        [
          {
            label: `Task (${selectedTask.id})`,
            before: selectedTask.status,
            after: status,
            diff: status === "completed" ? "Unlocked Downstream" : "In Progress"
          }
        ]
      );
    }
  };

  const handleSimulateDelay = (minutes: number) => {
    if (!selectedTask) return;
    const impact = computeDelayCascade(milestones, selectedTask.id, minutes);
    setActiveDelayImpact(impact);

    logActivityEvent({
      taskId: selectedTask.id,
      taskTitle: selectedTask.title,
      category: selectedTask.category,
      channel: "system",
      vendorName: selectedTask.vendorContact?.name || "Deterministic Engine",
      recipient: "Coordinator Ops",
      summary: `Simulated +${minutes}m delay cascade on '${selectedTask.title}'. Impacted ${impact.downstreamAffectedTasks.length} downstream milestones.`,
      loopStatus: "closed"
    });

    if (onActionTriggered) {
      onActionTriggered(
        `Delay Cascade (+${minutes}m): ${selectedTask.title}`,
        impact.riskMessage ||
          `Computed downstream impact across Kahn's DAG: ${impact.downstreamAffectedTasks.length} tasks shifted by +${minutes} minutes.`,
        [
          {
            label: "Delay Applied",
            before: "0 mins",
            after: `+${minutes} mins`,
            diff: `+${minutes}m`
          },
          {
            label: "Downstream Tasks Impacted",
            before: "0",
            after: `${impact.downstreamAffectedTasks.length}`,
            diff: `${impact.downstreamAffectedTasks.length} affected`
          },
          {
            label: "Muhurat Timing Risk",
            before: "Safe",
            after: impact.criticalMuhuratAtRisk ? "HIGH RISK" : "Normal",
            isImprovement: !impact.criticalMuhuratAtRisk
          }
        ]
      );
    }
  };

  const handleDispatch = () => {
    if (!selectedTask) return;

    if (activeChannel === "whatsapp") {
      const phone = selectedTask.vendorContact?.phone || "+91 98101 23456";
      const result = triggerWhatsAppNotification({
        taskId: selectedTask.id,
        taskTitle: selectedTask.title,
        category: selectedTask.category,
        phone,
        vendorName: selectedTask.vendorContact?.name || "Vendor Partner",
        message: customBody,
        edgeCaseType: activeTemplateType
      });

      setDispatchFeedback(`✓ WhatsApp dispatched to ${result.vendorName} (${phone}). Added to Activity History Log with 'awaiting_call' loop status.`);
      if (result.actionUrl) {
        window.open(result.actionUrl, "_blank", "noopener,noreferrer");
      }
    } else {
      const vendorEmail = resolveThirdPartyVendorEmail(selectedTask.vendorContact, selectedTask.category);
      const isThirdParty = selectedTask.vendorContact?.role !== "Family Host" && selectedTask.vendorContact?.role !== "Managing Lead";

      const result = triggerEmailNotification({
        taskId: selectedTask.id,
        taskTitle: selectedTask.title,
        category: selectedTask.category,
        to: vendorEmail,
        vendorName: selectedTask.vendorContact?.name || "3rd-Party Partner",
        subject: customSubject,
        body: customBody,
        isThirdParty,
        edgeCaseType: activeTemplateType
      });

      if (!result.ok) {
        setDispatchFeedback(`⚠️ Disallowed: ${result.reason}`);
      } else {
        setDispatchFeedback(`✓ 3rd-party vendor email dispatched to ${result.recipient}. Logged in Activity History with 'awaiting_call' loop status.`);
        if (result.actionUrl) {
          window.open(result.actionUrl, "_blank");
        }
      }
    }

    if (onActionTriggered) {
      onActionTriggered(
        `Dispatched Vendor Outreach (${activeChannel.toUpperCase()}): ${selectedTask.title}`,
        `Transmitted '${activeTemplateType}' template to ${selectedTask.vendorContact?.name || "Vendor"}. Open loop awaiting confirmation call.`,
        [
          {
            label: "Communication Channel",
            before: "None",
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

  return (
    <section aria-labelledby="visual-flowchart-title" className="utsav-card">
      {/* Header with View Toggle */}
      <div className="utsav-card-header flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 id="visual-flowchart-title" className="utsav-card-title flex items-center gap-2">
            <GitBranch className="w-5 h-5 text-indigo-600" aria-hidden="true" />
            <span>Interactive Visual Dependency Flowchart</span>
            <span className="text-xs font-normal text-slate-500 font-mono">
              (Kahn&apos;s DAG Topological Stages)
            </span>
          </h2>
        </div>

        <div className="flex items-center gap-2">
          {/* Flowchart vs Table toggle */}
          <div className="bg-slate-100 p-0.5 rounded-lg border border-slate-200 flex items-center">
            <button
              type="button"
              onClick={() => setViewMode("flowchart")}
              className={`text-xs px-2.5 py-1 rounded-md font-semibold flex items-center gap-1.5 transition-colors ${
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
              className={`text-xs px-2.5 py-1 rounded-md font-semibold flex items-center gap-1.5 transition-colors ${
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

      <p className="text-xs text-slate-600 mb-4 leading-relaxed">
        Click any node to inspect prerequisite locks, trigger a <strong>+30m Delay Cascade</strong>, or dispatch vendor notifications via WhatsApp/Email. Blocked critical-path tasks pulse in flashing red.
      </p>

      {/* VIEW 1: INTERACTIVE VISUAL FLOWCHART */}
      {viewMode === "flowchart" && (
        <div className="space-y-4">
          {/* Stage-by-Stage Columns */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 relative overflow-x-auto pb-2">
            {stages.map((stage) => (
              <div
                key={stage.stageNumber}
                className="bg-slate-50/70 border border-slate-200 rounded-xl p-3 flex flex-col gap-2.5 min-w-[220px]"
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
                <div className="flex flex-col gap-2">
                  {stage.tasks.length === 0 ? (
                    <div className="text-[11px] text-slate-400 py-3 text-center italic">
                      No milestones in this tier
                    </div>
                  ) : (
                    stage.tasks.map((task) => {
                      const isSelected = selectedTaskId === task.id;
                      const isBottleneck = bottlenecks.includes(task.id);
                      const isCriticalPathAlert =
                        (isBottleneck ||
                          (task.urgency === "critical" && task.status !== "completed") ||
                          ((task.leadTimeDays ?? task.deadlineDaysBeforeEvent) > daysRemaining && task.status !== "completed"));

                      const hasUncompletedPrereq = task.dependsOn.some((pId) => {
                        const parent = taskMap.get(pId);
                        return parent && parent.status !== "completed";
                      });

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
                            isSelected
                              ? "border-indigo-600 bg-white ring-2 ring-indigo-500/20"
                              : isCriticalPathAlert
                              ? "critical-flash-card"
                              : "bg-white border-slate-200 hover:border-slate-300"
                          }`}
                        >
                          <div className="flex items-start justify-between gap-1 mb-1.5">
                            <div className="flex items-center gap-1.5">
                              {isCriticalPathAlert && (
                                <span className="critical-pulse-dot shrink-0" aria-hidden="true" />
                              )}
                              <span className="text-[10px] font-mono font-bold text-slate-400">
                                {task.id.toUpperCase()}
                              </span>
                              <span className="text-[9px] uppercase px-1.5 py-0.2 rounded font-semibold bg-slate-100 text-slate-600">
                                {task.category}
                              </span>
                            </div>

                            <span
                              className={`text-[9px] font-bold px-1.5 py-0.5 rounded font-mono uppercase ${
                                task.status === "completed"
                                  ? "bg-emerald-100 text-emerald-800"
                                  : task.status === "in_progress"
                                  ? "bg-amber-100 text-amber-800"
                                  : "bg-slate-100 text-slate-700"
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
                              <span className="text-amber-700 flex items-center gap-0.5 font-sans font-medium">
                                <Lock className="w-2.5 h-2.5" />
                                <span>Prereq</span>
                              </span>
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

          {/* SVG Arrow Connectors Hint */}
          <div className="flex items-center justify-center gap-4 text-[11px] font-mono text-slate-500 py-1 border-y border-slate-100">
            <span className="flex items-center gap-1">
              <span className="w-6 h-0.5 bg-slate-400 inline-block" />
              <span>Normal Topological Flow</span>
            </span>
            <span className="flex items-center gap-1 text-rose-600 font-semibold">
              <span className="w-6 h-0.5 border-t-2 border-dashed border-rose-600 inline-block" />
              <span>Critical Blocked Path</span>
            </span>
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
                  <div className="text-xs text-slate-500 flex items-center gap-3">
                    <span>
                      Lead Time: <strong>{selectedTask.leadTimeDays || selectedTask.deadlineDaysBeforeEvent} days</strong>
                    </span>
                    <span>
                      Vendor: <strong>{selectedTask.vendorContact?.name || "Assigned Partner"}</strong> (
                      {selectedTask.vendorContact?.role || "Vendor Lead"})
                    </span>
                  </div>
                </div>

                {/* Status Toggle Actions */}
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="text-xs text-slate-500 mr-1 font-medium">Status:</span>
                  {(["pending", "in_progress", "completed"] as const).map((st) => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => handleStatusChange(st)}
                      className={`text-xs px-2.5 py-1 rounded-lg font-semibold transition-colors capitalize ${
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

              {/* Sub-Panels: Delay Cascade & Vendor Outreach */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Left: Delay Cascade Simulator */}
                <div className="bg-white border border-slate-200 rounded-xl p-3.5 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-orange-600" aria-hidden="true" />
                        <span>Downstream Delay Cascade Simulator</span>
                      </h4>
                      <span className="text-[10px] font-mono text-slate-400">BFS Graph Traversal</span>
                    </div>

                    <p className="text-[11px] text-slate-500 mb-3 leading-relaxed">
                      Simulate ceremony delays on this node to forecast downstream impact on Muhurat rituals and dinner schedules.
                    </p>

                    <div className="flex items-center gap-2 mb-3">
                      <button
                        type="button"
                        onClick={() => handleSimulateDelay(30)}
                        className="utsav-btn bg-amber-50 hover:bg-amber-100 border border-amber-300 text-amber-900 text-xs px-3 py-1.5 font-semibold"
                      >
                        ⚡ Simulate +30m Delay Cascade
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSimulateDelay(60)}
                        className="utsav-btn bg-rose-50 hover:bg-rose-100 border border-rose-300 text-rose-900 text-xs px-3 py-1.5 font-semibold"
                      >
                        ⚡ Simulate +60m Delay Cascade
                      </button>
                    </div>

                    {/* Delay Impact Output */}
                    {activeDelayImpact && (
                      <div className="bg-amber-50/50 border border-amber-200 rounded-lg p-3 text-xs space-y-1.5">
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
                <div className="bg-white border border-slate-200 rounded-xl p-3.5 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                        <Send className="w-3.5 h-3.5 text-emerald-600" aria-hidden="true" />
                        <span>Vendor Outreach &amp; Edge-Case Templates</span>
                      </h4>
                      <div className="flex items-center gap-1 text-[11px]">
                        <button
                          type="button"
                          onClick={() => setActiveChannel("whatsapp")}
                          className={`px-2 py-0.5 rounded font-semibold ${
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
                          className={`px-2 py-0.5 rounded font-semibold ${
                            activeChannel === "email"
                              ? "bg-blue-600 text-white"
                              : "text-slate-600 hover:bg-slate-100"
                          }`}
                        >
                          Email
                        </button>
                      </div>
                    </div>

                    {/* 4 Template Buttons */}
                    <div className="flex gap-1 flex-wrap mb-2.5">
                      {[
                        { id: "standard" as const, label: "Standard Lock" },
                        { id: "delay_30m" as const, label: "+30m Delay" },
                        { id: "budget_surge" as const, label: "+15% Surge Buffer" },
                        { id: "backup_sos" as const, label: "Emergency SOS" }
                      ].map((t) => (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => setActiveTemplateType(t.id)}
                          className={`text-[10px] px-2 py-1 rounded font-medium transition-colors ${
                            activeTemplateType === t.id
                              ? "bg-slate-900 text-white font-semibold"
                              : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                          }`}
                        >
                          {t.label}
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
                      className={`utsav-btn text-xs px-3.5 py-1.5 font-semibold text-white shadow-xs flex items-center gap-1.5 ${
                        activeChannel === "whatsapp" ? "bg-emerald-600 hover:bg-emerald-700" : "bg-blue-600 hover:bg-blue-700"
                      }`}
                    >
                      {activeChannel === "whatsapp" ? (
                        <>
                          <MessageSquare className="w-3.5 h-3.5" aria-hidden="true" />
                          <span>Dispatch via WhatsApp</span>
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
                      isBottleneck ? "bg-amber-50/40" : ""
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
                        className={`utsav-btn text-xs px-2.5 py-1 font-semibold ${
                          task.status === "completed"
                            ? "utsav-badge-ontrack border-emerald-300"
                            : task.status === "in_progress"
                            ? "utsav-badge-timeline border-amber-300"
                            : "bg-slate-100 text-slate-700 border-slate-300"
                        }`}
                      >
                        {task.status === "completed" && <CheckCircle className="w-3 h-3" />}
                        {task.status === "pending" && hasUncompletedPrereq && (
                          <Lock className="w-3 h-3 text-amber-600" />
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
